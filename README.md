# Agent Track Dashboard

**Real-time AI Agent Activity Tracking Dashboard**

A comprehensive monitoring and tracking system for AI agents, visualized as an interactive kanban board. Track what each agent is doing, monitor progress, view code changes, and maintain full traceability of all agent activities.

## Overview

This project provides:

- 🤖 **Agent Activity Tracking** - Monitor what AI agents are doing in real-time
- 📊 **Kanban Board Visualization** - Visual workflow management with drag-and-drop
- 🔍 **Code Diff Viewing** - See all code changes made by agents
- 📡 **Real-time Updates** - WebSocket-based live updates
- 🎯 **Task Management** - Full task lifecycle from creation to completion
- 📈 **Analytics & Insights** - Track agent performance and productivity

## Architecture

The system consists of three main components:

### 1. MCP Server (`packages/mcp-server`)

The **instrumentation layer** that AI agents use to report their activities. Exposes MCP (Model Context Protocol) tools that agents can call to create tasks, update progress, and communicate status.

**Key Features:**
- 20+ MCP tools for comprehensive agent instrumentation
- Event-driven architecture for real-time updates
- SQLite database for persistence
- Session management with heartbeat tracking

### 2. API + WebSocket Server (`packages/api-server`)

The **backend server** that provides:
- REST API for dashboard data access
- WebSocket server for real-time updates
- Database access layer
- Event broadcasting

### 3. Web Dashboard (`packages/dashboard`)

The **frontend application** - a React-based web dashboard featuring:
- Real-time kanban board with drag-and-drop
- Task detail modals with code diffs
- Agent monitoring sidebar
- Analytics dashboard
- Filtering and search

### 4. Shared Types (`packages/shared`)

Shared TypeScript types and utilities used across all packages.

## Project Structure

```
agent-track-dashboard/
├── docs/                           # Architecture documentation
│   ├── data-model.md
│   ├── mcp-server-architecture.md
│   ├── web-dashboard-architecture.md
│   └── code-diff-feature.md
├── packages/
│   ├── mcp-server/                 # MCP server for agent instrumentation
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── server.ts
│   │   │   ├── tools/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   └── db/
│   │   └── package.json
│   ├── api-server/                 # REST API + WebSocket server
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── api.ts
│   │   │   ├── websocket.ts
│   │   │   ├── repositories/
│   │   │   └── db/
│   │   └── package.json
│   ├── dashboard/                  # React web dashboard
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   ├── stores/
│   │   │   ├── hooks/
│   │   │   └── services/
│   │   └── package.json
│   └── shared/                     # Shared types and utilities
│       ├── src/
│       │   └── types.ts
│       └── package.json
├── package.json                    # Root package with workspaces
└── README.md
```

## Data Model

### Task Statuses (Kanban Columns)

- **TODO** - Task created but not yet claimed
- **Claimed** - Agent has claimed the task
- **In Progress** - Agent is actively working on the task
- **Review** - Task is ready for review
- **Done** - Task completed successfully

### Task Information

Each task card displays:

- ✅ **Task name** - Clear description of the work
- ✅ **Description** - Detailed markdown description
- ✅ **Priority** - Critical, High, Medium, Low
- ✅ **Created date** - When the task was created
- ✅ **Updated date** - Last modification time
- ✅ **Claimed by** - Which agent is working on it
- ✅ **Files modified** - List of files being changed
- ✅ **Code changes** - Full diff view of all changes
- ✅ **Progress** - Percentage completion
- ✅ **Status** - Current kanban column
- ✅ **Timeline** - Started, completed, duration
- ✅ **Statistics** - Lines changed, tokens used

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/agent-track-dashboard.git
cd agent-track-dashboard

# Install dependencies
npm install

# Build all packages
npm run build
```

### Development

```bash
# Run all services in development mode
npm run dev

# Or run individually:
npm run dev:mcp        # MCP server only
npm run dev:api        # API server only
npm run dev:dashboard  # Dashboard only
```

This will start:
- MCP server (stdio transport for Claude Desktop)
- API server on `http://localhost:3000`
- WebSocket server on `ws://localhost:8080`
- Dashboard on `http://localhost:5173`

### Production

```bash
# Build all packages
npm run build

# Start production server
npm start
```

## Usage

### For AI Agents

Agents interact with the system through MCP tools:

```typescript
// Agent registers itself
await mcp.callTool('register_agent', {
  name: 'Claude Code',
  type: 'code-generator',
  capabilities: ['typescript', 'react', 'testing']
});

// Agent starts a work session
const session = await mcp.callTool('start_session', {
  agentId: 'agent-123',
  boardId: 'main-board'
});

// Agent creates and claims a task
const task = await mcp.callTool('start_task', {
  boardId: 'main-board',
  sessionId: session.sessionId,
  title: 'Refactor authentication module',
  importance: 'high',
  estimatedDuration: 300
});

// Agent reports progress
await mcp.callTool('update_task_progress', {
  taskId: task.taskId,
  progress: 50,
  currentAction: 'Creating separate modules',
  files: ['src/auth/login.ts', 'src/auth/logout.ts'],
  codeChanges: [/* diff objects */]
});

// Agent completes the task
await mcp.callTool('complete_task', {
  taskId: task.taskId,
  summary: 'Successfully refactored auth module',
  tokensUsed: 15000
});
```

### For Developers

1. **Open the dashboard**: Navigate to `http://localhost:5173`
2. **View the kanban board**: See all active agent tasks organized by status
3. **Click any task**: View detailed information including code diffs
4. **Monitor agents**: See which agents are active and what they're working on
5. **Filter & search**: Find specific tasks by agent, priority, or status
6. **Drag & drop**: Manually move tasks between columns if needed

## Configuration

### Claude Desktop Integration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agent-kanban": {
      "command": "node",
      "args": ["/path/to/agent-track-dashboard/packages/mcp-server/dist/index.js"],
      "env": {
        "DATABASE_PATH": "~/.agent-kanban/kanban.db"
      }
    }
  }
}
```

### Environment Variables

```bash
# MCP Server
DATABASE_PATH=./data/kanban.db

# API Server
API_PORT=3000
WEBSOCKET_PORT=8080
DATABASE_PATH=./data/kanban.db

# Dashboard
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:8080
```

## Features

### Real-time Monitoring

- Live updates as agents create and update tasks
- WebSocket-based communication for instant synchronization
- No page refresh needed

### Code Change Tracking

- View all code changes made by agents
- Syntax-highlighted diff view
- File-by-file breakdown
- Insertions/deletions statistics

### Agent Coordination

- See which agents are active
- Track task dependencies
- Prevent conflicts with task locking
- Inter-agent communication via comments

### Analytics

- Agent performance metrics
- Task completion rates
- Time tracking
- Token usage statistics

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT

## Roadmap

- [ ] Initial MVP implementation
- [ ] Basic kanban board functionality
- [ ] Code diff viewing
- [ ] Multi-board support
- [ ] GitHub integration
- [ ] Jira/Linear sync
- [ ] Analytics dashboard
- [ ] Mobile app
- [ ] Plugin system for extensibility

## Support

For issues and questions, please open an issue on GitHub.