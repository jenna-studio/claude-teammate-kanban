#!/usr/bin/env python3
"""
agent-keeper.py
---------------
Keeps the Agent Track Dashboard ALWAYS alive while you code with an AI agent.

Problems this solves:
  - Agent shows as "offline/idle" even when Claude is actively coding
  - Tasks don't sync automatically — you have to manually ask Claude to update
  - Dashboard goes stale between MCP tool calls

How it works:
  1. Starts and auto-restarts the api-server + dashboard (keeps infrastructure up)
  2. Discovers the Claude MCP agent that was registered when Claude Code started
  3. Sends heartbeats for that agent every 15s so it NEVER goes offline
  4. Watches git changes every 8s and auto-creates/updates tasks with diffs
  5. When a new commit lands, completes the old task and opens a new one
  6. Also keeps its own "monitor" agent alive as fallback

Usage:
    # Monitor current directory (most common — run from your project folder)
    python /path/to/agent-track-dashboard/scripts/agent-keeper.py

    # Monitor a specific project
    python /path/to/agent-track-dashboard/scripts/agent-keeper.py /path/to/project

    # If api-server + dashboard are already running
    python /path/to/agent-track-dashboard/scripts/agent-keeper.py --no-api --no-dashboard
"""

import subprocess
import threading
import time
import sys
import signal
import uuid
import json
import argparse
from pathlib import Path
from datetime import datetime
import urllib.request
import urllib.error
import urllib.parse

# ── paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR      = Path(__file__).parent.resolve()
DASHBOARD_ROOT  = SCRIPT_DIR.parent
API_SERVER_DIST = DASHBOARD_ROOT / "packages" / "api-server" / "dist" / "index.js"
DASHBOARD_PKG   = DASHBOARD_ROOT / "packages" / "dashboard"

API_URL        = "http://localhost:3000"
POLL_SEC       = 8    # how often to check for git changes
HEARTBEAT_SEC  = 15   # how often to send heartbeats (must be < 5 min to stay "active")
IDLE_CLOSE_SEC = 180  # close task after this many seconds of no changes


# ── stdlib HTTP helpers ────────────────────────────────────────────────────────

def _http(method: str, url: str, body=None, timeout=5):
    data    = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    req     = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode())
        except Exception:
            return {}
    except Exception:
        return {}


def GET(path, params=None):
    url = f"{API_URL}{path}"
    if params:
        url += "?" + "&".join(f"{k}={urllib.parse.quote(str(v))}"
                               for k, v in params.items() if v is not None)
    return _http("GET", url)


def POST(path, body):
    return _http("POST", f"{API_URL}{path}", body)


def PATCH(path, body):
    return _http("PATCH", f"{API_URL}{path}", body)


def api_ready():
    try:
        r = GET("/health")
        return bool(r)
    except Exception:
        return False


# ── git helpers ───────────────────────────────────────────────────────────────

def _git(args, cwd, timeout=12):
    try:
        r = subprocess.run(["git"] + args, cwd=str(cwd),
                           capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip()
    except Exception:
        return ""


def git_head(cwd):           return _git(["rev-parse", "HEAD"], cwd) or None
def git_branch(cwd):         return _git(["rev-parse", "--abbrev-ref", "HEAD"], cwd)
def git_status_short(cwd):   return _git(["status", "--short"], cwd)
def git_log_oneline(cwd, n=5): return _git(["log", "--oneline", f"-{n}"], cwd)


def git_changed_files(cwd):
    """Uncommitted changes (staged + unstaged + untracked)."""
    files = []
    type_map = {"M": "modified", "A": "added", "D": "deleted", "R": "renamed", "C": "copied"}

    # staged + unstaged vs HEAD
    out = _git(["diff", "--name-status", "HEAD"], cwd)
    for line in out.splitlines():
        parts = line.split("\t")
        if len(parts) >= 2:
            files.append({"filePath": parts[-1],
                          "changeType": type_map.get(parts[0][0], "modified")})

    # untracked new files
    for f in _git(["ls-files", "--others", "--exclude-standard"], cwd).splitlines():
        if f:
            files.append({"filePath": f, "changeType": "added"})

    return files


def git_numstat(cwd):
    added = removed = 0
    for line in _git(["diff", "HEAD", "--numstat"], cwd).splitlines():
        parts = line.split("\t")
        if len(parts) >= 2:
            try:
                added   += int(parts[0]) if parts[0] != "-" else 0
                removed += int(parts[1]) if parts[1] != "-" else 0
            except ValueError:
                pass
    return {"added": added, "removed": removed}


def git_file_diff(path, cwd):
    return _git(["diff", "HEAD", "--", path], cwd, timeout=20)


def _task_title_from_files(changed):
    paths = [f["filePath"] for f in changed]
    if not paths:
        return "Working on project"
    if len(paths) == 1:
        return f"Editing {paths[0]}"
    names  = [Path(p).name for p in paths[:3]]
    suffix = f" (+{len(paths)-3} more)" if len(paths) > 3 else ""
    return f"Editing {', '.join(names)}{suffix}"


# ── keeper ────────────────────────────────────────────────────────────────────

class AgentKeeper:

    def __init__(self, project_path: Path, start_api=True, start_dashboard=True):
        self.project    = project_path.resolve()
        self.start_api  = start_api
        self.start_dash = start_dashboard
        self.running    = True

        self.api_proc   = None
        self.dash_proc  = None

        # Our own monitor agent (always present)
        self.monitor_id = f"keeper-{uuid.uuid4().hex[:8]}"

        # The real Claude / MCP agent we discover at runtime
        self.mcp_agent_id   = None  # set once we find it
        self.mcp_agent_name = None

        self.board_id       = None
        self.current_task   = None   # {"id": ..., "title": ...}
        self.last_hash      = None
        self.last_change_ts = 0.0

        self._beat_ts_monitor  = 0.0
        self._beat_ts_mcp      = 0.0

    # ── infrastructure management ─────────────────────────────────────────────

    def _run_api_server(self):
        while self.running:
            if not API_SERVER_DIST.exists():
                print(f"[keeper] api-server dist missing — run: pnpm build:api  (from {DASHBOARD_ROOT})")
                time.sleep(20)
                continue
            print("[keeper] Starting api-server…")
            self.api_proc = subprocess.Popen(
                ["node", str(API_SERVER_DIST)],
                cwd=str(DASHBOARD_ROOT),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            self.api_proc.wait()
            if self.running:
                print("[keeper] api-server crashed — restarting in 3s…")
                time.sleep(3)

    def _run_dashboard(self):
        while self.running:
            if not DASHBOARD_PKG.exists():
                time.sleep(10)
                continue
            print("[keeper] Starting dashboard…")
            self.dash_proc = subprocess.Popen(
                ["pnpm", "dev"],
                cwd=str(DASHBOARD_PKG),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            self.dash_proc.wait()
            if self.running:
                print("[keeper] dashboard crashed — restarting in 3s…")
                time.sleep(3)

    def _wait_for_api(self, max_s=60):
        print("[keeper] Waiting for API server", end="", flush=True)
        for _ in range(max_s):
            if api_ready():
                print(" ready!", flush=True)
                return True
            print(".", end="", flush=True)
            time.sleep(1)
        print(" TIMEOUT", flush=True)
        return False

    # ── board setup ───────────────────────────────────────────────────────────

    def _setup_board(self):
        project_str = str(self.project)
        resp = GET("/api/boards")
        for board in (resp.get("data") or []):
            if board.get("projectPath") == project_str:
                self.board_id = board["id"]
                print(f"[keeper] Board found  : {board.get('name')} ({self.board_id})")
                return

        log  = git_log_oneline(self.project, 3)
        resp = POST("/api/boards", {
            "name":        self.project.name,
            "description": f"Auto-created by agent-keeper\n\nRecent commits:\n{log}",
            "projectPath": project_str,
        })
        self.board_id = (resp.get("data") or {}).get("id")
        print(f"[keeper] Board created: {self.project.name} ({self.board_id})")

    # ── agent management ──────────────────────────────────────────────────────

    def _register_monitor_agent(self):
        POST("/api/agents", {
            "id":           self.monitor_id,
            "name":         "Agent Keeper (monitor)",
            "type":         "monitor",
            "status":       "active",
            "capabilities": ["monitoring", "git_tracking", "heartbeat"],
            "lastHeartbeat": int(time.time() * 1000),
        })

    def _discover_mcp_agent(self):
        """
        Find the most recently active Claude/AI agent that was registered
        by the MCP server (not our own monitor agent).
        """
        resp = GET("/api/agents")
        agents = resp.get("data") or []
        # Filter to non-monitor agents, sort by lastHeartbeat desc
        candidates = [
            a for a in agents
            if a.get("id") != self.monitor_id
            and a.get("type") not in ("monitor",)
        ]
        if not candidates:
            return None
        # pick most recently active
        candidates.sort(key=lambda a: a.get("lastHeartbeat") or 0, reverse=True)
        agent = candidates[0]
        return agent

    def _beat_monitor(self):
        now = time.time()
        if now - self._beat_ts_monitor < HEARTBEAT_SEC:
            return
        self._beat_ts_monitor = now
        PATCH(f"/api/agents/{self.monitor_id}", {
            "status":        "active",
            "lastHeartbeat": int(now * 1000),
        })

    def _beat_mcp_agent(self):
        """Refresh heartbeat on the REAL Claude MCP agent so it never goes offline."""
        now = time.time()
        if now - self._beat_ts_mcp < HEARTBEAT_SEC:
            return
        self._beat_ts_mcp = now

        # Re-discover in case Claude restarted and registered a new agent ID
        agent = self._discover_mcp_agent()
        if not agent:
            return

        aid = agent["id"]
        if aid != self.mcp_agent_id:
            self.mcp_agent_id   = aid
            self.mcp_agent_name = agent.get("name", aid)
            print(f"[keeper] Tracking MCP agent: {self.mcp_agent_name} ({aid})")

        PATCH(f"/api/agents/{aid}", {
            "status":        "active",
            "lastHeartbeat": int(now * 1000),
        })
        self._notify("agent_heartbeat", {"agentId": aid})

    # ── notify WebSocket ──────────────────────────────────────────────────────

    def _notify(self, event, data=None):
        POST("/api/notify", {
            "event":   event,
            "boardId": self.board_id,
            "data":    data or {},
        })

    # ── task helpers ──────────────────────────────────────────────────────────

    def _agent_id_for_task(self):
        """Prefer the real MCP agent; fall back to monitor."""
        return self.mcp_agent_id or self.monitor_id

    def _agent_name_for_task(self):
        return self.mcp_agent_name or "Agent Keeper"

    def _create_task(self, title, description="", status="in_progress"):
        if not self.board_id:
            return None
        resp = POST("/api/tasks", {
            "boardId":     self.board_id,
            "title":       title,
            "description": description,
            "agentId":     self._agent_id_for_task(),
            "agentName":   self._agent_name_for_task(),
            "agentType":   "claude",
            "status":      status,
            "importance":  "high",
            "progress":    0,
        })
        task = resp.get("data") or {}
        if task.get("id"):
            self._notify("task_created", {"taskId": task["id"]})
            print(f"[keeper] Task created : {task['id']} — {title}")
        return task

    def _complete_current_task(self, summary=""):
        if not self.current_task:
            return
        tid = self.current_task["id"]
        PATCH(f"/api/tasks/{tid}", {
            "status":        "done",
            "progress":      100,
            "currentAction": summary or "Completed",
        })
        self._notify("task_updated", {"taskId": tid})
        print(f"[keeper] Task done    : {tid}  ({summary})")
        self.current_task = None

    def _resume_existing_task(self):
        """On startup, pick up any already-in-progress task for this board."""
        if not self.board_id:
            return
        aid = self._agent_id_for_task()
        resp = GET("/api/tasks", {"boardId": self.board_id, "agentId": aid, "status": "in_progress"})
        tasks = resp.get("data") or []
        if tasks:
            t = tasks[0]
            self.current_task = {"id": t["id"], "title": t.get("title", "")}
            print(f"[keeper] Resumed task : {t['id']} — {t.get('title')}")

    def _ensure_task(self, title, description=""):
        if self.current_task:
            return self.current_task
        task = self._create_task(title, description)
        if task and task.get("id"):
            self.current_task = {"id": task["id"], "title": title}
        return self.current_task

    # ── git sync ──────────────────────────────────────────────────────────────

    def _sync_changes(self):
        changed  = git_changed_files(self.project)
        cur_hash = git_head(self.project)

        self.last_hash = cur_hash

        if not changed:
            return

        title  = _task_title_from_files(changed)
        branch = git_branch(self.project)
        desc   = (
            f"Branch: `{branch}`\n"
            f"Files changed: {len(changed)}\n\n"
            + "\n".join(f"- `{f['filePath']}` ({f['changeType']})" for f in changed[:15])
        )
        task = self._ensure_task(title, desc)
        if not task:
            return

        tid   = task["id"]
        paths = [f["filePath"] for f in changed]
        lines = git_numstat(self.project)
        total = lines["added"] + lines["removed"]
        prog  = min(10 + total // 4, 85)

        # Update task metadata
        PATCH(f"/api/tasks/{tid}", {
            "title":         title,
            "files":         paths,
            "linesChanged":  lines,
            "currentAction": f"Modifying {len(changed)} file(s): "
                             + ", ".join(Path(p).name for p in paths[:4]),
            "progress":      prog,
        })

        # Push per-file diffs (cap at 8 files)
        for fi in changed[:8]:
            diff = git_file_diff(fi["filePath"], self.project)
            if not diff:
                continue
            POST(f"/api/tasks/{tid}/code-changes", {
                "filePath":     fi["filePath"],
                "changeType":   fi["changeType"],
                "diff":         diff,
                "linesAdded":   lines["added"],
                "linesRemoved": lines["removed"],
            })

        self._notify("task_updated", {"taskId": tid})
        print(f"[keeper] Synced {len(changed):2d} file(s) +{lines['added']}/-{lines['removed']} lines  →  {tid}")

    # ── main loop ─────────────────────────────────────────────────────────────

    def _watch_loop(self):
        print(f"[keeper] Polling every {POLL_SEC}s — heartbeat every {HEARTBEAT_SEC}s")
        print(f"[keeper] Dashboard: http://localhost:5173/board/{self.board_id}\n")
        while self.running:
            try:
                # Always beat our own monitor agent
                self._beat_monitor()
                # Always refresh the real MCP agent's heartbeat
                self._beat_mcp_agent()
                # Sync git changes
                self._sync_changes()
            except Exception as e:
                print(f"[keeper] Loop error: {e}")
            time.sleep(POLL_SEC)

    # ── startup ───────────────────────────────────────────────────────────────

    def start(self):
        print("=" * 60)
        print("  Agent Track Keeper")
        print(f"  project : {self.project}")
        print(f"  monitor : {self.monitor_id}")
        print("=" * 60)

        if self.start_api:
            threading.Thread(target=self._run_api_server, daemon=True,
                             name="api-server").start()
        if self.start_dash:
            threading.Thread(target=self._run_dashboard, daemon=True,
                             name="dashboard").start()

        if not self._wait_for_api(max_s=90):
            if not self.start_api:
                print("[keeper] API not reachable and --no-api was set. Exiting.")
                sys.exit(1)
            # Keep waiting — api server might still be building

        self._setup_board()
        self._register_monitor_agent()

        # Discover any MCP agent that's already running
        agent = self._discover_mcp_agent()
        if agent:
            self.mcp_agent_id   = agent["id"]
            self.mcp_agent_name = agent.get("name", agent["id"])
            print(f"[keeper] MCP agent   : {self.mcp_agent_name} ({self.mcp_agent_id})")
        else:
            print("[keeper] No MCP agent found yet — will discover once Claude starts")

        self._resume_existing_task()
        self._watch_loop()

    def stop(self):
        self.running = False
        if self.api_proc:
            self.api_proc.terminate()
        if self.dash_proc:
            self.dash_proc.terminate()
        print("[keeper] Stopped.")


# ── CLI ────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Keep Agent Track Dashboard running and auto-sync AI activity"
    )
    parser.add_argument("project", nargs="?",
                        help="Project path to monitor (default: cwd)")
    parser.add_argument("--no-api", action="store_true",
                        help="Don't start api-server (assumes it's already up)")
    parser.add_argument("--no-dashboard", action="store_true",
                        help="Don't start the dashboard dev server")
    args = parser.parse_args()

    project = Path(args.project).resolve() if args.project else Path.cwd()
    if not project.exists():
        print(f"[keeper] ERROR: path not found: {project}")
        sys.exit(1)

    keeper = AgentKeeper(project,
                         start_api=not args.no_api,
                         start_dashboard=not args.no_dashboard)

    def _sig(sig, _):
        keeper.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT,  _sig)
    signal.signal(signal.SIGTERM, _sig)
    keeper.start()


if __name__ == "__main__":
    main()
