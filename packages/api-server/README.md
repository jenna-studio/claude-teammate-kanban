# API Server

REST API and WebSocket server for the Agent Track Dashboard.

## Overview

The API Server provides:

- **REST API** - HTTP endpoints for querying boards, tasks, and agents
- **WebSocket Server** - Real-time updates for dashboard clients
- **Database Access** - Shared SQLite database with MCP server
- **Type Safety** - Full TypeScript with proper interfaces
- **Error Handling** - Comprehensive error handling and validation

## Architecture

```
src/
├── index.ts              # Main entry point
├── api.ts                # Express server setup
├── websocket.ts          # WebSocket server
├── database.ts           # Database connection
├── middleware/           # Express middleware
│   ├── errorHandler.ts   # Error handling
│   └── validation.ts     # Request validation
├── routes/               # API route handlers
│   ├── boards.ts         # Board endpoints
│   ├── tasks.ts          # Task endpoints
│   └── agents.ts         # Agent endpoints
└── repositories/         # Data access layer
    ├── BoardRepository.ts
    ├── TaskRepository.ts
    └── AgentRepository.ts
```

## API Endpoints

### Boards

- `GET /api/boards` - Get all boards
- `GET /api/boards/:id` - Get board with details (columns, tasks, agents, statistics)
- `GET /api/boards/:id/statistics` - Get board statistics

### Tasks

- `GET /api/tasks` - Get all tasks (with optional filters)
- `GET /api/tasks/:id` - Get task by ID with code changes
- `GET /api/tasks/:id/comments` - Get comments for a task
- `POST /api/tasks/:id/comments` - Add a comment to a task
- `GET /api/tasks/:id/code-changes` - Get code changes for a task

### Agents

- `GET /api/agents` - Get all agents
- `GET /api/agents/active` - Get active agents (with recent heartbeat)
- `GET /api/agents/:id` - Get agent by ID
- `GET /api/agents/:id/tasks` - Get tasks for an agent
- `GET /api/agents/:id/statistics` - Get agent statistics

### Health Check

- `GET /health` - Server health check

## WebSocket Events

### Client → Server

```typescript
// Subscribe to board updates
{ type: 'subscribe', boardId: 'board-123' }

// Unsubscribe from board updates
{ type: 'unsubscribe', boardId: 'board-123' }

// Keep connection alive
{ type: 'heartbeat' }
```

### Server → Client

```typescript
// Task created
{ type: 'task_created', task: {...} }

// Task updated
{ type: 'task_updated', task: {...} }

// Task moved to different status
{ type: 'task_moved', taskId: '...', fromStatus: '...', toStatus: '...' }

// Task deleted
{ type: 'task_deleted', taskId: '...' }

// Agent status changed
{ type: 'agent_status_changed', agent: {...} }

// Activity logged
{ type: 'activity_logged', log: {...} }

// Comment added
{ type: 'comment_added', comment: {...} }
```

## Configuration

Environment variables:

```bash
# API Server port
API_PORT=3000

# WebSocket server port
WEBSOCKET_PORT=8080

# Database path (shared with MCP server)
DATABASE_PATH=./data/kanban.db

# CORS origin (comma-separated for multiple origins)
CORS_ORIGIN=http://localhost:5173

# Environment (development, production, test)
NODE_ENV=development
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Type check
npm run type-check
```

## Key Features

### 1. Repository Pattern

Data access is abstracted through repository classes:

```typescript
const boardRepo = new BoardRepository(db);
const board = boardRepo.getById('board-123');
```

### 2. Request Validation

All inputs are validated using Zod schemas:

```typescript
router.post('/tasks/:id/comments',
  validate(schemas.addComment, 'body'),
  asyncHandler(async (req, res) => {
    // Request body is validated and typed
  })
);
```

### 3. Error Handling

Comprehensive error handling with proper HTTP status codes:

```typescript
throw new HttpError(404, 'Task not found');
throw new HttpError(400, 'Validation failed', errors);
```

### 4. Type Safety

Full TypeScript coverage with shared types from `@agent-track/shared`:

```typescript
import { AgentTask, Board, Agent } from '@agent-track/shared';
```

### 5. Real-time Updates

WebSocket server manages subscriptions and broadcasts:

```typescript
wsServer.broadcast(boardId, {
  type: 'task_updated',
  task: updatedTask
});
```

### 6. Database Optimization

- WAL mode for better concurrency
- 64MB cache for improved performance
- Proper indexes and foreign keys
- Connection pooling

### 7. Graceful Shutdown

Proper cleanup on server shutdown:

```typescript
process.on('SIGINT', async () => {
  await wsServer.close();
  closeDatabase();
  process.exit(0);
});
```

## API Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "details": {} // Optional error details
  }
}
```

## Security

Current implementation (MVP):

- CORS enabled for dashboard
- Request size limits (10MB for code diffs)
- Input validation with Zod
- Parameterized SQL queries

Future enhancements:

- JWT authentication
- Rate limiting
- HTTPS enforcement
- API keys for external integrations

## Performance

- Efficient SQL queries with proper indexing
- JSON parsing caching
- WebSocket message batching
- Connection keep-alive
- Database WAL mode for concurrent reads

## Monitoring

Health check endpoint provides:

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-02-25T10:30:00Z",
  "uptime": 3600
}
```

Additional monitoring:

- Request logging via Morgan
- WebSocket connection tracking
- Database connection status
- Error logging with stack traces

## Integration

The API Server integrates with:

1. **MCP Server** - Shares the same SQLite database
2. **Dashboard** - Serves data via REST API
3. **WebSocket Clients** - Broadcasts real-time updates

## Troubleshooting

### Database locked

If you see "database is locked" errors:

- Ensure only one process is writing at a time
- WAL mode should prevent most locking issues
- Check for long-running transactions

### WebSocket connection issues

- Verify firewall allows WebSocket port
- Check CORS settings
- Ensure heartbeat messages are being sent
- Monitor client timeout settings

### API errors

- Check logs for detailed error messages
- Verify database is initialized
- Ensure all environment variables are set
- Test with curl or Postman first
