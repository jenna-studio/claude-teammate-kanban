#!/bin/bash
#
# Claude Code Hook: Track agent activity on the dashboard
# Receives hook JSON via stdin, calls the API server to log activity.
# Captures code diffs from Edit/Write/NotebookEdit tools.
# Each file edit gets its own dedicated task card.
#

API_URL="http://localhost:3000/api"
STATE_FILE="/tmp/agent-track-session.json"

# Read hook input from stdin
INPUT=$(cat)
HOOK_TYPE="${CLAUDE_HOOK_EVENT:-unknown}"

# Helper: silent curl POST
api_post() {
  curl -s -X POST "$API_URL/$1" \
    -H "Content-Type: application/json" \
    -d "$2" 2>/dev/null
}

api_patch() {
  curl -s -X PATCH "$API_URL/$1" \
    -H "Content-Type: application/json" \
    -d "$2" 2>/dev/null
}

# Check if API server is reachable
if ! curl -s --max-time 1 "$API_URL/../health" >/dev/null 2>&1; then
  exit 0
fi

case "$HOOK_TYPE" in
  SessionStart)
    # Get the first board
    BOARD_ID=$(curl -s "$API_URL/boards" 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
boards = data.get('data', [])
print(boards[0]['id'] if boards else '')
" 2>/dev/null)

    if [ -z "$BOARD_ID" ]; then
      exit 0
    fi

    # Register agent
    AGENT_RESULT=$(api_post "agents" "$(cat <<EOF
{
  "name": "Claude Code",
  "type": "coding-assistant",
  "status": "active",
  "capabilities": ["code-generation", "code-review", "debugging", "refactoring"],
  "maxConcurrentTasks": 3,
  "lastHeartbeat": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)")

    AGENT_ID=$(echo "$AGENT_RESULT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data.get('data', {}).get('id', ''))
" 2>/dev/null)

    SESSION_ID="hook-session-$(date +%s)"

    # Save session state — no task created upfront
    # Each file edit will get its own task card
    cat > "$STATE_FILE" <<EOF
{
  "boardId": "$BOARD_ID",
  "agentId": "$AGENT_ID",
  "sessionId": "$SESSION_ID",
  "fileTasks": {}
}
EOF
    ;;

  PostToolUse)
    # Track file edits — one task per file
    if [ ! -f "$STATE_FILE" ]; then
      exit 0
    fi

    # Send heartbeat to keep agent online
    AGENT_ID=$(python3 -c "import json; print(json.load(open('$STATE_FILE')).get('agentId',''))" 2>/dev/null)
    if [ -n "$AGENT_ID" ]; then
      api_patch "agents/$AGENT_ID" "{\"lastHeartbeat\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >/dev/null 2>&1 &
    fi

    TOOL_NAME=$(echo "$INPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data.get('tool_name', data.get('toolName', '')))
" 2>/dev/null)

    # Only track file-modifying tools
    case "$TOOL_NAME" in
      Edit|Write|NotebookEdit)
        # One task per file: create a new task if file hasn't been seen yet,
        # otherwise update the existing task for that file.
        echo "$INPUT" | python3 << 'PYEOF'
import sys, json, os, urllib.request

API_URL = "http://localhost:3000/api"
STATE_FILE = "/tmp/agent-track-session.json"

def detect_language(filepath):
    ext_map = {
        '.ts': 'typescript', '.tsx': 'typescriptreact',
        '.js': 'javascript', '.jsx': 'javascriptreact',
        '.py': 'python', '.rb': 'ruby', '.go': 'go',
        '.rs': 'rust', '.java': 'java', '.kt': 'kotlin',
        '.swift': 'swift', '.c': 'c', '.h': 'c',
        '.cpp': 'cpp', '.cc': 'cpp', '.cs': 'csharp',
        '.php': 'php', '.html': 'html', '.css': 'css',
        '.scss': 'scss', '.json': 'json', '.yaml': 'yaml',
        '.yml': 'yaml', '.md': 'markdown', '.sh': 'shellscript',
        '.sql': 'sql', '.xml': 'xml', '.vue': 'vue',
        '.svelte': 'svelte',
    }
    _, ext = os.path.splitext(filepath)
    return ext_map.get(ext, '')

def http_post(path, data):
    try:
        req = urllib.request.Request(
            f"{API_URL}/{path}",
            data=json.dumps(data).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            return json.loads(resp.read().decode())
    except Exception:
        return {}

def http_patch(path, data):
    try:
        req = urllib.request.Request(
            f"{API_URL}/{path}",
            data=json.dumps(data).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='PATCH'
        )
        urllib.request.urlopen(req, timeout=3)
    except Exception:
        pass

try:
    hook_data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

tool_name = hook_data.get('tool_name', hook_data.get('toolName', ''))
tool_input = hook_data.get('tool_input', hook_data.get('input', {}))

if not isinstance(tool_input, dict):
    sys.exit(0)

# Read state
try:
    with open(STATE_FILE) as f:
        state = json.load(f)
except Exception:
    sys.exit(0)

board_id   = state.get('boardId', '')
agent_id   = state.get('agentId', '')
file_tasks = state.get('fileTasks', {})  # file_path -> task_id

file_path = tool_input.get('file_path', tool_input.get('filePath', tool_input.get('notebook_path', '')))

if not file_path:
    sys.exit(0)

basename = os.path.basename(file_path)

# Determine is_new_file BEFORE building tags so the tag is accurate
task_id = file_tasks.get(file_path)
is_new_file = task_id is None

# Build tags: language + change type
lang = detect_language(file_path)
tags = []
if lang:
    tags.append(lang)
if tool_name == 'Write':
    tags.append('new-file' if is_new_file else 'edit')
elif tool_name == 'NotebookEdit':
    tags.append('notebook')
else:
    tags.append('edit')

# --- Get or create a dedicated task for this file ---

if not task_id:
    resp = http_post("tasks", {
        "boardId":   board_id,
        "title":     f"Edit {basename}",
        "description": f"Editing `{file_path}`",
        "importance": "medium",
        "status":    "in_progress",
        "agentId":   agent_id,
        "agentName": "Claude Code",
        "agentType": "coding-assistant",
        "progress":  0,
        "files":     [file_path],
        "tags":      tags,
    })
    task_id = (resp.get('data') or {}).get('id', '')
    if task_id:
        file_tasks[file_path] = task_id
        state['fileTasks'] = file_tasks
        with open(STATE_FILE, 'w') as f:
            json.dump(state, f)

if not task_id:
    sys.exit(0)

# --- Build code change ---
code_change = {
    'filePath': file_path,
    'language': detect_language(file_path),
}

if tool_name == 'Edit':
    old_string = tool_input.get('old_string', '')
    new_string = tool_input.get('new_string', '')

    old_lines = old_string.split('\n') if old_string else []
    new_lines = new_string.split('\n') if new_string else []

    diff_parts = []
    diff_parts.append(f'--- a/{basename}')
    diff_parts.append(f'+++ b/{basename}')
    diff_parts.append(f'@@ -{1},{len(old_lines)} +{1},{len(new_lines)} @@')
    for line in old_lines:
        diff_parts.append(f'-{line}')
    for line in new_lines:
        diff_parts.append(f'+{line}')

    code_change['changeType'] = 'modified'
    code_change['diff'] = '\n'.join(diff_parts)
    code_change['linesAdded'] = len(new_lines)
    code_change['linesDeleted'] = len(old_lines)

elif tool_name == 'Write':
    content = tool_input.get('content', '')
    lines = content.split('\n') if content else []
    line_count = len(lines)

    max_lines = 100
    capped = lines[:max_lines]

    code_change['changeType'] = 'added' if is_new_file else 'modified'

    diff_parts = []
    if not is_new_file:
        diff_parts.append(f'--- a/{basename}')
    diff_parts.append(f'+++ b/{basename}')
    diff_parts.append(f'@@ -0,0 +1,{line_count} @@')
    for line in capped:
        diff_parts.append(f'+{line}')
    if line_count > max_lines:
        diff_parts.append(f'+... ({line_count - max_lines} more lines)')

    code_change['diff'] = '\n'.join(diff_parts)
    code_change['linesAdded'] = line_count
    code_change['linesDeleted'] = 0

elif tool_name == 'NotebookEdit':
    new_source = tool_input.get('new_source', '')
    lines = new_source.split('\n') if new_source else []

    code_change['changeType'] = 'modified'
    diff_parts = [f'+++ b/{basename}']
    diff_parts.append('@@ notebook cell @@')
    for line in lines[:50]:
        diff_parts.append(f'+{line}')
    if len(lines) > 50:
        diff_parts.append(f'+... ({len(lines) - 50} more lines)')
    code_change['diff'] = '\n'.join(diff_parts)
    code_change['linesAdded'] = len(lines)
    code_change['linesDeleted'] = 0

# Submit code change
if 'diff' in code_change:
    http_post(f"tasks/{task_id}/code-changes", code_change)

# Update task action
http_patch(f"tasks/{task_id}", {
    'currentAction': f'Editing {basename}',
    'files': [file_path],
})

PYEOF
        ;;
    esac
    ;;

  Stop|SessionEnd)
    # Complete all per-file tasks
    if [ ! -f "$STATE_FILE" ]; then
      exit 0
    fi

    python3 << 'PYEOF'
import json, urllib.request

API_URL = "http://localhost:3000/api"
STATE_FILE = "/tmp/agent-track-session.json"

def http_patch(path, data):
    try:
        req = urllib.request.Request(
            f"{API_URL}/{path}",
            data=json.dumps(data).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='PATCH'
        )
        urllib.request.urlopen(req, timeout=3)
    except Exception:
        pass

try:
    with open(STATE_FILE) as f:
        state = json.load(f)
except Exception:
    raise SystemExit(0)

agent_id   = state.get('agentId', '')
file_tasks = state.get('fileTasks', {})

# Complete every open file task
for file_path, task_id in file_tasks.items():
    if task_id:
        http_patch(f"tasks/{task_id}", {
            "status":        "done",
            "progress":      100,
            "currentAction": "Session completed",
        })

# Mark agent idle
if agent_id:
    http_patch(f"agents/{agent_id}", {"status": "idle"})

PYEOF

    rm -f "$STATE_FILE"
    ;;
esac

exit 0
