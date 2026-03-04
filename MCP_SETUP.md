# Agent Track MCP Server Setup

This document explains how to configure and use the Agent Track Dashboard as an MCP (Model Context Protocol) tool for AI agents.

## What is This?

Agent Track is an MCP server that allows AI agents to track their work activities in a kanban-style dashboard. Agents can:

- Create and manage kanban boards for different projects
- Register themselves and report their status
- Create, update, and complete tasks
- Track progress with detailed metrics (files changed, code diffs, tokens used)
- Collaborate via task comments and dependencies

## Installation

### For Claude Desktop (Recommended)

Add this to your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "agent-track": {
      "command": "node",
      "args": [
        "/Users/yoojinseon/Develop/Sourcetree/agent-track-dashboard/packages/mcp-server/dist/index.js"
      ],
      "env": {
        "AUTO_LAUNCH_DASHBOARD": "true"
      }
    }
  }
}
```

**Note**: Replace the path with the absolute path to your installation.

### For Other MCP Clients

Use the following configuration:

- **Command**: `node`
- **Args**: `["/path/to/agent-track-dashboard/packages/mcp-server/dist/index.js"]`
- **Environment Variables**:
  - `AUTO_LAUNCH_DASHBOARD`: Optional. Defaults to `"true"` (auto-open dashboard). Set `"false"` to disable.
  - `DATABASE_PATH`: Optional custom database path (defaults to `packages/api-server/data/kanban.db`)
  - `API_PORT`: Optional API server port (defaults to `3000`)

### For HTTP-based MCP Clients (ChatGPT-compatible / Hosted Agents)

Run the server in Streamable HTTP mode:

```bash
pnpm --filter @agent-track/mcp-server build
MCP_TRANSPORT=http MCP_HTTP_HOST=127.0.0.1 MCP_HTTP_PORT=8787 pnpm --filter @agent-track/mcp-server start
```

Then use this MCP endpoint URL in your client:

```text
http://127.0.0.1:8787/mcp
```

Environment variables for HTTP mode:
- `MCP_HTTP_HOST` (default: `127.0.0.1`)
- `MCP_HTTP_PORT` (default: `8787`)
- `MCP_HTTP_PATH` (default: `/mcp`)

## Available Tools

### Board Management

#### create_board
Create a new kanban board for tracking agent activities.

**Parameters**:
- `name` (required): Board name
- `description` (optional): Board description
- `projectPath` (optional): Project file path
- `repository` (optional): Git repository URL

**Example**:
```json
{
  "name": "My Project",
  "description": "Development board for my-project",
  "projectPath": "/Users/me/projects/my-project"
}
```

#### list_boards
List all kanban boards.

**Example**:
```json
{}
```

#### get_board
Get detailed board information including tasks and agents.

**Parameters**:
- `boardId` (required): Board ID

### Agent Registration

#### register_agent
Register an AI agent with its capabilities.

**Parameters**:
- `name` (required): Agent name
- `type` (required): Agent type (e.g., "code-generator", "code-reviewer")
- `capabilities` (optional): Array of capability strings
- `maxConcurrentTasks` (optional): Maximum concurrent tasks (default: 1)

**Example**:
```json
{
  "name": "Claude",
  "type": "code-generator",
  "capabilities": ["typescript", "react", "python"],
  "maxConcurrentTasks": 3
}
```

#### heartbeat
Send heartbeat signal to indicate agent is active.

**Parameters**:
- `agentId` (required): Agent ID
- `sessionId` (optional): Session ID

### Session Management

#### start_session
Start an agent work session on a board.

**Parameters**:
- `agentId` (required): Agent ID
- `boardId` (required): Board ID
- `metadata` (optional): Session metadata object

#### end_session
End an agent work session.

**Parameters**:
- `sessionId` (required): Session ID
- `summary` (optional): Session summary

### Task Management

#### start_task
Create a new task and claim it.

**Parameters**:
- `boardId` (required): Board ID
- `sessionId` (required): Session ID
- `title` (required): Task title
- `description` (optional): Task description
- `importance` (optional): "critical" | "high" | "medium" | "low" (default: "medium")
- `estimatedDuration` (optional): Estimated duration in seconds
- `tags` (optional): Array of tags
- `parentTaskId` (optional): Parent task ID for subtasks

**Example**:
```json
{
  "boardId": "board-123",
  "sessionId": "session-456",
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication",
  "importance": "high",
  "tags": ["backend", "security", "auth"]
}
```

#### update_task_status
Update task status (move between kanban columns).

**Parameters**:
- `taskId` (required): Task ID
- `status` (required): "todo" | "claimed" | "in_progress" | "review" | "done"
- `currentAction` (optional): Current action description

#### update_task_progress
Update task progress and current action.

**Parameters**:
- `taskId` (required): Task ID
- `progress` (optional): Progress percentage (0-100)
- `currentAction` (optional): Current action description
- `files` (optional): Array of file paths being worked on
- `linesChanged` (optional): Object with `added` and `removed` counts
- `tokensUsed` (optional): Number of tokens used
- `codeChanges` (optional): Array of code change objects with:
  - `filePath` (required): File path
  - `changeType` (required): "added" | "modified" | "deleted" | "renamed"
  - `diff` (required): Git diff string
  - `oldPath` (optional): Old path for renames
  - `language` (optional): Programming language
  - `linesAdded` (optional): Lines added count
  - `linesDeleted` (optional): Lines deleted count

**Example**:
```json
{
  "taskId": "task-789",
  "progress": 75,
  "currentAction": "Writing unit tests",
  "files": ["src/auth.ts", "tests/auth.test.ts"],
  "codeChanges": [{
    "filePath": "src/auth.ts",
    "changeType": "modified",
    "diff": "@@ -10,3 +10,7 @@...",
    "language": "typescript",
    "linesAdded": 45,
    "linesDeleted": 12
  }]
}
```

#### complete_task
Mark a task as successfully completed.

**Parameters**:
- `taskId` (required): Task ID
- `summary` (optional): Completion summary
- `tokensUsed` (optional): Total tokens used

#### fail_task
Mark a task as failed with error details.

**Parameters**:
- `taskId` (required): Task ID
- `errorMessage` (required): Error description
- `willRetry` (optional): Whether agent will retry (default: false)

### Task Collaboration

#### add_comment
Add a comment to a task for inter-agent communication.

**Parameters**:
- `taskId` (required): Task ID
- `author` (required): Comment author name
- `content` (required): Comment content

#### set_task_blocker
Mark a task as blocked by other tasks.

**Parameters**:
- `taskId` (required): Task ID
- `blockedBy` (required): Array of task IDs that are blocking this task

### Query Tools

#### get_my_tasks
Get all tasks assigned to this agent.

**Parameters**:
- `agentId` (required): Agent ID
- `boardId` (optional): Filter by board ID
- `status` (optional): "active" | "completed" | "all" (default: "active")

#### get_available_tasks
Get unclaimed tasks available for claiming.

**Parameters**:
- `boardId` (required): Board ID
- `importance` (optional): Filter by importance level

#### get_blocked_tasks
Get all tasks that are blocked by dependencies.

**Parameters**:
- `boardId` (required): Board ID

## Typical Workflow

Here's a typical workflow for an AI agent using this MCP server:

```
1. Register Agent
   → register_agent(name="Claude", type="code-generator")

2. Create/Find Board
   → list_boards() or create_board(name="My Project")

3. Start Session
   → start_session(agentId=<agent-id>, boardId=<board-id>)

4. Send Heartbeats (periodically)
   → heartbeat(agentId=<agent-id>, sessionId=<session-id>)

5. Create and Work on Tasks
   → start_task(boardId=<board-id>, sessionId=<session-id>, title="Task name")
   → update_task_status(taskId=<task-id>, status="in_progress")
   → update_task_progress(taskId=<task-id>, progress=50, currentAction="Writing code")
   → complete_task(taskId=<task-id>)

6. End Session
   → end_session(sessionId=<session-id>, summary="Completed 5 tasks")
```

## Viewing the Dashboard

Dashboard auto-launch is enabled by default. If you want to disable it:

### Option 1: Disable Auto-Launch

```json
{
  "mcpServers": {
    "agent-track": {
      "command": "node",
      "args": ["/path/to/agent-track-dashboard/packages/mcp-server/dist/index.js"],
      "env": {
        "AUTO_LAUNCH_DASHBOARD": "false"
      }
    }
  }
}
```

### Option 2: Separate Dashboard Process

Start the API server and dashboard separately:

```bash
# Terminal 1: Start API server
cd agent-track-dashboard
pnpm --filter @agent-track/api-server dev

# Terminal 2: Start dashboard
pnpm --filter @agent-track/dashboard dev

# Open browser to http://localhost:5173
```

## Troubleshooting

### MCP Server Not Starting

1. Make sure you've built the project:
   ```bash
   cd agent-track-dashboard
   pnpm install
   pnpm build:mcp
   ```

2. Check the path in your config is absolute and correct

3. Look for error messages in the MCP client logs

### Dashboard Won't Open

If using `AUTO_LAUNCH_DASHBOARD=true` and dashboard doesn't open:

1. Check if ports 3000 (API) and 5173 (dashboard) are available
2. Kill any existing processes on these ports
3. Check the terminal output for error messages

### Database Issues

If you see database errors:

1. Check that `DATABASE_PATH` points to a writable location
2. Delete the database file to start fresh: `rm packages/api-server/data/kanban.db`
3. The MCP server will recreate it automatically

## Architecture

- **MCP Server** (`packages/mcp-server`): Exposes tools via stdio and Streamable HTTP transports
- **API Server** (`packages/api-server`): REST API + WebSocket for real-time updates
- **Dashboard** (`packages/dashboard`): React frontend for visualization
- **Shared** (`packages/shared`): Common types and utilities

All components share the same SQLite database for consistency.

## Development

To work on the MCP server itself:

```bash
# Watch mode for development
cd packages/mcp-server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test
```

## License

MIT
