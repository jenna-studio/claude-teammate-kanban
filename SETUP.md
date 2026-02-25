# Agent Track Dashboard - Setup Guide

## Quick Start

### 1. Install Dependencies

**IMPORTANT:** This project uses npm workspaces with the `workspace:*` protocol, which requires **pnpm** or **yarn**.

**Option A - Using pnpm (recommended):**
```bash
# Install pnpm if you don't have it
npm install -g pnpm

# Install all workspace dependencies
pnpm install
```

**Option B - Using yarn:**
```bash
# Install yarn if you don't have it
npm install -g yarn

# Install all workspace dependencies
yarn install
```

**Note:** `npm install` will fail with "EUNSUPPORTEDPROTOCOL" error. You must use pnpm or yarn.

### 2. Build All Packages

```bash
# Build shared types and servers
pnpm run build
```

### 3. Start Development Servers

Open 3 separate terminals:

**Terminal 1 - API Server:**
```bash
pnpm run dev:api
```

**Terminal 2 - Dashboard:**
```bash
pnpm run dev:dashboard
```

**Terminal 3 - MCP Server (optional, for testing):**
```bash
pnpm run dev:mcp
```

### 4. Access the Dashboard

Open your browser to: http://localhost:5173

## Package Overview

### `@agent-track/shared`
- Shared TypeScript types and interfaces
- Used by all other packages
- Located in `packages/shared`

### `@agent-track/mcp-server`
- MCP server for agent instrumentation
- Provides 20+ tools for agents to report activities
- Located in `packages/mcp-server`
- Runs on stdio (for Claude Desktop integration)

### `@agent-track/api-server`
- REST API server on port 3000
- WebSocket server on port 8080
- Located in `packages/api-server`
- Shares database with MCP server

### `@agent-track/dashboard`
- React web dashboard on port 5173
- Real-time kanban board
- Located in `packages/dashboard`

## Development Workflow

### Build Individual Packages

```bash
# Build specific package
npm run build:mcp
npm run build:api
npm run build:dashboard
```

### Run Individual Dev Servers

```bash
npm run dev:mcp        # MCP server only
npm run dev:api        # API server only
npm run dev:dashboard  # Dashboard only
```

## Database

The system uses SQLite with a shared database file:

- Default location: `./data/kanban.db`
- Set custom path via `DATABASE_PATH` environment variable

```bash
export DATABASE_PATH=/path/to/your/kanban.db
```

## Configuration

### API Server

Environment variables:
- `API_PORT` - REST API port (default: 3000)
- `WEBSOCKET_PORT` - WebSocket port (default: 8080)
- `DATABASE_PATH` - Database file path (default: ./data/kanban.db)

### Dashboard

Environment variables:
- `VITE_API_URL` - API server URL (default: http://localhost:3000)
- `VITE_WS_URL` - WebSocket URL (default: ws://localhost:8080)

Create `.env` files in package directories:

```bash
# packages/api-server/.env
API_PORT=3000
WEBSOCKET_PORT=8080
DATABASE_PATH=./data/kanban.db

# packages/dashboard/.env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:8080
```

## Claude Desktop Integration

To use the MCP server with Claude Desktop:

1. Build the MCP server:
   ```bash
   npm run build:mcp
   ```

2. Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "agent-kanban": {
         "command": "node",
         "args": ["/absolute/path/to/agent-track-dashboard/packages/mcp-server/dist/index.js"],
         "env": {
           "DATABASE_PATH": "/absolute/path/to/data/kanban.db"
         }
       }
     }
   }
   ```

3. Restart Claude Desktop

4. Verify the server appears in Claude's MCP tools list

## Testing the System

### Using MCP Tools via Claude Desktop

Once configured in Claude Desktop, you can test by asking Claude to:

```
Register yourself as an agent and start a session on the main board.
```

Claude will call:
1. `register_agent` - Register as an agent
2. `start_session` - Start a work session
3. `start_task` - Create and claim a task

Then check the dashboard at http://localhost:5173 to see the task appear!

### Manual API Testing

```bash
# Get all boards
curl http://localhost:3000/api/boards

# Get board details
curl http://localhost:3000/api/boards/BOARD_ID

# Get all agents
curl http://localhost:3000/api/agents
```

## Project Structure

```
agent-track-dashboard/
├── packages/
│   ├── shared/           # TypeScript types
│   │   └── src/
│   │       └── types.ts
│   ├── mcp-server/       # MCP server
│   │   └── src/
│   │       ├── index.ts
│   │       ├── server.ts
│   │       ├── db/
│   │       ├── repositories/
│   │       └── tools/
│   ├── api-server/       # REST + WebSocket
│   │   └── src/
│   │       ├── index.ts
│   │       ├── routes/
│   │       └── websocket.ts
│   └── dashboard/        # React app
│       └── src/
│           ├── App.tsx
│           └── components/
├── docs/                 # Documentation
├── package.json          # Root workspace config
└── README.md
```

## Troubleshooting

### Database locked error

If you see "database is locked" errors:
- Ensure only one MCP server instance is running
- Check that no other process is accessing the database
- Delete `.db-wal` and `.db-shm` files and restart

### Port already in use

If ports 3000, 5173, or 8080 are in use:
- Change ports via environment variables
- Or stop the conflicting process

### WebSocket not connecting

- Ensure API server is running on port 8080
- Check browser console for connection errors
- Verify firewall settings allow WebSocket connections

### MCP tools not appearing in Claude

- Verify the path in `claude_desktop_config.json` is absolute
- Check that MCP server was built successfully
- Restart Claude Desktop after config changes
- Check Claude Desktop logs for errors

## Next Steps

1. ✅ Basic kanban board working
2. 🔲 Add WebSocket real-time updates to dashboard
3. 🔲 Implement code diff viewer
4. 🔲 Add task detail modal
5. 🔲 Implement drag-and-drop
6. 🔲 Add agent sidebar
7. 🔲 Create analytics dashboard

## Support

For issues and questions:
- Open an issue on GitHub
- Check the documentation in `/docs`
