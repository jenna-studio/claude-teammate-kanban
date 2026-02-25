#!/bin/bash
#
# Claude Code Hook: Track agent activity on the dashboard
# Receives hook JSON via stdin, calls the API server to log activity.
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

    # Save session state
    cat > "$STATE_FILE" <<EOF
{
  "boardId": "$BOARD_ID",
  "agentId": "$AGENT_ID",
  "files": [],
  "taskId": null
}
EOF
    ;;

  PostToolUse)
    # Track file edits and send heartbeat
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
        FILE_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
inp = data.get('tool_input', data.get('input', {}))
print(inp.get('file_path', inp.get('filePath', inp.get('notebook_path', ''))))
" 2>/dev/null)

        if [ -n "$FILE_PATH" ]; then
          # Add file to tracked list (deduplicated)
          python3 -c "
import json
with open('$STATE_FILE') as f:
    state = json.load(f)
files = state.get('files', [])
fp = '$FILE_PATH'
if fp not in files:
    files.append(fp)
    state['files'] = files
    with open('$STATE_FILE', 'w') as f:
        json.dump(state, f)
" 2>/dev/null
        fi
        ;;
    esac
    ;;

  Stop|SessionEnd)
    # Create a summary task with all tracked files
    if [ ! -f "$STATE_FILE" ]; then
      exit 0
    fi

    STATE=$(cat "$STATE_FILE")
    BOARD_ID=$(echo "$STATE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('boardId',''))" 2>/dev/null)
    AGENT_ID=$(echo "$STATE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('agentId',''))" 2>/dev/null)
    FILES_JSON=$(echo "$STATE" | python3 -c "
import sys, json
state = json.load(sys.stdin)
files = state.get('files', [])
print(json.dumps(files))
" 2>/dev/null)
    FILE_COUNT=$(echo "$STATE" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('files',[])))" 2>/dev/null)

    if [ "$FILE_COUNT" -gt 0 ] 2>/dev/null && [ -n "$BOARD_ID" ] && [ -n "$AGENT_ID" ]; then
      # Create a completed task summarizing the session
      api_post "tasks" "$(cat <<EOF
{
  "boardId": "$BOARD_ID",
  "title": "Claude Code session ($FILE_COUNT files modified)",
  "description": "Automated tracking of Claude Code activity",
  "importance": "medium",
  "status": "done",
  "agentId": "$AGENT_ID",
  "agentName": "Claude Code",
  "agentType": "coding-assistant",
  "sessionId": "hook-session-$(date +%s)",
  "progress": 100,
  "files": $FILES_JSON,
  "completedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)" >/dev/null
    fi

    # Mark agent as idle
    if [ -n "$AGENT_ID" ]; then
      api_patch "agents/$AGENT_ID" '{"status":"idle"}' >/dev/null
    fi

    rm -f "$STATE_FILE"
    ;;
esac

exit 0
