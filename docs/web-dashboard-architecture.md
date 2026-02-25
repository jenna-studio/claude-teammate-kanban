# Web Dashboard Architecture

## Overview

The web dashboard is a **real-time React application** that visualizes agent activities as an interactive kanban board. It connects to the MCP server via WebSocket for live updates.

## Technology Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand (lightweight, simple)
- **Real-time**: Native WebSocket API
- **Drag & Drop**: @dnd-kit/core (modern, accessible)
- **Charts**: Recharts (for analytics)
- **Date/Time**: date-fns
- **Routing**: React Router v6

### Backend (API Server)
- **Framework**: Express.js
- **WebSocket**: ws library
- **Database**: Shared SQLite with MCP server
- **API**: RESTful + WebSocket

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser                                  │
│                                                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │          React Application                          │    │
│  │                                                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │    │
│  │  │ Kanban Board │  │ Task Details │  │Analytics │ │    │
│  │  │  Component   │  │    Modal     │  │Dashboard │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────┘ │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │        Zustand State Store                    │  │    │
│  │  │  (boards, tasks, agents, filters)            │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │        WebSocket Client                       │  │    │
│  │  │  (auto-reconnect, message queue)             │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────┘    │
└────────────┬────────────────────┬───────────────────────────┘
             │                    │
             │ HTTP/REST          │ WebSocket
             │                    │
┌────────────▼────────────────────▼───────────────────────────┐
│                 API + WebSocket Server                       │
│                                                               │
│  ┌─────────────────────┐      ┌─────────────────────────┐  │
│  │   REST API          │      │  WebSocket Server       │  │
│  │   (Express)         │      │  (ws library)           │  │
│  │                     │      │                         │  │
│  │  GET /api/boards    │      │  Events:                │  │
│  │  GET /api/tasks     │      │  - task:created         │  │
│  │  GET /api/agents    │      │  - task:updated         │  │
│  │  POST /api/comments │      │  - task:moved           │  │
│  └─────────────────────┘      │  - agent:status_changed │  │
│                                └─────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Shared Database Access                        │  │
│  │         (SQLite via better-sqlite3)                  │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────┬───────────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────────┐
│                 SQLite Database                               │
│           (Shared with MCP Server)                           │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Application Structure

```
dashboard/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── index.html
└── src/
    ├── main.tsx                    # Entry point
    ├── App.tsx                     # Root component
    ├── routes/
    │   ├── BoardView.tsx           # Main kanban board view
    │   ├── Analytics.tsx           # Analytics dashboard
    │   └── Settings.tsx            # Settings page
    ├── components/
    │   ├── kanban/
    │   │   ├── KanbanBoard.tsx     # Main board container
    │   │   ├── KanbanColumn.tsx    # Single column
    │   │   ├── TaskCard.tsx        # Task card component
    │   │   └── NewTaskButton.tsx   # Create task UI
    │   ├── task/
    │   │   ├── TaskDetailModal.tsx # Task detail view
    │   │   ├── TaskProgress.tsx    # Progress bar
    │   │   ├── TaskComments.tsx    # Comments section
    │   │   └── TaskTimeline.tsx    # Activity timeline
    │   ├── agent/
    │   │   ├── AgentList.tsx       # Active agents sidebar
    │   │   ├── AgentCard.tsx       # Agent status card
    │   │   └── AgentMetrics.tsx    # Agent performance metrics
    │   ├── common/
    │   │   ├── Header.tsx
    │   │   ├── Sidebar.tsx
    │   │   ├── LoadingSpinner.tsx
    │   │   └── ErrorBoundary.tsx
    │   └── ui/                     # shadcn/ui components
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── dialog.tsx
    │       ├── badge.tsx
    │       └── ...
    ├── stores/
    │   ├── boardStore.ts           # Board state
    │   ├── taskStore.ts            # Task state
    │   ├── agentStore.ts           # Agent state
    │   └── uiStore.ts              # UI state (filters, modals, etc.)
    ├── hooks/
    │   ├── useWebSocket.ts         # WebSocket connection
    │   ├── useBoard.ts             # Board operations
    │   ├── useTasks.ts             # Task operations
    │   └── useRealtime.ts          # Real-time updates
    ├── services/
    │   ├── api.ts                  # REST API client
    │   ├── websocket.ts            # WebSocket client
    │   └── storage.ts              # LocalStorage utilities
    ├── types/
    │   └── index.ts                # TypeScript types
    └── utils/
        ├── date.ts                 # Date formatting
        ├── colors.ts               # Color utilities
        └── animations.ts           # Animation helpers
```

## Key Components

### 1. Kanban Board Component

```tsx
// src/components/kanban/KanbanBoard.tsx
import React from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { KanbanColumn } from './KanbanColumn';
import { useBoard } from '@/hooks/useBoard';
import { useTasks } from '@/hooks/useTasks';

export const KanbanBoard: React.FC<{ boardId: string }> = ({ boardId }) => {
  const { board, columns } = useBoard(boardId);
  const { tasks, moveTask } = useTasks(boardId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    moveTask(taskId, newStatus);
  };

  if (!board) return <div>Loading...</div>;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b p-4">
        <h1 className="text-2xl font-bold">{board.name}</h1>
        <p className="text-gray-600">{board.description}</p>
      </header>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <DndContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 p-6 h-full">
            {columns.map((column) => {
              const columnTasks = tasks.filter(
                (t) => t.status === column.id
              );

              return (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  tasks={columnTasks}
                />
              );
            })}
          </div>
        </DndContext>
      </div>
    </div>
  );
};
```

### 2. Kanban Column Component

```tsx
// src/components/kanban/KanbanColumn.tsx
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { TaskCard } from './TaskCard';
import type { BoardColumn, AgentTask } from '@/types';

interface Props {
  column: BoardColumn;
  tasks: AgentTask[];
}

export const KanbanColumn: React.FC<Props> = ({ column, tasks }) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const wipLimitReached = column.wipLimit && tasks.length >= column.wipLimit;

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col w-80 flex-shrink-0 bg-gray-50 rounded-lg
        ${isOver ? 'ring-2 ring-blue-500' : ''}
        ${wipLimitReached ? 'border-2 border-red-500' : ''}
      `}
    >
      {/* Column Header */}
      <div
        className="p-4 border-b"
        style={{ backgroundColor: column.color || '#f3f4f6' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{column.name}</h3>
          <span className="text-sm text-gray-600">
            {tasks.length}
            {column.wipLimit && ` / ${column.wipLimit}`}
          </span>
        </div>
        {wipLimitReached && (
          <p className="text-xs text-red-600 mt-1">WIP limit reached!</p>
        )}
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}

        {tasks.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
};
```

### 3. Task Card Component

```tsx
// src/components/kanban/TaskCard.tsx
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Clock, AlertCircle, FileCode, Cpu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { AgentTask } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  task: AgentTask;
}

export const TaskCard: React.FC<Props> = ({ task }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const importanceColors = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        bg-white rounded-lg shadow-sm border p-4 cursor-grab
        hover:shadow-md transition-shadow
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      {/* Header: Title + Importance */}
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm flex-1 pr-2">{task.title}</h4>
        <div
          className={`w-2 h-2 rounded-full ${importanceColors[task.importance]}`}
          title={`${task.importance} priority`}
        />
      </div>

      {/* Current Action (if in progress) */}
      {task.currentAction && (
        <p className="text-xs text-gray-600 mb-2 italic">
          {task.currentAction}
        </p>
      )}

      {/* Progress Bar */}
      {task.progress !== undefined && task.progress > 0 && (
        <div className="mb-3">
          <Progress value={task.progress} className="h-1" />
          <p className="text-xs text-gray-500 mt-1">{task.progress}%</p>
        </div>
      )}

      {/* Agent Info */}
      <div className="flex items-center gap-2 mb-2">
        <Cpu className="w-3 h-3 text-gray-400" />
        <span className="text-xs text-gray-600">{task.agentName}</span>
      </div>

      {/* Files Modified */}
      {task.files && task.files.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <FileCode className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-600">
            {task.files.length} file{task.files.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Timestamps */}
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-3 h-3 text-gray-400" />
        <span className="text-xs text-gray-500">
          {task.startedAt
            ? `Started ${formatDistanceToNow(task.startedAt, { addSuffix: true })}`
            : `Created ${formatDistanceToNow(task.createdAt, { addSuffix: true })}`}
        </span>
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Lines Changed */}
      {task.linesChanged && (
        <div className="text-xs text-gray-600">
          <span className="text-green-600">+{task.linesChanged.added}</span>
          {' / '}
          <span className="text-red-600">-{task.linesChanged.removed}</span>
        </div>
      )}

      {/* Blocked Indicator */}
      {task.blockedBy && task.blockedBy.length > 0 && (
        <div className="flex items-center gap-1 mt-2 text-red-600">
          <AlertCircle className="w-3 h-3" />
          <span className="text-xs">
            Blocked by {task.blockedBy.length} task(s)
          </span>
        </div>
      )}

      {/* Error Message */}
      {task.errorMessage && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {task.errorMessage}
        </div>
      )}
    </div>
  );
};
```

### 4. WebSocket Hook

```tsx
// src/hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { useAgentStore } from '@/stores/agentStore';

export const useWebSocket = (boardId: string) => {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const { addTask, updateTask, removeTask } = useTaskStore();
  const { updateAgent } = useAgentStore();

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket('ws://localhost:8080');

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);

        // Subscribe to board updates
        ws.send(JSON.stringify({ type: 'subscribe', boardId }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'task_created':
            addTask(message.task);
            break;

          case 'task_updated':
            updateTask(message.task);
            break;

          case 'task_moved':
            updateTask(message.task);
            break;

          case 'task_deleted':
            removeTask(message.taskId);
            break;

          case 'agent_status_changed':
            updateAgent(message.agent);
            break;

          case 'comment_added':
            // Handle comment
            break;
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [boardId]);

  return { connected };
};
```

### 5. Zustand Store

```tsx
// src/stores/taskStore.ts
import { create } from 'zustand';
import type { AgentTask } from '@/types';

interface TaskStore {
  tasks: AgentTask[];
  setTasks: (tasks: AgentTask[]) => void;
  addTask: (task: AgentTask) => void;
  updateTask: (task: AgentTask) => void;
  removeTask: (taskId: string) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],

  setTasks: (tasks) => set({ tasks }),

  addTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks, task],
    })),

  updateTask: (updatedTask) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === updatedTask.id ? updatedTask : task
      ),
    })),

  removeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== taskId),
    })),
}));
```

## WebSocket Server

```typescript
// server/src/websocket.ts
import WebSocket, { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';

export class RealtimeServer {
  private wss: WebSocketServer;
  private subscriptions: Map<string, Set<WebSocket>> = new Map();

  constructor(port: number, mcpEventBus: EventEmitter) {
    this.wss = new WebSocketServer({ port });
    this.setupServer();
    this.listenToMCPEvents(mcpEventBus);
  }

  private setupServer() {
    this.wss.on('connection', (ws) => {
      console.log('Client connected');

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());

          if (data.type === 'subscribe') {
            this.subscribe(data.boardId, ws);
          } else if (data.type === 'unsubscribe') {
            this.unsubscribe(data.boardId, ws);
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
        this.removeClient(ws);
      });
    });
  }

  private listenToMCPEvents(eventBus: EventEmitter) {
    // Listen to events from MCP server
    eventBus.on('task:created', (task) => {
      this.broadcast(task.boardId, { type: 'task_created', task });
    });

    eventBus.on('task:updated', (task) => {
      this.broadcast(task.boardId, { type: 'task_updated', task });
    });

    eventBus.on('task:completed', (task) => {
      this.broadcast(task.boardId, { type: 'task_updated', task });
    });

    eventBus.on('agent:status_changed', (agent) => {
      // Broadcast to all boards
      this.broadcastAll({ type: 'agent_status_changed', agent });
    });
  }

  private subscribe(boardId: string, ws: WebSocket) {
    if (!this.subscriptions.has(boardId)) {
      this.subscriptions.set(boardId, new Set());
    }
    this.subscriptions.get(boardId)!.add(ws);
    console.log(`Client subscribed to board: ${boardId}`);
  }

  private unsubscribe(boardId: string, ws: WebSocket) {
    const subs = this.subscriptions.get(boardId);
    if (subs) {
      subs.delete(ws);
    }
  }

  private removeClient(ws: WebSocket) {
    for (const [_, clients] of this.subscriptions) {
      clients.delete(ws);
    }
  }

  private broadcast(boardId: string, message: any) {
    const clients = this.subscriptions.get(boardId);
    if (!clients) return;

    const data = JSON.stringify(message);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  private broadcastAll(message: any) {
    const data = JSON.stringify(message);
    for (const [_, clients] of this.subscriptions) {
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      }
    }
  }
}
```

## REST API Server

```typescript
// server/src/api.ts
import express from 'express';
import cors from 'cors';
import { BoardRepository } from './repositories/board-repository';
import { TaskRepository } from './repositories/task-repository';
import { AgentRepository } from './repositories/agent-repository';

export const createAPIServer = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const boardRepo = new BoardRepository();
  const taskRepo = new TaskRepository();
  const agentRepo = new AgentRepository();

  // Boards
  app.get('/api/boards', async (req, res) => {
    const boards = await boardRepo.getAll();
    res.json(boards);
  });

  app.get('/api/boards/:id', async (req, res) => {
    const board = await boardRepo.get(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });

    const columns = await boardRepo.getColumns(req.params.id);
    const tasks = await taskRepo.getByBoard(req.params.id);
    const agents = await agentRepo.getByBoard(req.params.id);

    res.json({ board, columns, tasks, agents });
  });

  // Tasks
  app.get('/api/tasks/:id', async (req, res) => {
    const task = await taskRepo.get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  });

  // Agents
  app.get('/api/agents', async (req, res) => {
    const agents = await agentRepo.getAll();
    res.json(agents);
  });

  return app;
};
```

## Deployment

### Development

```bash
# Terminal 1: Start MCP server
npm run dev:mcp

# Terminal 2: Start API + WebSocket server
npm run dev:server

# Terminal 3: Start React dev server
npm run dev:dashboard
```

### Production

```bash
# Build dashboard
npm run build:dashboard

# Start production server (serves static files + API + WebSocket)
npm run start
```

## Summary

The web dashboard provides:
- ✅ **Real-time kanban board** with drag-and-drop
- ✅ **Live updates** via WebSocket
- ✅ **Detailed task cards** showing all agent metadata
- ✅ **Agent monitoring** with status indicators
- ✅ **Progress tracking** with visual progress bars
- ✅ **Responsive design** with Tailwind CSS
- ✅ **Type-safe** with TypeScript throughout
- ✅ **Modern stack** (React 18, Vite, Zustand)
