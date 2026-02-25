# Using Agent Track Dashboard with Claude Code

The Agent Track Dashboard is now fully integrated with Claude Code CLI! You can track your coding activities in real-time through the web dashboard.

## Quick Start

### 1. Start the Servers

```bash
# Start the API server (in one terminal)
cd /Users/yoojinseon/Develop/Sourcetree/agent-track-dashboard
pnpm run dev:api

# Start the dashboard (in another terminal)
pnpm run dev:dashboard
```

The dashboard will be available at **http://localhost:5174**

### 2. Create a Board

Create a board for your project:

```bash
node agent-track-helper.js create-board "My Project" "Description" "$(pwd)"
```

This will output a board ID like `board-1234567890-abc123`

### 3. Create and Track Tasks

```bash
# Create a task
node agent-track-helper.js create-task board-1234567890-abc123 "Implement authentication"

# This outputs a task ID like task-9876543210-xyz789

# Update task progress
node agent-track-helper.js update-task task-9876543210-xyz789 25 "Setting up JWT middleware"
node agent-track-helper.js update-task task-9876543210-xyz789 50 "Adding login endpoints"
node agent-track-helper.js update-task task-9876543210-xyz789 75 "Writing tests"

# Complete the task
node agent-track-helper.js complete-task task-9876543210-xyz789
```

### 4. View in Dashboard

Open **http://localhost:5174** in your browser to see:
- Real-time task progress
- Active agents (your Claude Code sessions)
- Task statistics
- Kanban-style board view

## Available Commands

### Board Management
```bash
# Create a board
node agent-track-helper.js create-board <name> <description> <path>

# List all boards
node agent-track-helper.js list-boards
```

### Task Management
```bash
# Create a task
node agent-track-helper.js create-task <boardId> <title> [description]

# Update task progress (0-100)
node agent-track-helper.js update-task <taskId> <progress> [currentAction]

# Complete a task
node agent-track-helper.js complete-task <taskId>

# List all tasks
node agent-track-helper.js list-tasks

# List tasks for a specific board
node agent-track-helper.js list-tasks <boardId>
```

## REST API Endpoints

You can also use the REST API directly:

### Boards
- `GET /api/boards` - List all boards
- `POST /api/boards` - Create a board
- `GET /api/boards/:id` - Get board details
- `PATCH /api/boards/:id` - Update a board
- `DELETE /api/boards/:id` - Delete a board

### Tasks
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create a task
- `GET /api/tasks/:id` - Get task details
- `PATCH /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task

### Example cURL Commands

```bash
# Create a board
curl -X POST http://localhost:3000/api/boards \
  -H "Content-Type: application/json" \
  -d '{"name":"My Project","projectPath":"/path/to/project"}'

# Create a task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"boardId":"board-123","title":"Fix bug","agentId":"claude-code","agentName":"Claude Code","agentType":"coding"}'

# Update task progress
curl -X PATCH http://localhost:3000/api/tasks/task-456 \
  -H "Content-Type: application/json" \
  -d '{"progress":50,"currentAction":"Writing tests"}'
```

## Integration with Your Workflow

### Option 1: Manual Tracking
Use the helper script to manually report your progress as you work on tasks.

### Option 2: Automated Tracking
Create bash functions or aliases to automatically track your work:

```bash
# Add to your ~/.bashrc or ~/.zshrc
track_task() {
  local title="$1"
  local board_id="${AGENT_TRACK_BOARD:-board-default}"
  node /path/to/agent-track-helper.js create-task "$board_id" "$title"
}

update_progress() {
  local task_id="$1"
  local progress="$2"
  local action="$3"
  node /path/to/agent-track-helper.js update-task "$task_id" "$progress" "$action"
}
```

### Option 3: Git Integration
Add git hooks to automatically track commits:

```bash
# .git/hooks/post-commit
#!/bin/bash
TASK_ID=$(git config --get agent-track.current-task)
if [ -n "$TASK_ID" ]; then
  MESSAGE=$(git log -1 --pretty=%B)
  node /path/to/agent-track-helper.js update-task "$TASK_ID" "" "$MESSAGE"
fi
```

## Differences from Claude Desktop

**Claude Desktop (MCP Server):**
- Automatic tracking of all Claude activities
- No manual intervention required
- Integrates deeply with Claude's task execution

**Claude Code (REST API):**
- Manual or script-based tracking
- More control over what gets tracked
- Can integrate with other tools and workflows

## Troubleshooting

### API server not responding
```bash
# Check if server is running
curl http://localhost:3000/health

# Restart the server
cd /Users/yoojinseon/Develop/Sourcetree/agent-track-dashboard
pnpm run dev:api
```

### Dashboard shows no data
1. Make sure the API server is running
2. Check that you've created at least one board
3. Verify board and task IDs are correct
4. Check browser console for errors

### Helper script errors
```bash
# Make script executable
chmod +x agent-track-helper.js

# Test with help command
node agent-track-helper.js help
```

## Next Steps

1. Start the servers
2. Create your first board
3. Try creating and updating a few tasks
4. View the dashboard in your browser
5. Integrate the helper script into your workflow

Enjoy tracking your agent activities! 🚀
