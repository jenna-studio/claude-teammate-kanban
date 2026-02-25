# Agent Track Dashboard - Architecture Overview

## Executive Summary

**Agent Track Dashboard** is a real-time agent activity tracking system that provides full transparency and traceability for AI agents. It visualizes agent work as an interactive kanban board, enabling developers to monitor what agents are doing, track progress, view code changes, and coordinate multi-agent workflows.

### Key Characteristics

- **Target Users**: Developers working with AI agent teams (Claude Code, Cursor, Aider, custom agents)
- **Core Problem**: Lack of visibility into what AI agents are doing in real-time
- **Solution**: Web-based kanban dashboard with real-time updates and code diff viewing
- **Architecture**: MCP-based instrumentation layer + REST/WebSocket API + React dashboard

---

## System Components

### 1. MCP Server (Instrumentation Layer)

**Location**: `packages/mcp-server`

**Purpose**: The instrumentation layer that AI agents use to report their activities.

**Technology**:
- Node.js + TypeScript
- `@modelcontextprotocol/sdk` (official MCP SDK)
- SQLite + `better-sqlite3`
- Zod for validation

**Responsibilities**:
- Expose 20+ MCP tools for agent instrumentation
- Persist task, agent, and session data
- Emit events for real-time updates
- Manage agent sessions and heartbeats
- Handle task lifecycle (create → claim → progress → complete)

**Key Tools**:
- `register_agent` - Register an agent with capabilities
- `start_session` - Begin a work session
- `start_task` - Create and claim a task
- `update_task_progress` - Report progress with code diffs
- `complete_task` - Mark task as done
- `fail_task` - Report failure with error details
- `add_comment` - Inter-agent communication
- `set_task_blocker` - Define task dependencies

**Event System**:
```typescript
// Emits events that WebSocket server listens to
eventBus.emit('task:created', task);
eventBus.emit('task:updated', task);
eventBus.emit('task:completed', task);
eventBus.emit('agent:status_changed', agent);
```

---

### 2. API + WebSocket Server (Backend)

**Location**: `packages/api-server`

**Purpose**: Provide REST API for data access and WebSocket for real-time updates.

**Technology**:
- Express.js
- ws (WebSocket library)
- Shared SQLite database with MCP server

**Responsibilities**:
- REST API endpoints for dashboard
- WebSocket server for live updates
- Database query layer
- Event broadcasting to connected clients
- CORS and authentication (future)

**REST Endpoints**:
```
GET  /api/boards           - List all boards
GET  /api/boards/:id       - Get board with tasks and agents
GET  /api/tasks/:id        - Get task details
GET  /api/agents           - List all agents
GET  /api/agents/:id/tasks - Get agent's tasks
POST /api/comments         - Add comment to task
```

**WebSocket Events**:
```typescript
// Server → Client
{ type: 'task_created', task: {...} }
{ type: 'task_updated', task: {...} }
{ type: 'task_moved', taskId, fromStatus, toStatus }
{ type: 'agent_status_changed', agent: {...} }
{ type: 'comment_added', comment: {...} }

// Client → Server
{ type: 'subscribe', boardId: 'board-123' }
{ type: 'unsubscribe', boardId: 'board-123' }
```

---

### 3. Web Dashboard (Frontend)

**Location**: `packages/dashboard`

**Purpose**: Visual interface for monitoring agent activities.

**Technology**:
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui
- Zustand (state management)
- @dnd-kit (drag-and-drop)
- date-fns, recharts

**Features**:
- **Kanban Board**: Drag-and-drop task management
- **Task Cards**: Show priority, agent, progress, files
- **Task Detail Modal**: Tabs for code changes, timeline, comments, details
- **Code Diff Viewer**: Syntax-highlighted unified/side-by-side diffs
- **Agent Sidebar**: Active agents and their current tasks
- **Real-time Updates**: WebSocket integration for live data
- **Filtering**: By agent, priority, status, tags
- **Search**: Full-text search across tasks

**Component Structure**:
```
components/
├── kanban/
│   ├── KanbanBoard.tsx      # Main board container
│   ├── KanbanColumn.tsx     # Single column (TODO, Claimed, etc.)
│   └── TaskCard.tsx         # Individual task card
├── task/
│   ├── TaskDetailModal.tsx  # Modal with tabs
│   ├── TaskDetailsView.tsx  # Details tab (metadata)
│   ├── DiffViewer.tsx       # Code diff viewing
│   ├── TaskTimeline.tsx     # Activity log
│   └── TaskComments.tsx     # Comment thread
├── agent/
│   ├── AgentList.tsx        # Sidebar with active agents
│   └── AgentCard.tsx        # Individual agent status
└── ui/                      # shadcn/ui components
```

---

### 4. Shared Package

**Location**: `packages/shared`

**Purpose**: Shared TypeScript types and utilities.

**Contents**:
- `types.ts` - All interface definitions
- Utility functions
- Constants
- Validation schemas

---

## Data Flow

### Agent Reports Activity

```
┌──────────────┐
│  AI Agent    │
│ (Claude Code)│
└──────┬───────┘
       │ MCP Call: start_task()
       ▼
┌──────────────┐
│  MCP Server  │
│              │
│ 1. Validate  │
│ 2. Save to   │
│    SQLite    │
│ 3. Emit      │
│    event     │
└──────┬───────┘
       │ Event: task:created
       ▼
┌──────────────┐
│  WebSocket   │
│   Server     │
│              │
│ Broadcast to │
│  all clients │
└──────┬───────┘
       │ WebSocket Message
       ▼
┌──────────────┐
│  Dashboard   │
│  (Browser)   │
│              │
│ Update       │
│ Zustand      │
│ store        │
└──────────────┘
       │
       ▼
   Kanban board
  shows new task
   in "Claimed"
     column
```

### User Clicks Task

```
┌──────────────┐
│  Dashboard   │
│  (Browser)   │
└──────┬───────┘
       │ Click task card
       ▼
┌──────────────┐
│ TaskCard.tsx │
│              │
│ onClick() →  │
│ Open modal   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│TaskDetailModal│
│              │
│ Tabs:        │
│ • Code       │
│   Changes    │
│ • Timeline   │
│ • Comments   │
│ • Details    │
└──────┬───────┘
       │ User selects "Code Changes" tab
       ▼
┌──────────────┐
│ DiffViewer   │
│              │
│ Shows:       │
│ • Files      │
│ • Diffs      │
│ • +/- lines  │
└──────────────┘
```

---

## Database Schema

### Core Tables

**boards** - Kanban boards
```sql
id, name, description, project_path, repository, settings, created_at, updated_at
```

**board_columns** - Kanban columns (TODO, Claimed, In Progress, Review, Done)
```sql
id, board_id, name, position, wip_limit, color
```

**agents** - Registered AI agents
```sql
id, name, type, status, capabilities, tasks_completed, success_rate, last_heartbeat
```

**agent_tasks** - Tasks being worked on
```sql
id, board_id, title, description, importance, status, agent_id, agent_name,
created_at, claimed_at, started_at, completed_at, updated_at,
progress, current_action, files, lines_changed, tokens_used,
parent_task_id, blocked_by, tags, error_message
```

**sessions** - Agent work sessions
```sql
id, agent_id, board_id, started_at, ended_at, last_heartbeat, is_active,
tasks_created, tasks_completed, tasks_failed, total_tokens_used
```

**activity_logs** - Full audit trail
```sql
id, timestamp, event_type, agent_id, agent_name, task_id, board_id,
message, details, before_state, after_state
```

**code_changes** - Code diffs for tasks
```sql
id, task_id, file_path, change_type, old_path, diff, language,
lines_added, lines_deleted, created_at
```

**comments** - Inter-agent/user comments
```sql
id, task_id, author, author_type, content, created_at, parent_comment_id
```

---

## Task Information Model

### Required Fields (Per Blueprint)

Each task card and detail view displays:

| Field | Type | Description | Display Location |
|-------|------|-------------|------------------|
| **Task Name** | string | Clear description of work | Card title, modal header |
| **Description** | markdown | Detailed explanation | Details tab |
| **Priority** | enum | critical\|high\|medium\|low | Card badge, details |
| **Created Date** | timestamp | When task was created | Details tab |
| **Updated Date** | timestamp | Last modification time | Card footer, details |
| **Claimed By** | string | Agent name + type | Card subtitle, details |
| **Status** | enum | todo\|claimed\|in_progress\|review\|done | Kanban column |
| **Files Modified** | string[] | List of file paths | Card, details tab |
| **Code Changes** | CodeChange[] | Full diffs | Code Changes tab |
| **Progress** | number | 0-100 percentage | Progress bar on card |
| **Timeline** | timestamps | claimed→started→completed | Details tab |
| **Statistics** | object | Lines changed, tokens used | Details tab |

---

## Real-time Architecture

### WebSocket Flow

1. **Dashboard loads**: Opens WebSocket connection to `ws://localhost:8080`
2. **Subscribe**: Client sends `{ type: 'subscribe', boardId: 'main' }`
3. **Agent activity**: Agent calls MCP tool → MCP server emits event
4. **Broadcast**: WebSocket server receives event → broadcasts to subscribed clients
5. **UI Update**: Dashboard receives message → updates Zustand store → React re-renders

### Optimizations

- **Batching**: Multiple updates within 100ms window are batched
- **Debouncing**: Progress updates debounced to max 1 per second
- **Selective Updates**: Only send changed fields, not entire objects
- **Compression**: WebSocket compression enabled for large diffs
- **Reconnection**: Auto-reconnect with exponential backoff

---

## Code Diff Integration

### Agent Side

Agents capture code changes in two ways:

**Option 1: Git Integration**
```typescript
import { execSync } from 'child_process';

const diff = execSync(`git diff HEAD -- "${file}"`, { encoding: 'utf-8' });

await mcp.callTool('update_task_progress', {
  taskId: 'task-123',
  codeChanges: [{
    filePath: 'src/auth.ts',
    changeType: 'modified',
    diff: diff,
    language: 'typescript'
  }]
});
```

**Option 2: In-Memory Tracking**
```typescript
class AgentFileTracker {
  async writeFile(path: string, newContent: string) {
    const oldContent = this.originalContent.get(path);
    const diff = diffLines(oldContent, newContent);
    // Store diff for later reporting
  }
}
```

### Dashboard Side

**DiffViewer.tsx**:
- Parses unified diff format
- Syntax highlights code
- Shows +/- line numbers
- Expandable file tree
- Side-by-side or unified view

**Technologies**:
- `diff` library for parsing
- `react-syntax-highlighter` for highlighting
- `refractor` for language detection

---

## Deployment

### Development Mode

```bash
# Terminal 1: MCP Server
cd packages/mcp-server
npm run dev

# Terminal 2: API + WebSocket Server
cd packages/api-server
npm run dev

# Terminal 3: Dashboard
cd packages/dashboard
npm run dev
```

**Ports**:
- MCP Server: stdio (for Claude Desktop)
- API Server: `http://localhost:3000`
- WebSocket: `ws://localhost:8080`
- Dashboard: `http://localhost:5173`

### Production Mode

```bash
npm run build        # Build all packages
npm start            # Start API server (serves static dashboard + API + WebSocket)
```

**Production Setup**:
- Nginx reverse proxy
- SSL/TLS certificates
- Environment-based configuration
- Database backups
- Logging and monitoring

---

## Security Considerations

### Current (MVP)

- No authentication (localhost only)
- CORS enabled for development
- No data encryption at rest
- No rate limiting

### Future (Production)

- [ ] JWT-based authentication
- [ ] Role-based access control (RBAC)
- [ ] API rate limiting
- [ ] Database encryption
- [ ] Audit logging
- [ ] HTTPS enforcement
- [ ] Input sanitization
- [ ] SQL injection prevention (parameterized queries)

---

## Scalability

### Current Limitations (MVP)

- Single SQLite database (not distributed)
- In-process WebSocket server (doesn't scale horizontally)
- No caching layer
- No message queue

### Future Improvements

- [ ] PostgreSQL for multi-instance support
- [ ] Redis for caching and pub/sub
- [ ] Message queue (RabbitMQ, Redis) for event distribution
- [ ] Horizontal scaling with load balancer
- [ ] Database read replicas
- [ ] CDN for dashboard static assets

---

## Integration Points

### Claude Desktop

MCP server integrates via `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agent-kanban": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "DATABASE_PATH": "~/.agent-kanban/kanban.db"
      }
    }
  }
}
```

### Other Agents

Any agent that can make HTTP requests can integrate:

```typescript
// Custom agent integration
import { AgentKanbanClient } from 'agent-kanban-client';

const client = new AgentKanbanClient({
  apiUrl: 'http://localhost:3000',
  agentName: 'My Custom Agent'
});

await client.startTask({
  title: 'Build feature X',
  importance: 'high'
});
```

### CI/CD Pipelines

```yaml
# .github/workflows/deploy.yml
- name: Check agent kanban status
  run: |
    # Ensure no tasks are in progress before deploying
    curl http://kanban-api/api/boards/main \
      | jq -e '.statistics.inProgressCount == 0'
```

---

## Monitoring & Observability

### Metrics to Track

**Agent Metrics**:
- Tasks completed per agent
- Average task duration
- Success vs failure rate
- Tokens used per task
- Agent uptime/availability

**System Metrics**:
- WebSocket connections
- API request latency
- Database query performance
- Event throughput
- Error rates

**Business Metrics**:
- Total tasks created
- Completion rate
- Time in each status
- Most active agents
- Peak usage times

### Logging Strategy

**Levels**:
- ERROR: Agent failures, system errors
- WARN: Timeouts, retries, deprecated features
- INFO: Task lifecycle events, agent registration
- DEBUG: Detailed execution logs

**Format**:
```json
{
  "timestamp": "2026-02-25T10:30:00Z",
  "level": "INFO",
  "service": "mcp-server",
  "event": "task:created",
  "taskId": "task-123",
  "agentId": "agent-456",
  "boardId": "main"
}
```

---

## Testing Strategy

### Unit Tests

- Service layer logic
- Repository methods
- Utility functions
- Validation schemas

### Integration Tests

- MCP tool handlers (end-to-end MCP calls)
- API endpoints
- WebSocket events
- Database operations

### E2E Tests

- Full agent workflow (register → session → task → complete)
- Dashboard interactions (Playwright)
- Real-time updates
- Multi-agent scenarios

### Performance Tests

- Load testing WebSocket connections
- Database query performance
- Concurrent agent operations
- Large diff rendering

---

## Future Enhancements

### Phase 2 (Post-MVP)

- [ ] Multi-board support
- [ ] Agent performance analytics dashboard
- [ ] GitHub integration (link commits, create issues)
- [ ] Slack/Discord notifications
- [ ] Export data (JSON, CSV, PDF reports)

### Phase 3 (Advanced)

- [ ] Agent collaboration workflows
- [ ] Task templates and automation
- [ ] Custom workflows beyond kanban
- [ ] Plugin system for extensibility
- [ ] Mobile app (React Native)
- [ ] Voice/video annotations on tasks
- [ ] AI-powered insights and recommendations

---

## Decision Log

### Why SQLite?

**Pros**: Embedded, no setup, ACID guarantees, simple deployment
**Cons**: Not distributed, limited concurrency
**Decision**: Use for MVP, migrate to PostgreSQL if multi-instance needed

### Why MCP?

**Pros**: Official protocol for Claude, future-proof, tool-based architecture
**Cons**: Limited ecosystem, new protocol
**Decision**: MCP is the right abstraction for agent instrumentation

### Why React over Vue/Svelte?

**Pros**: Large ecosystem, shadcn/ui components, team familiarity
**Cons**: Larger bundle size
**Decision**: React provides best DX and component library

### Why Zustand over Redux?

**Pros**: Simple, minimal boilerplate, good TypeScript support
**Cons**: Less tooling than Redux
**Decision**: Zustand is sufficient for this use case

### Why WebSocket over SSE?

**Pros**: Bi-directional, better for real-time
**Cons**: More complex than SSE
**Decision**: WebSocket provides better UX for interactive kanban

---

## Conclusion

**Agent Track Dashboard** provides developers with full transparency into AI agent activities through a real-time web dashboard. By combining MCP-based instrumentation, WebSocket real-time updates, and an intuitive kanban interface, the system enables effective monitoring, coordination, and auditing of multi-agent workflows.

The architecture is designed for:
- ✅ **Simplicity**: Easy to understand and modify
- ✅ **Real-time**: Instant updates via WebSocket
- ✅ **Scalability**: Can grow from single developer to team
- ✅ **Extensibility**: Plugin-based architecture for future features
- ✅ **Developer Experience**: Type-safe, well-documented, modern stack
