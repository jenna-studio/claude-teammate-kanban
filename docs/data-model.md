# Data Model for Agent Activity Dashboard

## Core Entities

### AgentTask
The primary entity representing work being done by an agent.

```typescript
interface AgentTask {
  // Identity
  id: string;                          // UUID
  boardId: string;                     // Which board this task belongs to

  // Task Information
  title: string;                       // "Refactor authentication module"
  description?: string;                // Detailed markdown description

  // Importance/Priority
  importance: 'critical' | 'high' | 'medium' | 'low';

  // Status (Kanban columns)
  status: 'todo' | 'claimed' | 'in_progress' | 'review' | 'done';

  // Agent Information
  agentId: string;                     // Unique agent identifier
  agentName: string;                   // "Claude Code", "Cursor Agent", etc.
  agentType: string;                   // "code-generator", "code-reviewer", etc.
  sessionId: string;                   // Current agent session

  // Timestamps
  createdAt: Date;                     // When task was created
  claimedAt?: Date;                    // When agent claimed this task
  startedAt?: Date;                    // When work actually began
  completedAt?: Date;                  // When task finished
  updatedAt: Date;                     // Last update time

  // Progress Tracking
  progress?: number;                   // 0-100 percentage
  currentAction?: string;              // "Analyzing dependencies..."

  // Context & Metadata
  files?: string[];                    // Files being modified
  linesChanged?: { added: number; removed: number };
  tokensUsed?: number;                 // LLM tokens consumed
  estimatedDuration?: number;          // Estimated time in seconds
  actualDuration?: number;             // Actual time taken

  // Relationships
  parentTaskId?: string;               // If this is a subtask
  blockedBy?: string[];                // Task IDs that block this one
  tags?: string[];                     // ["refactoring", "typescript", "auth"]

  // Error Handling
  errorMessage?: string;               // If task failed
  retryCount?: number;                 // Number of retry attempts
}
```

### Agent
Information about each AI agent.

```typescript
interface Agent {
  id: string;
  name: string;                        // "Claude Code"
  type: string;                        // "code-generator", "reviewer", "tester"
  status: 'active' | 'idle' | 'offline';
  currentSessionId?: string;

  // Capabilities
  capabilities: string[];              // ["typescript", "react", "testing"]
  maxConcurrentTasks: number;          // How many tasks can run in parallel

  // Statistics
  tasksCompleted: number;
  tasksInProgress: number;
  averageTaskDuration: number;         // In seconds
  successRate: number;                 // 0-100

  // Heartbeat
  lastHeartbeat: Date;

  // Metadata
  metadata?: Record<string, unknown>;
}
```

### Board
A workspace for organizing agent tasks.

```typescript
interface Board {
  id: string;
  name: string;                        // "Main Development", "Feature Branch XYZ"
  description?: string;

  // Configuration
  columns: BoardColumn[];              // Customizable kanban columns

  // Project Context
  projectPath?: string;                // Associated codebase path
  repository?: string;                 // Git repo URL

  // Team
  agentIds: string[];                  // Agents working on this board

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Settings
  settings: {
    autoArchiveCompleted: boolean;     // Auto-archive done tasks after N hours
    archiveAfterHours: number;
    enableNotifications: boolean;
    criticalTaskAlerts: boolean;
  };
}
```

### BoardColumn
Customizable kanban columns.

```typescript
interface BoardColumn {
  id: string;
  name: string;                        // "TODO", "Claimed", "In Progress", "Review", "Done"
  position: number;                    // Display order
  wipLimit?: number;                   // Work-in-progress limit
  color?: string;                      // Hex color for UI
}
```

### Session
An agent work session.

```typescript
interface Session {
  id: string;
  agentId: string;
  boardId: string;

  startedAt: Date;
  endedAt?: Date;

  // Health Check
  lastHeartbeat: Date;
  isActive: boolean;

  // Session Stats
  tasksCreated: number;
  tasksCompleted: number;
  tasksFailed: number;
  totalTokensUsed: number;

  // Context
  metadata?: Record<string, unknown>;
}
```

### ActivityLog
Detailed timeline of all agent activities.

```typescript
interface ActivityLog {
  id: string;
  timestamp: Date;

  // What happened
  eventType: 'task_created' | 'task_claimed' | 'task_started' |
             'task_progressed' | 'task_completed' | 'task_failed' |
             'task_moved' | 'comment_added' | 'file_modified';

  // Who did it
  agentId: string;
  agentName: string;

  // What was affected
  taskId?: string;
  boardId: string;

  // Details
  message: string;                     // Human-readable description
  details?: Record<string, unknown>;   // Structured data

  // Changes
  before?: any;                        // State before
  after?: any;                         // State after
}
```

### Comment
Inter-agent communication on tasks.

```typescript
interface Comment {
  id: string;
  taskId: string;

  author: string;                      // Agent name or human user
  authorType: 'agent' | 'human';

  content: string;                     // Markdown supported

  createdAt: Date;
  updatedAt?: Date;

  // Threading
  parentCommentId?: string;

  // Metadata
  metadata?: Record<string, unknown>;
}
```

## Database Schema (SQLite)

```sql
CREATE TABLE boards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    project_path TEXT,
    repository TEXT,
    settings JSON NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE board_columns (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    wip_limit INTEGER,
    color TEXT,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    current_session_id TEXT,
    capabilities JSON,
    max_concurrent_tasks INTEGER DEFAULT 1,
    tasks_completed INTEGER DEFAULT 0,
    tasks_in_progress INTEGER DEFAULT 0,
    average_task_duration REAL DEFAULT 0,
    success_rate REAL DEFAULT 100,
    last_heartbeat INTEGER NOT NULL,
    metadata JSON
);

CREATE TABLE agent_tasks (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL,

    title TEXT NOT NULL,
    description TEXT,

    importance TEXT NOT NULL,
    status TEXT NOT NULL,

    agent_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    session_id TEXT NOT NULL,

    created_at INTEGER NOT NULL,
    claimed_at INTEGER,
    started_at INTEGER,
    completed_at INTEGER,
    updated_at INTEGER NOT NULL,

    progress INTEGER,
    current_action TEXT,

    files JSON,
    lines_changed JSON,
    tokens_used INTEGER,
    estimated_duration INTEGER,
    actual_duration INTEGER,

    parent_task_id TEXT,
    blocked_by JSON,
    tags JSON,

    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX idx_tasks_board ON agent_tasks(board_id);
CREATE INDEX idx_tasks_agent ON agent_tasks(agent_id);
CREATE INDEX idx_tasks_status ON agent_tasks(status);
CREATE INDEX idx_tasks_importance ON agent_tasks(importance);
CREATE INDEX idx_tasks_session ON agent_tasks(session_id);

CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    board_id TEXT NOT NULL,

    started_at INTEGER NOT NULL,
    ended_at INTEGER,

    last_heartbeat INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT 1,

    tasks_created INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    tasks_failed INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,

    metadata JSON,

    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE TABLE activity_logs (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,

    event_type TEXT NOT NULL,

    agent_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,

    task_id TEXT,
    board_id TEXT NOT NULL,

    message TEXT NOT NULL,
    details JSON,

    before_state JSON,
    after_state JSON,

    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE INDEX idx_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX idx_logs_board ON activity_logs(board_id);
CREATE INDEX idx_logs_task ON activity_logs(task_id);
CREATE INDEX idx_logs_event_type ON activity_logs(event_type);

CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,

    author TEXT NOT NULL,
    author_type TEXT NOT NULL,

    content TEXT NOT NULL,

    created_at INTEGER NOT NULL,
    updated_at INTEGER,

    parent_comment_id TEXT,

    metadata JSON,

    FOREIGN KEY (task_id) REFERENCES agent_tasks(id) ON DELETE CASCADE
);

CREATE INDEX idx_comments_task ON comments(task_id);
```

## API Response Types

### GET /api/boards/:boardId

```typescript
interface BoardResponse {
  board: Board;
  columns: BoardColumn[];
  tasks: AgentTask[];
  agents: Agent[];
  activeSessionCount: number;
  statistics: {
    totalTasks: number;
    todoCount: number;
    claimedCount: number;
    inProgressCount: number;
    reviewCount: number;
    doneCount: number;
    averageCompletionTime: number;
    totalTokensUsed: number;
  };
}
```

### WebSocket Events

```typescript
// Client → Server
type ClientMessage =
  | { type: 'subscribe', boardId: string }
  | { type: 'unsubscribe', boardId: string }
  | { type: 'heartbeat' };

// Server → Client
type ServerMessage =
  | { type: 'task_created', task: AgentTask }
  | { type: 'task_updated', task: AgentTask }
  | { type: 'task_moved', taskId: string, fromStatus: string, toStatus: string }
  | { type: 'task_deleted', taskId: string }
  | { type: 'agent_status_changed', agent: Agent }
  | { type: 'activity_logged', log: ActivityLog }
  | { type: 'comment_added', comment: Comment };
```

## Example Data Flow

### Agent reports starting a task:

```typescript
// 1. Agent calls MCP tool
await mcp.callTool('start_task', {
  boardId: 'main-board',
  title: 'Refactor authentication module',
  description: 'Split monolithic auth.ts into smaller modules',
  importance: 'high',
  agentId: 'claude-code-1',
  agentName: 'Claude Code',
  agentType: 'code-generator',
  estimatedDuration: 300, // 5 minutes
  tags: ['refactoring', 'auth', 'typescript']
});

// 2. Server creates task with status='claimed'
const task: AgentTask = {
  id: 'task-123',
  boardId: 'main-board',
  title: 'Refactor authentication module',
  description: 'Split monolithic auth.ts into smaller modules',
  importance: 'high',
  status: 'claimed',
  agentId: 'claude-code-1',
  agentName: 'Claude Code',
  agentType: 'code-generator',
  sessionId: 'session-456',
  createdAt: new Date(),
  claimedAt: new Date(),
  updatedAt: new Date(),
  estimatedDuration: 300,
  tags: ['refactoring', 'auth', 'typescript']
};

// 3. WebSocket broadcasts to all connected clients
ws.broadcast({
  type: 'task_created',
  task: task
});

// 4. Dashboard updates kanban board UI in real-time
// Task appears in "Claimed" column
```

### Agent progresses through task:

```typescript
// Agent moves to in-progress
await mcp.callTool('update_task_status', {
  taskId: 'task-123',
  status: 'in_progress',
  currentAction: 'Analyzing current auth.ts structure'
});

// Later: Update progress
await mcp.callTool('update_task_progress', {
  taskId: 'task-123',
  progress: 30,
  currentAction: 'Creating separate modules for login, logout, session',
  files: ['src/auth/login.ts', 'src/auth/logout.ts', 'src/auth/session.ts']
});

// Later: Update progress again
await mcp.callTool('update_task_progress', {
  taskId: 'task-123',
  progress: 60,
  currentAction: 'Migrating functions to new modules',
  linesChanged: { added: 150, removed: 200 }
});

// Finally: Complete
await mcp.callTool('complete_task', {
  taskId: 'task-123',
  tokensUsed: 15000
});
```
