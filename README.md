# Agent Track Dashboard

**Real-time AI Agent Activity Tracking Dashboard**

A monitoring system for AI coding agents, visualized as an interactive kanban board. See what your agent is doing right now — tasks, code diffs, file changes, and progress — all synced automatically.

![](./agent-track-dashboard-thumbnail.png)

---

## How it works

Connect this MCP to your AI agent (Claude Code, Copilot, Gemini CLI, etc.) and everything starts automatically:

1. **API server + dashboard launch** in the background
2. **A board is created** for your project (one per directory, reused across sessions)
3. **The browser opens** directly to your project's board
4. **A keeper process starts** — it watches `git diff` every 8 seconds and keeps the agent's heartbeat alive every 15 seconds, so the dashboard stays current even when the agent isn't explicitly calling MCP tools

Tasks are created and updated continuously as the agent works. Code diffs appear inside each task. The agent marks tasks done via MCP when it finishes them — the keeper never closes tasks on your behalf.

---

## Prerequisites

- **Node.js** 20+
- **pnpm** 8+
- **Python 3** (built-in on macOS/Linux — used by the background keeper)

---

## Installation

```bash
git clone https://github.com/yourusername/agent-track-dashboard.git
cd agent-track-dashboard
pnpm install
pnpm build
```

---

## Connecting to your AI agent

Pick the client you use and add the MCP server config. After that, just start coding — the dashboard appears on its own.

> Run `pnpm install && pnpm build` once before connecting any client.

---

### Claude Code

**Option A — Project-level (`.mcp.json` in your project root)**

```json
{
  "mcpServers": {
    "agent-track": {
      "command": "node",
      "args": ["/absolute/path/to/agent-track-dashboard/packages/mcp-server/dist/index.js"],
      "env": {
        "DATABASE_PATH": "/absolute/path/to/agent-track-dashboard/packages/api-server/data/kanban.db"
      }
    }
  }
}
```

**Option B — CLI**

```bash
claude mcp add agent-track \
  --command node \
  --args /absolute/path/to/agent-track-dashboard/packages/mcp-server/dist/index.js \
  --env DATABASE_PATH=/absolute/path/to/agent-track-dashboard/packages/api-server/data/kanban.db
```

---

### VS Code (GitHub Copilot)

Create `.vscode/mcp.json` in your project root:

```json
{
  "servers": {
    "agent-track": {
      "command": "node",
      "args": ["/absolute/path/to/agent-track-dashboard/packages/mcp-server/dist/index.js"],
      "env": {
        "DATABASE_PATH": "/absolute/path/to/agent-track-dashboard/packages/api-server/data/kanban.db"
      }
    }
  }
}
```

---

### Gemini CLI

Create `.gemini/settings.json` in your project root:

```json
{
  "mcpServers": {
    "agent-track": {
      "command": "node",
      "args": ["/absolute/path/to/agent-track-dashboard/packages/mcp-server/dist/index.js"],
      "env": {
        "DATABASE_PATH": "/absolute/path/to/agent-track-dashboard/packages/api-server/data/kanban.db"
      }
    }
  }
}
```

---

### OpenAI Codex CLI

```bash
codex mcp add agent-track \
  --env DATABASE_PATH=/absolute/path/to/agent-track-dashboard/packages/api-server/data/kanban.db \
  -- node /absolute/path/to/agent-track-dashboard/packages/mcp-server/dist/index.js
```

Or add manually to `~/.codex/config.toml`:

```toml
[mcp_servers.agent-track]
command = "node"
args = ["./packages/mcp-server/dist/index.js"]

[mcp_servers.agent-track.env]
DATABASE_PATH = "./packages/api-server/data/kanban.db"
```

---

### HTTP mode (remote clients, ChatGPT)

For clients that connect over HTTP instead of stdio:

```bash
MCP_TRANSPORT=http MCP_HTTP_HOST=127.0.0.1 MCP_HTTP_PORT=8787 \
  pnpm --filter @agent-track/mcp-server start
```

MCP endpoint: `http://127.0.0.1:8787/mcp`

> This mode has no auth by default — keep it on localhost or add a reverse proxy.

---

## What the dashboard shows

| What | Where |
|---|---|
| Active tasks with status | Kanban board columns |
| Which agent owns each task | Task card header |
| Files being changed | Task card file list |
| Code diffs with syntax highlight | Task detail modal |
| Lines added / removed | Task card stats |
| Progress percentage | Task card progress bar |
| Agent status (active / idle / offline) | Agent sidebar |
| Agent task counts and success rate | Agent detail panel |

---

## Agent status

Status is computed from heartbeat recency:

- **Active** — heartbeat within the last 5 minutes
- **Idle** — heartbeat 5–10 minutes ago
- **Offline** — no heartbeat for 10+ minutes

The keeper sends heartbeats every 15 seconds automatically, so the agent stays **Active** for the entire session without the agent needing to call the `heartbeat` MCP tool manually.

---

## MCP tools reference

These tools are available to the agent once connected:

| Category | Tool | Description |
|---|---|---|
| Board | `create_board` | Create a kanban board |
| | `list_boards` | List all boards |
| | `get_board` | Get board with tasks and agents |
| Agent | `register_agent` | Register with capabilities |
| | `heartbeat` | Signal active status |
| Session | `start_session` | Start a work session |
| | `end_session` | End a session |
| Task | `start_task` | Create and claim a task |
| | `update_task_status` | Move between columns |
| | `update_task_progress` | Update progress, files, diffs |
| | `complete_task` | Mark done |
| | `fail_task` | Mark failed |
| Collaboration | `add_comment` | Comment on a task |
| | `set_task_blocker` | Mark a task as blocked |
| Query | `get_my_tasks` | Tasks for this agent |
| | `get_available_tasks` | Unclaimed tasks |
| | `get_blocked_tasks` | Blocked tasks |

---

## Environment variables

```bash
# MCP Server
DATABASE_PATH=./packages/api-server/data/kanban.db
AUTO_LAUNCH_DASHBOARD=true        # set false to disable browser auto-open
MCP_TRANSPORT=stdio               # stdio | http | streamable-http
MCP_HTTP_HOST=127.0.0.1
MCP_HTTP_PORT=8787
MCP_HTTP_PATH=/mcp
MCP_BOOTSTRAP_PROJECT_BOARD=true  # auto-create board for cwd

# API Server
API_PORT=3000
WEBSOCKET_PORT=8080

# Dashboard
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:8080
```

---

## Project structure

```
agent-track-dashboard/
├── packages/
│   ├── mcp-server/     # MCP tools + auto-launch logic
│   ├── api-server/     # REST API + WebSocket server
│   ├── dashboard/      # React kanban dashboard
│   └── shared/         # Shared TypeScript types
├── scripts/
│   └── agent-keeper.py # Background keeper (auto-started by MCP)
└── docs/               # Architecture docs
```

---

## Troubleshooting

**Dashboard shows agent as offline while coding**

The keeper handles this automatically. If it's still happening, check that Python 3 is available:
```bash
python3 --version
```

**API server not starting**

Make sure the project is built:
```bash
pnpm build
```

Check if the port is already in use:
```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:8080 | xargs kill -9
```

**Tasks not appearing**

Verify the API server is reachable:
```bash
curl http://localhost:3000/health
```

Check the database directly:
```bash
sqlite3 packages/api-server/data/kanban.db "SELECT id, title, status FROM agent_tasks;"
```

**Port conflicts**

```bash
lsof -ti:5173 | xargs kill -9   # dashboard
lsof -ti:3000 | xargs kill -9   # api server
lsof -ti:8080 | xargs kill -9   # websocket
```

**Database locked**

Stop all processes, wait a few seconds, then restart. To reset entirely (deletes all data):
```bash
rm packages/api-server/data/kanban.db
```

---

## License

MIT
