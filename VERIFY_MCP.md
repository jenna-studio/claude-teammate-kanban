# Verify MCP Integration with Claude Code

## Step 1: Build the MCP Server

Make sure the MCP server is built:

```bash
cd /Users/yoojinseon/Develop/Sourcetree/agent-track-dashboard
pnpm --filter @agent-track/mcp-server build
```

## Step 2: Start the API Server

The MCP server needs the API server running to send notifications:

```bash
# Terminal 1
pnpm --filter @agent-track/api-server dev
```

## Step 3: Start the Dashboard

```bash
# Terminal 2
pnpm --filter @agent-track/dashboard dev
```

The dashboard will be at http://localhost:5173

## Step 4: Test MCP Tools in Claude Code

In this chat, try using one of the MCP tools. Type:

```
Can you list all available boards using the list_boards tool?
```

If it works, you'll see the MCP tool being called!

## Step 5: Create a Test Task

Try creating a task:

```
Can you use the agent-track MCP server to:
1. Register an agent named "Test Agent"
2. Start a session on the first board
3. Create a task called "Testing MCP Integration"
4. Update the task status to "in_progress"
5. Complete the task
```

Then check the dashboard at http://localhost:5173 - you should see the task appear!

## Troubleshooting

### MCP Tools Not Available

If you don't see the MCP tools available:

1. **Check the build**:
   ```bash
   ls -la packages/mcp-server/dist/index.js
   # Should exist and have recent timestamp
   ```

2. **Check Claude Code settings**:
   - The project should have `.mcp.json` at the root
   - `.claude/settings.local.json` should have `enableAllProjectMcpServers: true`

3. **Restart Claude Code**:
   - Sometimes you need to restart the conversation or Claude Code for MCP servers to load

4. **Check for errors**:
   - Look in Claude Code logs for MCP connection errors

### MCP Tools Work But No Dashboard Updates

If MCP tools work but tasks don't appear on dashboard:

1. **Verify API server is running**:
   ```bash
   curl http://localhost:3000/health
   # Should return: {"status":"ok",...}
   ```

2. **Check WebSocket connection**:
   - Open http://localhost:5173
   - Open browser DevTools → Console
   - Look for "WebSocket connected" message

3. **Check database path**:
   - MCP server uses: `./packages/api-server/data/kanban.db`
   - API server should use the same database
   - Verify both are pointing to the same file

## Available MCP Tools

Once connected, you should have access to these tools:

### Board Management
- `create_board` - Create a new kanban board
- `list_boards` - List all boards
- `get_board` - Get detailed board info

### Agent Registration
- `register_agent` - Register an AI agent
- `heartbeat` - Send heartbeat to stay active

### Session Management
- `start_session` - Start a work session
- `end_session` - End a work session

### Task Management
- `start_task` - Create and claim a new task
- `update_task_status` - Move task between columns
- `update_task_progress` - Update progress and files
- `complete_task` - Mark task as done
- `fail_task` - Mark task as failed

### Task Collaboration
- `add_comment` - Add comment to task
- `set_task_blocker` - Mark task as blocked

### Query Tools
- `get_my_tasks` - Get tasks for an agent
- `get_available_tasks` - Get unclaimed tasks
- `get_blocked_tasks` - Get blocked tasks

## Quick Test Command

Ask Claude Code to run this test:

```
Please use the agent-track MCP tools to:
1. Call list_boards to see available boards
2. If there are boards, get details of the first one
3. Tell me what you found
```

This will verify the MCP connection is working!
