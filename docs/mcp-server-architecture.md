# MCP Server Architecture

## Overview

The MCP server is the **instrumentation layer** that AI agents use to report their activities. It exposes tools that agents can call to create tasks, update progress, and communicate status.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      AI Agents                               │
│  (Claude Code, Cursor, Aider, custom agents, etc.)          │
└──────────────┬──────────────────────────────────────────────┘
               │ MCP Protocol (stdio/SSE)
               │
┌──────────────▼──────────────────────────────────────────────┐
│              MCP Server (agent-kanban-mcp)                   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         MCP Protocol Layer                           │   │
│  │  (@modelcontextprotocol/sdk + transport)            │   │
│  └───────────────────┬─────────────────────────────────┘   │
│                      │                                       │
│  ┌───────────────────▼─────────────────────────────────┐   │
│  │         Tool Handler Layer                           │   │
│  │  (Zod validation + routing)                         │   │
│  └───────────────────┬─────────────────────────────────┘   │
│                      │                                       │
│  ┌───────────────────▼─────────────────────────────────┐   │
│  │         Service Layer                                │   │
│  │  (Business logic for tasks, agents, boards)         │   │
│  └───────────────────┬─────────────────────────────────┘   │
│                      │                                       │
│  ┌───────────────────▼─────────────────────────────────┐   │
│  │         Data Access Layer                            │   │
│  │  (SQLite with repositories)                         │   │
│  └───────────────────┬─────────────────────────────────┘   │
│                      │                                       │
│  ┌───────────────────▼─────────────────────────────────┐   │
│  │         Event Emitter                                │   │
│  │  (Broadcasts changes to WebSocket server)          │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │ Events (task_created, task_updated, etc.)
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              WebSocket Server                                │
│  (Real-time updates to web dashboard)                       │
└───────────────────────┬─────────────────────────────────────┘
                        │ WebSocket
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              Web Dashboard                                   │
│  (React SPA with real-time kanban board)                    │
└─────────────────────────────────────────────────────────────┘
```

## MCP Tools for Agents

### Board Management

#### `create_board`
Create a new kanban board.

```typescript
{
  name: 'create_board',
  description: 'Create a new kanban board for tracking agent activities',
  inputSchema: z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    projectPath: z.string().optional(),
    repository: z.string().optional(),
  }),
}

// Example usage by agent
const result = await mcp.callTool('create_board', {
  name: 'Feature Development - Auth Refactor',
  description: 'Board for tracking auth module refactoring tasks',
  projectPath: '/Users/dev/myapp',
  repository: 'https://github.com/user/myapp'
});
// Returns: { boardId: 'board-123', columns: [...] }
```

#### `list_boards`
Get all available boards.

```typescript
{
  name: 'list_boards',
  description: 'List all kanban boards',
  inputSchema: z.object({}),
}
```

#### `get_board`
Get detailed board information.

```typescript
{
  name: 'get_board',
  description: 'Get detailed board information including tasks and agents',
  inputSchema: z.object({
    boardId: z.string(),
  }),
}
```

---

### Agent Registration

#### `register_agent`
Register an agent with the system.

```typescript
{
  name: 'register_agent',
  description: 'Register an AI agent with its capabilities',
  inputSchema: z.object({
    name: z.string(),
    type: z.string(),
    capabilities: z.array(z.string()).optional(),
    maxConcurrentTasks: z.number().default(1),
  }),
}

// Example
await mcp.callTool('register_agent', {
  name: 'Claude Code',
  type: 'code-generator',
  capabilities: ['typescript', 'react', 'nodejs', 'testing'],
  maxConcurrentTasks: 3
});
// Returns: { agentId: 'agent-456' }
```

#### `heartbeat`
Send heartbeat to indicate agent is alive.

```typescript
{
  name: 'heartbeat',
  description: 'Send heartbeat signal to indicate agent is active',
  inputSchema: z.object({
    agentId: z.string(),
    sessionId: z.string().optional(),
  }),
}

// Agents should call this every 30-60 seconds
await mcp.callTool('heartbeat', { agentId: 'agent-456' });
```

---

### Session Management

#### `start_session`
Start a work session.

```typescript
{
  name: 'start_session',
  description: 'Start an agent work session on a board',
  inputSchema: z.object({
    agentId: z.string(),
    boardId: z.string(),
    metadata: z.record(z.unknown()).optional(),
  }),
}

// Example
const session = await mcp.callTool('start_session', {
  agentId: 'agent-456',
  boardId: 'board-123',
  metadata: {
    userRequest: 'Refactor auth module',
    priority: 'high'
  }
});
// Returns: { sessionId: 'session-789' }
```

#### `end_session`
End a work session.

```typescript
{
  name: 'end_session',
  description: 'End an agent work session',
  inputSchema: z.object({
    sessionId: z.string(),
    summary: z.string().optional(),
  }),
}
```

---

### Task Management (Core Features)

#### `start_task`
Create and claim a new task.

```typescript
{
  name: 'start_task',
  description: 'Create a new task and claim it',
  inputSchema: z.object({
    boardId: z.string(),
    sessionId: z.string(),
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    importance: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
    estimatedDuration: z.number().optional(), // seconds
    tags: z.array(z.string()).optional(),
    parentTaskId: z.string().optional(),
  }),
}

// Example
const task = await mcp.callTool('start_task', {
  boardId: 'board-123',
  sessionId: 'session-789',
  title: 'Refactor authentication module',
  description: 'Split auth.ts into smaller, testable modules',
  importance: 'high',
  estimatedDuration: 300, // 5 minutes
  tags: ['refactoring', 'auth', 'typescript']
});
// Returns: { taskId: 'task-123', status: 'claimed' }

// Task immediately appears in "Claimed" column on dashboard
```

#### `update_task_status`
Move task to a different status.

```typescript
{
  name: 'update_task_status',
  description: 'Update task status (move between kanban columns)',
  inputSchema: z.object({
    taskId: z.string(),
    status: z.enum(['todo', 'claimed', 'in_progress', 'review', 'done']),
    currentAction: z.string().optional(),
  }),
}

// Example: Agent starts working
await mcp.callTool('update_task_status', {
  taskId: 'task-123',
  status: 'in_progress',
  currentAction: 'Analyzing current auth.ts structure'
});

// Task moves from "Claimed" → "In Progress" on dashboard
```

#### `update_task_progress`
Report progress on a task.

```typescript
{
  name: 'update_task_progress',
  description: 'Update task progress and current action',
  inputSchema: z.object({
    taskId: z.string(),
    progress: z.number().min(0).max(100).optional(),
    currentAction: z.string().optional(),
    files: z.array(z.string()).optional(),
    linesChanged: z.object({
      added: z.number(),
      removed: z.number(),
    }).optional(),
    tokensUsed: z.number().optional(),
  }),
}

// Example: Agent reports progress
await mcp.callTool('update_task_progress', {
  taskId: 'task-123',
  progress: 40,
  currentAction: 'Creating separate modules for login, logout, session',
  files: [
    'src/auth/login.ts',
    'src/auth/logout.ts',
    'src/auth/session.ts'
  ],
  linesChanged: { added: 120, removed: 80 }
});

// Dashboard shows live progress bar and updated file list
```

#### `complete_task`
Mark task as complete.

```typescript
{
  name: 'complete_task',
  description: 'Mark a task as successfully completed',
  inputSchema: z.object({
    taskId: z.string(),
    summary: z.string().optional(),
    tokensUsed: z.number().optional(),
  }),
}

// Example
await mcp.callTool('complete_task', {
  taskId: 'task-123',
  summary: 'Successfully refactored auth module into 5 smaller modules with tests',
  tokensUsed: 18500
});

// Task moves to "Done" column with completion animation
```

#### `fail_task`
Mark task as failed.

```typescript
{
  name: 'fail_task',
  description: 'Mark a task as failed with error details',
  inputSchema: z.object({
    taskId: z.string(),
    errorMessage: z.string(),
    willRetry: z.boolean().default(false),
  }),
}

// Example
await mcp.callTool('fail_task', {
  taskId: 'task-123',
  errorMessage: 'Cannot refactor: circular dependency detected in auth.ts',
  willRetry: false
});

// Task shows error state in dashboard with red indicator
```

#### `pause_task`
Pause a task (waiting for external input).

```typescript
{
  name: 'pause_task',
  description: 'Pause a task (e.g., waiting for user input)',
  inputSchema: z.object({
    taskId: z.string(),
    reason: z.string(),
  }),
}
```

#### `resume_task`
Resume a paused task.

```typescript
{
  name: 'resume_task',
  description: 'Resume a paused task',
  inputSchema: z.object({
    taskId: z.string(),
  }),
}
```

---

### Task Collaboration

#### `add_comment`
Add a comment to a task.

```typescript
{
  name: 'add_comment',
  description: 'Add a comment to a task for inter-agent communication',
  inputSchema: z.object({
    taskId: z.string(),
    author: z.string(),
    content: z.string(),
  }),
}

// Example: Agent communicates with another agent
await mcp.callTool('add_comment', {
  taskId: 'task-123',
  author: 'Claude Code',
  content: 'I need the type definitions from task-122 before I can complete this task'
});
```

#### `set_task_blocker`
Mark a task as blocked by another task.

```typescript
{
  name: 'set_task_blocker',
  description: 'Mark a task as blocked by other tasks',
  inputSchema: z.object({
    taskId: z.string(),
    blockedBy: z.array(z.string()),
  }),
}

// Example
await mcp.callTool('set_task_blocker', {
  taskId: 'task-123',
  blockedBy: ['task-122'] // This task is blocked by task-122
});

// Dashboard shows task with "blocked" indicator
```

---

### Query Tools

#### `get_my_tasks`
Get all tasks for this agent.

```typescript
{
  name: 'get_my_tasks',
  description: 'Get all tasks assigned to this agent',
  inputSchema: z.object({
    agentId: z.string(),
    boardId: z.string().optional(),
    status: z.enum(['active', 'completed', 'all']).default('active'),
  }),
}
```

#### `get_available_tasks`
Get unclaimed tasks that agent can work on.

```typescript
{
  name: 'get_available_tasks',
  description: 'Get unclaimed tasks available for claiming',
  inputSchema: z.object({
    boardId: z.string(),
    importance: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  }),
}
```

#### `get_blocked_tasks`
Get all blocked tasks.

```typescript
{
  name: 'get_blocked_tasks',
  description: 'Get all tasks that are blocked by dependencies',
  inputSchema: z.object({
    boardId: z.string(),
  }),
}
```

---

## Implementation Example

### MCP Server Entry Point

```typescript
// src/mcp/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { EventEmitter } from 'events';
import { TOOLS } from './tools.js';
import { TaskService } from '../services/task-service.js';
import { BoardService } from '../services/board-service.js';
import { AgentService } from '../services/agent-service.js';
import { SessionService } from '../services/session-service.js';

export class AgentKanbanMCPServer extends EventEmitter {
  private server: Server;
  private taskService: TaskService;
  private boardService: BoardService;
  private agentService: AgentService;
  private sessionService: SessionService;

  constructor() {
    super();

    this.server = new Server(
      {
        name: 'agent-kanban-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize services
    this.taskService = new TaskService(this);
    this.boardService = new BoardService(this);
    this.agentService = new AgentService(this);
    this.sessionService = new SessionService(this);

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Find and validate tool
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      const validatedArgs = tool.inputSchema.parse(args);

      // Route to appropriate service
      const result = await this.routeToolCall(name, validatedArgs);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    });
  }

  private async routeToolCall(name: string, args: any): Promise<any> {
    switch (name) {
      // Board management
      case 'create_board':
        return this.boardService.createBoard(args);
      case 'list_boards':
        return this.boardService.listBoards();
      case 'get_board':
        return this.boardService.getBoard(args.boardId);

      // Agent registration
      case 'register_agent':
        return this.agentService.registerAgent(args);
      case 'heartbeat':
        return this.agentService.heartbeat(args.agentId, args.sessionId);

      // Session management
      case 'start_session':
        return this.sessionService.startSession(args);
      case 'end_session':
        return this.sessionService.endSession(args.sessionId, args.summary);

      // Task management
      case 'start_task':
        return this.taskService.startTask(args);
      case 'update_task_status':
        return this.taskService.updateStatus(args);
      case 'update_task_progress':
        return this.taskService.updateProgress(args);
      case 'complete_task':
        return this.taskService.completeTask(args);
      case 'fail_task':
        return this.taskService.failTask(args);
      case 'pause_task':
        return this.taskService.pauseTask(args);
      case 'resume_task':
        return this.taskService.resumeTask(args.taskId);

      // Task collaboration
      case 'add_comment':
        return this.taskService.addComment(args);
      case 'set_task_blocker':
        return this.taskService.setBlockers(args);

      // Query tools
      case 'get_my_tasks':
        return this.taskService.getAgentTasks(args);
      case 'get_available_tasks':
        return this.taskService.getAvailableTasks(args);
      case 'get_blocked_tasks':
        return this.taskService.getBlockedTasks(args.boardId);

      default:
        throw new Error(`Unimplemented tool: ${name}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Agent Kanban MCP Server running on stdio');
  }
}

// Start server
const server = new AgentKanbanMCPServer();
server.run().catch(console.error);
```

### Service Layer Example

```typescript
// src/services/task-service.ts
import { EventEmitter } from 'events';
import { TaskRepository } from '../repositories/task-repository.js';
import { ActivityLogRepository } from '../repositories/activity-log-repository.js';
import type { AgentTask } from '../types.js';

export class TaskService {
  private taskRepo: TaskRepository;
  private activityRepo: ActivityLogRepository;
  private eventBus: EventEmitter;

  constructor(eventBus: EventEmitter) {
    this.taskRepo = new TaskRepository();
    this.activityRepo = new ActivityLogRepository();
    this.eventBus = eventBus;
  }

  async startTask(args: any): Promise<AgentTask> {
    // Create task in "claimed" status
    const task: AgentTask = {
      id: generateId(),
      boardId: args.boardId,
      title: args.title,
      description: args.description,
      importance: args.importance || 'medium',
      status: 'claimed',
      agentId: await this.getAgentIdFromSession(args.sessionId),
      agentName: await this.getAgentName(args.sessionId),
      agentType: await this.getAgentType(args.sessionId),
      sessionId: args.sessionId,
      createdAt: new Date(),
      claimedAt: new Date(),
      updatedAt: new Date(),
      estimatedDuration: args.estimatedDuration,
      tags: args.tags || [],
      parentTaskId: args.parentTaskId,
      blockedBy: [],
    };

    // Save to database
    await this.taskRepo.create(task);

    // Log activity
    await this.activityRepo.log({
      eventType: 'task_created',
      agentId: task.agentId,
      agentName: task.agentName,
      taskId: task.id,
      boardId: task.boardId,
      message: `Created task: ${task.title}`,
      timestamp: new Date(),
    });

    // Emit event for WebSocket broadcast
    this.eventBus.emit('task:created', task);

    return task;
  }

  async updateStatus(args: any): Promise<AgentTask> {
    const task = await this.taskRepo.get(args.taskId);
    if (!task) throw new Error('Task not found');

    const oldStatus = task.status;
    const newStatus = args.status;

    // Update task
    await this.taskRepo.update(args.taskId, {
      status: newStatus,
      currentAction: args.currentAction,
      updatedAt: new Date(),
      ...(newStatus === 'in_progress' && { startedAt: new Date() }),
    });

    // Log activity
    await this.activityRepo.log({
      eventType: 'task_moved',
      agentId: task.agentId,
      agentName: task.agentName,
      taskId: task.id,
      boardId: task.boardId,
      message: `Moved task from ${oldStatus} to ${newStatus}`,
      timestamp: new Date(),
      details: { from: oldStatus, to: newStatus },
    });

    // Emit event
    const updatedTask = await this.taskRepo.get(args.taskId);
    this.eventBus.emit('task:updated', updatedTask);

    return updatedTask!;
  }

  async updateProgress(args: any): Promise<AgentTask> {
    const task = await this.taskRepo.get(args.taskId);
    if (!task) throw new Error('Task not found');

    await this.taskRepo.update(args.taskId, {
      progress: args.progress,
      currentAction: args.currentAction,
      files: args.files,
      linesChanged: args.linesChanged,
      tokensUsed: args.tokensUsed,
      updatedAt: new Date(),
    });

    // Log activity
    await this.activityRepo.log({
      eventType: 'task_progressed',
      agentId: task.agentId,
      agentName: task.agentName,
      taskId: task.id,
      boardId: task.boardId,
      message: `Progress: ${args.progress}% - ${args.currentAction}`,
      timestamp: new Date(),
      details: args,
    });

    // Emit event
    const updatedTask = await this.taskRepo.get(args.taskId);
    this.eventBus.emit('task:updated', updatedTask);

    return updatedTask!;
  }

  async completeTask(args: any): Promise<AgentTask> {
    const task = await this.taskRepo.get(args.taskId);
    if (!task) throw new Error('Task not found');

    const completedAt = new Date();
    const actualDuration = task.startedAt
      ? Math.floor((completedAt.getTime() - task.startedAt.getTime()) / 1000)
      : undefined;

    await this.taskRepo.update(args.taskId, {
      status: 'done',
      progress: 100,
      completedAt,
      actualDuration,
      tokensUsed: args.tokensUsed || task.tokensUsed,
      updatedAt: new Date(),
    });

    // Log activity
    await this.activityRepo.log({
      eventType: 'task_completed',
      agentId: task.agentId,
      agentName: task.agentName,
      taskId: task.id,
      boardId: task.boardId,
      message: `Completed: ${task.title}`,
      timestamp: new Date(),
      details: { summary: args.summary, actualDuration, tokensUsed: args.tokensUsed },
    });

    // Emit event
    const updatedTask = await this.taskRepo.get(args.taskId);
    this.eventBus.emit('task:completed', updatedTask);

    return updatedTask!;
  }

  // ... other methods
}
```

## Event System

The MCP server uses events to communicate with the WebSocket server:

```typescript
// Events emitted by services
eventBus.emit('task:created', task);
eventBus.emit('task:updated', task);
eventBus.emit('task:moved', { taskId, fromStatus, toStatus });
eventBus.emit('task:completed', task);
eventBus.emit('task:failed', task);
eventBus.emit('agent:registered', agent);
eventBus.emit('agent:status_changed', agent);
eventBus.emit('activity:logged', log);
eventBus.emit('comment:added', comment);

// WebSocket server listens to these events and broadcasts to clients
```

## Configuration

### Claude Desktop Integration

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "agent-kanban": {
      "command": "node",
      "args": ["/path/to/agent-kanban-mcp/dist/index.js"],
      "env": {
        "DATABASE_PATH": "~/.agent-kanban/kanban.db"
      }
    }
  }
}
```

### Environment Variables

```bash
# .env
DATABASE_PATH=./data/kanban.db
WEBSOCKET_PORT=8080
LOG_LEVEL=info
AUTO_HEARTBEAT_CLEANUP=true
HEARTBEAT_TIMEOUT_MS=120000  # 2 minutes
```

## Summary

The MCP server provides:
- ✅ **20+ tools** for comprehensive agent instrumentation
- ✅ **Event-driven architecture** for real-time updates
- ✅ **Typed schemas** with Zod validation
- ✅ **Service layer** for business logic
- ✅ **Event emitter** for WebSocket integration
- ✅ **Complete lifecycle** management (register → session → tasks → completion)
