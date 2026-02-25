# @agent-track/shared

Shared types, constants, and utilities for the Agent Track Dashboard monorepo.

## Overview

This package provides a comprehensive, well-organized collection of TypeScript types, Zod validation schemas, constants, and utility functions used across the Agent Track Dashboard project. The codebase has been refactored for better organization, type safety, and developer experience.

## Features

- **Modular Organization**: Types split into logical modules (tasks, agents, boards, websockets, utilities)
- **Runtime Validation**: Zod schemas for all major types with comprehensive validation
- **Type Safety**: Strict TypeScript types with extensive JSDoc documentation
- **Utility Functions**: Helper functions for common operations (filtering, sorting, validation)
- **Type Guards**: Runtime type checking functions for safe type narrowing
- **Constants & Enums**: Centralized constants, enums, and configuration values
- **Color Palette**: Consistent UI colors mapped to statuses and importance levels
- **Examples**: JSDoc examples for all major types and functions

## Installation

```bash
npm install @agent-track/shared
```

## Structure

```
src/
├── constants.ts          # Enums, constants, validation schemas
├── task-types.ts         # Task-related types and schemas
├── agent-types.ts        # Agent-related types and schemas
├── board-types.ts        # Board-related types and schemas
├── websocket-types.ts    # WebSocket message types and schemas
├── utility-types.ts      # Utility types, helpers, and type guards
├── index.ts              # Main export file
└── types.deprecated.ts   # Original types (kept for reference)
```

## Usage

### Importing Types

```typescript
import {
  // Enums
  TaskStatus,
  TaskImportance,
  AgentStatus,

  // Types
  AgentTask,
  Agent,
  Board,

  // Validation Schemas
  agentTaskSchema,
  agentSchema,

  // Utility Functions
  isAgentTask,
  filterTasksByStatus,
  calculateTaskDuration,
} from '@agent-track/shared';
```

### Using Enums

```typescript
import { TaskStatus, TaskImportance } from '@agent-track/shared';

const task: AgentTask = {
  id: 'task-123',
  boardId: 'board-1',
  title: 'Implement authentication',
  importance: TaskImportance.HIGH,
  status: TaskStatus.IN_PROGRESS,
  // ... other fields
};
```

### Runtime Validation with Zod

```typescript
import { agentTaskSchema, taskStatusSchema } from '@agent-track/shared';

// Validate a task
const result = agentTaskSchema.safeParse(taskData);
if (result.success) {
  const validTask = result.data;
  // Use validTask safely
} else {
  console.error('Validation errors:', result.error);
}

// Validate a status
const statusResult = taskStatusSchema.safeParse('in_progress');
```

### Using Utility Functions

```typescript
import {
  filterTasksByStatus,
  groupTasksByStatus,
  compareTasksByPriority,
  formatDuration,
  calculateTaskDuration,
} from '@agent-track/shared';

// Filter tasks
const inProgressTasks = filterTasksByStatus(tasks, TaskStatus.IN_PROGRESS);

// Group tasks by status
const grouped = groupTasksByStatus(tasks);
console.log(grouped[TaskStatus.TODO]); // Array of TODO tasks

// Sort by priority
const sorted = tasks.sort(compareTasksByPriority);

// Format duration
const formatted = formatDuration(3665); // "1h 1m 5s"

// Calculate task duration
const duration = calculateTaskDuration(task);
```

### Using Type Guards

```typescript
import { isAgentTask, isTaskCompleted, isAgentActive } from '@agent-track/shared';

// Type narrowing
if (isAgentTask(data)) {
  // data is now typed as AgentTask
  console.log(data.title);
}

// Check task state
if (isTaskCompleted(task)) {
  console.log('Task is done!');
}

// Check agent state
if (isAgentActive(agent)) {
  console.log('Agent is working');
}
```

### WebSocket Messages

```typescript
import {
  ClientMessage,
  ServerMessage,
  TaskCreatedMessage,
  isClientMessage,
  isServerMessage,
} from '@agent-track/shared';

// Send client message
const subscribeMsg: ClientMessage = {
  type: 'subscribe',
  boardId: 'board-1',
};

// Handle server message
function handleMessage(msg: ServerMessage) {
  switch (msg.type) {
    case 'task_created':
      console.log('New task:', msg.task);
      break;
    case 'task_updated':
      console.log('Updated task:', msg.task);
      break;
    // ... handle other message types
  }
}
```

### Constants and Limits

```typescript
import { LIMITS, DEFAULTS, TIME, COLORS } from '@agent-track/shared';

// Use validation limits
if (task.progress > LIMITS.MAX_PROGRESS) {
  throw new Error('Invalid progress value');
}

// Use defaults
const newTask = {
  importance: DEFAULTS.TASK_IMPORTANCE, // TaskImportance.MEDIUM
  status: DEFAULTS.TASK_STATUS,         // TaskStatus.TODO
};

// Use time constants
const sessionTimeout = TIME.SESSION_IDLE_TIMEOUT; // 1800 seconds

// Use UI colors
const statusColor = COLORS.STATUS[TaskStatus.IN_PROGRESS]; // '#3B82F6'
const importanceColor = COLORS.IMPORTANCE[TaskImportance.HIGH]; // '#F59E0B'
```

## Module Details

### constants.ts

Centralized constants, enums, and configuration values:

- **Enums**: TaskStatus, TaskImportance, AgentStatus, ChangeType, EventType, AuthorType, DiffLineType
- **Constants**: DEFAULTS, LIMITS, TIME, WS_MESSAGE_TYPES, VALID_STATUS_TRANSITIONS, COLORS
- **Functions**: isValidStatusTransition()
- **Zod Schemas**: Validation schemas for all enums

### task-types.ts

Task-related types and validation:

- **Types**: AgentTask, Comment, CodeChange, DiffHunk, DiffLine, DiffSummary, LinesChanged
- **Input Types**: StartTaskInput, UpdateTaskStatusInput, UpdateTaskProgressInput, CompleteTaskInput, FailTaskInput, AddCommentInput, SetTaskBlockerInput
- **Zod Schemas**: Complete validation schemas for all task-related types

### agent-types.ts

Agent and session management:

- **Types**: Agent, Session, ActivityLog, AgentStatistics
- **Input Types**: RegisterAgentInput, StartSessionInput, AgentHeartbeatInput, EndSessionInput, UpdateAgentStatusInput
- **Zod Schemas**: Complete validation schemas for all agent-related types

### board-types.ts

Board and workspace management:

- **Types**: Board, BoardColumn, BoardSettings, BoardStatistics, BoardResponse
- **Input Types**: CreateBoardInput, UpdateBoardSettingsInput, AddBoardColumnInput, UpdateBoardColumnInput, DeleteBoardColumnInput, AssignAgentToBoardInput, RemoveAgentFromBoardInput
- **Constants**: DEFAULT_BOARD_SETTINGS
- **Zod Schemas**: Complete validation schemas for all board-related types

### websocket-types.ts

Real-time communication types:

- **Client Messages**: SubscribeMessage, UnsubscribeMessage, HeartbeatMessage
- **Server Messages**: TaskCreatedMessage, TaskUpdatedMessage, TaskMovedMessage, TaskDeletedMessage, AgentStatusChangedMessage, ActivityLoggedMessage, CommentAddedMessage
- **Types**: WebSocketOptions, WebSocketState
- **Constants**: DEFAULT_WEBSOCKET_OPTIONS
- **Type Guards**: isClientMessage(), isServerMessage()
- **Zod Schemas**: Complete validation schemas for all message types

### utility-types.ts

Helper types, type guards, and utility functions:

- **Utility Types**: RequireProps, OptionalProps, DeepPartial, DeepReadonly, Result, PaginationParams, PaginatedResponse, and more
- **Type Guards**: isAgentTask(), isAgent(), isBoard(), isTaskCompleted(), isAgentActive(), and more
- **Utility Functions**:
  - Duration: calculateTaskDuration(), formatDuration(), parseDuration()
  - Filtering: filterTasksByStatus(), filterTasksByImportance(), filterTasksByAgent()
  - Grouping: groupTasksByStatus()
  - Sorting: sortTasksByDate(), compareTasksByPriority()
  - Validation: canTransitionTaskStatus(), isTaskProgressComplete()
  - Other: getTotalLinesChanged(), getFilesChangedCount(), cloneWithDates()

## Key Improvements

### 1. Better Organization

The original single `types.ts` file (397 lines) has been split into 6 focused modules:
- `constants.ts` - All enums, constants, and configuration
- `task-types.ts` - Task and comment types
- `agent-types.ts` - Agent and session types
- `board-types.ts` - Board and workspace types
- `websocket-types.ts` - Real-time messaging types
- `utility-types.ts` - Helper types and functions

### 2. Runtime Validation

Added Zod schemas for all major types, enabling:
- Runtime type validation
- API request/response validation
- Data integrity checks
- Better error messages

### 3. Type Safety Enhancements

- Converted string literal unions to proper TypeScript enums
- Added strict validation limits and constraints
- Improved type inference with discriminated unions
- Added comprehensive type guards

### 4. Developer Experience

- Comprehensive JSDoc comments with examples
- Organized exports in index.ts
- Helper functions for common operations
- Type guards for safe type narrowing
- Utility types for advanced type manipulation

### 5. UI/UX Support

- Color palette constants for consistent UI
- Priority values for sorting
- Valid status transition mapping
- Duration formatting utilities

### 6. Maintainability

- Clear module boundaries
- Single responsibility principle
- Backward compatibility maintained
- Original types preserved in types.deprecated.ts

## Migration Guide

If you were previously importing from the old `types.ts`:

```typescript
// Old
import { TaskStatus, AgentTask } from '@agent-track/shared/types';

// New (works the same)
import { TaskStatus, AgentTask } from '@agent-track/shared';
```

All types are now available through the main package export. The old `types.ts` has been preserved as `types.deprecated.ts` for reference.

## Type-Safe Status Transitions

The package includes a validation map for valid task status transitions:

```typescript
import { canTransitionTaskStatus, isValidStatusTransition } from '@agent-track/shared';

// Check if transition is valid
if (canTransitionTaskStatus(task, TaskStatus.REVIEW)) {
  // Safe to transition
  task.status = TaskStatus.REVIEW;
}

// Or use the lower-level function
if (isValidStatusTransition(TaskStatus.IN_PROGRESS, TaskStatus.DONE)) {
  // Valid transition
}
```

Valid transitions:
- `TODO` → `CLAIMED`, `IN_PROGRESS`
- `CLAIMED` → `TODO`, `IN_PROGRESS`
- `IN_PROGRESS` → `REVIEW`, `DONE`, `TODO`
- `REVIEW` → `DONE`, `IN_PROGRESS`
- `DONE` → `TODO` (reopen)

## Examples

### Complete Task Creation Example

```typescript
import {
  AgentTask,
  TaskStatus,
  TaskImportance,
  agentTaskSchema,
  StartTaskInput,
  startTaskInputSchema,
} from '@agent-track/shared';

// Validate input
const input: StartTaskInput = {
  boardId: 'board-1',
  sessionId: 'session-abc',
  title: 'Implement user authentication',
  description: 'Add JWT-based auth to the API',
  importance: TaskImportance.HIGH,
  tags: ['security', 'api'],
};

const inputValidation = startTaskInputSchema.safeParse(input);
if (!inputValidation.success) {
  throw new Error('Invalid input');
}

// Create task
const task: AgentTask = {
  id: 'task-123',
  boardId: input.boardId,
  title: input.title,
  description: input.description,
  importance: input.importance || TaskImportance.MEDIUM,
  status: TaskStatus.TODO,
  agentId: 'agent-1',
  agentName: 'CodeAgent',
  agentType: 'development',
  sessionId: input.sessionId,
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: input.tags,
};

// Validate task
const taskValidation = agentTaskSchema.safeParse(task);
if (taskValidation.success) {
  console.log('Task created successfully');
}
```

## Contributing

When adding new types or features:

1. Add types to the appropriate module
2. Include Zod validation schemas
3. Add comprehensive JSDoc comments with examples
4. Export from the module and update index.ts
5. Add utility functions if applicable
6. Update this README

## License

MIT
