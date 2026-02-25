/**
 * Utility types, helper functions, and type guards
 * @module utility-types
 */

import {
  TaskStatus,
  TaskImportance,
  AgentStatus,
  EventType,
  isValidStatusTransition,
  IMPORTANCE_PRIORITY_VALUES,
} from './constants.js';
import type { AgentTask, CodeChange, Comment } from './task-types.js';
import type { Agent, Session, ActivityLog } from './agent-types.js';
import type { Board } from './board-types.js';

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Make specified properties of T required
 *
 * @example
 * ```typescript
 * type PartialTask = Partial<AgentTask>;
 * type TaskWithRequired = RequireProps<PartialTask, 'id' | 'title' | 'status'>;
 * ```
 */
export type RequireProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specified properties of T optional
 *
 * @example
 * ```typescript
 * type TaskUpdate = OptionalProps<AgentTask, 'description' | 'tags'>;
 * ```
 */
export type OptionalProps<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Deep partial - makes all properties and nested properties optional
 *
 * @example
 * ```typescript
 * type PartialBoard = DeepPartial<Board>;
 * ```
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/**
 * Deep readonly - makes all properties and nested properties readonly
 *
 * @example
 * ```typescript
 * type ImmutableBoard = DeepReadonly<Board>;
 * ```
 */
export type DeepReadonly<T> = T extends object
  ? {
      readonly [P in keyof T]: DeepReadonly<T[P]>;
    }
  : T;

/**
 * Extract keys of T where value is of type V
 *
 * @example
 * ```typescript
 * type DateKeys = KeysOfType<AgentTask, Date>; // 'createdAt' | 'updatedAt' | ...
 * ```
 */
export type KeysOfType<T, V> = {
  [K in keyof T]-?: T[K] extends V ? K : never;
}[keyof T];

/**
 * Pick properties of T where value is of type V
 *
 * @example
 * ```typescript
 * type TaskDates = PickByType<AgentTask, Date>;
 * ```
 */
export type PickByType<T, V> = Pick<T, KeysOfType<T, V>>;

/**
 * Omit properties of T where value is of type V
 *
 * @example
 * ```typescript
 * type TaskWithoutDates = OmitByType<AgentTask, Date>;
 * ```
 */
export type OmitByType<T, V> = Omit<T, KeysOfType<T, V>>;

/**
 * Create a type with only the specified keys from T, making them required
 *
 * @example
 * ```typescript
 * type TaskIdentity = StrictPick<AgentTask, 'id' | 'boardId'>;
 * ```
 */
export type StrictPick<T, K extends keyof T> = Required<Pick<T, K>>;

/**
 * Non-nullable version of T
 *
 * @example
 * ```typescript
 * type RequiredString = NonNullable<string | undefined>; // string
 * ```
 */
export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

/**
 * Extract function property names from T
 *
 * @example
 * ```typescript
 * type FunctionProps = FunctionPropertyNames<typeof MyClass.prototype>;
 * ```
 */
export type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

/**
 * Extract non-function property names from T
 *
 * @example
 * ```typescript
 * type DataProps = NonFunctionPropertyNames<Agent>;
 * ```
 */
export type NonFunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? never : K;
}[keyof T];

/**
 * Type for ID fields
 */
export type ID = string;

/**
 * Type for timestamp fields
 */
export type Timestamp = Date;

/**
 * Type for optional metadata
 */
export type Metadata = Record<string, unknown>;

/**
 * Result type for operations that can succeed or fail
 *
 * @example
 * ```typescript
 * function validateTask(task: AgentTask): Result<AgentTask, string> {
 *   if (!task.id) {
 *     return { success: false, error: 'Task ID is required' };
 *   }
 *   return { success: true, data: task };
 * }
 * ```
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Pagination parameters
 *
 * @example
 * ```typescript
 * const params: PaginationParams = {
 *   page: 1,
 *   limit: 20,
 *   sortBy: 'createdAt',
 *   sortOrder: 'desc'
 * };
 * ```
 */
export interface PaginationParams {
  /** Page number (1-indexed) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Field to sort by */
  sortBy?: string;
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 *
 * @example
 * ```typescript
 * const response: PaginatedResponse<AgentTask> = {
 *   data: [...],
 *   pagination: {
 *     page: 1,
 *     limit: 20,
 *     total: 100,
 *     pages: 5
 *   }
 * };
 * ```
 */
export interface PaginatedResponse<T> {
  /** Array of items */
  data: T[];
  /** Pagination metadata */
  pagination: {
    /** Current page */
    page: number;
    /** Items per page */
    limit: number;
    /** Total number of items */
    total: number;
    /** Total number of pages */
    pages: number;
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a value is an AgentTask
 */
export function isAgentTask(value: unknown): value is AgentTask {
  if (typeof value !== 'object' || value === null) return false;
  const task = value as any;
  return (
    typeof task.id === 'string' &&
    typeof task.boardId === 'string' &&
    typeof task.title === 'string' &&
    typeof task.status === 'string' &&
    Object.values(TaskStatus).includes(task.status)
  );
}

/**
 * Type guard to check if a value is an Agent
 */
export function isAgent(value: unknown): value is Agent {
  if (typeof value !== 'object' || value === null) return false;
  const agent = value as any;
  return (
    typeof agent.id === 'string' &&
    typeof agent.name === 'string' &&
    typeof agent.status === 'string' &&
    Object.values(AgentStatus).includes(agent.status)
  );
}

/**
 * Type guard to check if a value is a Board
 */
export function isBoard(value: unknown): value is Board {
  if (typeof value !== 'object' || value === null) return false;
  const board = value as any;
  return (
    typeof board.id === 'string' &&
    typeof board.name === 'string' &&
    board.createdAt instanceof Date
  );
}

/**
 * Type guard to check if a value is a Session
 */
export function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false;
  const session = value as any;
  return (
    typeof session.id === 'string' &&
    typeof session.agentId === 'string' &&
    typeof session.boardId === 'string' &&
    typeof session.isActive === 'boolean'
  );
}

/**
 * Type guard to check if a value is a Comment
 */
export function isComment(value: unknown): value is Comment {
  if (typeof value !== 'object' || value === null) return false;
  const comment = value as any;
  return (
    typeof comment.id === 'string' &&
    typeof comment.taskId === 'string' &&
    typeof comment.content === 'string'
  );
}

/**
 * Type guard to check if a value is an ActivityLog
 */
export function isActivityLog(value: unknown): value is ActivityLog {
  if (typeof value !== 'object' || value === null) return false;
  const log = value as any;
  return (
    typeof log.id === 'string' &&
    typeof log.eventType === 'string' &&
    Object.values(EventType).includes(log.eventType)
  );
}

/**
 * Type guard to check if a task is blocked
 */
export function isTaskBlocked(task: AgentTask): boolean {
  return Boolean(task.blockedBy && task.blockedBy.length > 0);
}

/**
 * Type guard to check if a task is completed
 */
export function isTaskCompleted(task: AgentTask): boolean {
  return task.status === TaskStatus.DONE;
}

/**
 * Type guard to check if a task is in progress
 */
export function isTaskInProgress(task: AgentTask): boolean {
  return task.status === TaskStatus.IN_PROGRESS;
}

/**
 * Type guard to check if a task has failed
 */
export function isTaskFailed(task: AgentTask): boolean {
  return Boolean(task.errorMessage);
}

/**
 * Type guard to check if an agent is active
 */
export function isAgentActive(agent: Agent): boolean {
  return agent.status === AgentStatus.ACTIVE;
}

/**
 * Type guard to check if a session is active
 */
export function isSessionActive(session: Session): boolean {
  return session.isActive && !session.endedAt;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate task duration in seconds
 *
 * @example
 * ```typescript
 * const duration = calculateTaskDuration(task);
 * console.log(`Task took ${duration} seconds`);
 * ```
 */
export function calculateTaskDuration(task: AgentTask): number | null {
  if (!task.startedAt || !task.completedAt) return null;
  return Math.floor((task.completedAt.getTime() - task.startedAt.getTime()) / 1000);
}

/**
 * Calculate session duration in seconds
 *
 * @example
 * ```typescript
 * const duration = calculateSessionDuration(session);
 * ```
 */
export function calculateSessionDuration(session: Session): number {
  const endTime = session.endedAt || new Date();
  return Math.floor((endTime.getTime() - session.startedAt.getTime()) / 1000);
}

/**
 * Get priority value for a task importance level
 *
 * @example
 * ```typescript
 * const priority = getImportancePriority(TaskImportance.HIGH); // 75
 * ```
 */
export function getImportancePriority(importance: TaskImportance): number {
  return IMPORTANCE_PRIORITY_VALUES[importance];
}

/**
 * Compare two tasks by priority (for sorting)
 *
 * @example
 * ```typescript
 * const sortedTasks = tasks.sort(compareTasksByPriority);
 * ```
 */
export function compareTasksByPriority(a: AgentTask, b: AgentTask): number {
  return getImportancePriority(b.importance) - getImportancePriority(a.importance);
}

/**
 * Check if a status transition is valid
 *
 * @example
 * ```typescript
 * if (canTransitionTaskStatus(task, TaskStatus.REVIEW)) {
 *   // Transition is allowed
 * }
 * ```
 */
export function canTransitionTaskStatus(
  task: AgentTask,
  newStatus: TaskStatus
): boolean {
  return isValidStatusTransition(task.status, newStatus);
}

/**
 * Get total lines changed in code changes
 *
 * @example
 * ```typescript
 * const total = getTotalLinesChanged(task.codeChanges);
 * console.log(`Changed ${total} lines`);
 * ```
 */
export function getTotalLinesChanged(codeChanges?: CodeChange[]): number {
  if (!codeChanges) return 0;
  return codeChanges.reduce((total, change) => {
    return total + (change.linesAdded || 0) + (change.linesDeleted || 0);
  }, 0);
}

/**
 * Get file count from code changes
 *
 * @example
 * ```typescript
 * const fileCount = getFilesChangedCount(task.codeChanges);
 * ```
 */
export function getFilesChangedCount(codeChanges?: CodeChange[]): number {
  if (!codeChanges) return 0;
  return codeChanges.length;
}

/**
 * Format duration in human-readable format
 *
 * @example
 * ```typescript
 * const formatted = formatDuration(3665); // "1h 1m 5s"
 * ```
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Parse duration string to seconds
 *
 * @example
 * ```typescript
 * const seconds = parseDuration("1h 30m"); // 5400
 * ```
 */
export function parseDuration(duration: string): number {
  const regex = /(\d+)([hms])/g;
  let total = 0;
  let match;

  while ((match = regex.exec(duration)) !== null) {
    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'h':
        total += value * 3600;
        break;
      case 'm':
        total += value * 60;
        break;
      case 's':
        total += value;
        break;
    }
  }

  return total;
}

/**
 * Get task progress percentage (0-100)
 *
 * @example
 * ```typescript
 * const progress = getTaskProgress(task); // 75
 * ```
 */
export function getTaskProgress(task: AgentTask): number {
  return task.progress || 0;
}

/**
 * Check if task progress is complete
 */
export function isTaskProgressComplete(task: AgentTask): boolean {
  return getTaskProgress(task) >= 100;
}

/**
 * Create a safe copy of an object with dates preserved
 *
 * @example
 * ```typescript
 * const copy = cloneWithDates(task);
 * ```
 */
export function cloneWithDates<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj), (_key, value) => {
    // Check if the value looks like an ISO date string
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return new Date(value);
    }
    return value;
  });
}

/**
 * Filter tasks by status
 *
 * @example
 * ```typescript
 * const inProgressTasks = filterTasksByStatus(tasks, TaskStatus.IN_PROGRESS);
 * ```
 */
export function filterTasksByStatus(
  tasks: AgentTask[],
  status: TaskStatus
): AgentTask[] {
  return tasks.filter((task) => task.status === status);
}

/**
 * Filter tasks by importance
 *
 * @example
 * ```typescript
 * const criticalTasks = filterTasksByImportance(tasks, TaskImportance.CRITICAL);
 * ```
 */
export function filterTasksByImportance(
  tasks: AgentTask[],
  importance: TaskImportance
): AgentTask[] {
  return tasks.filter((task) => task.importance === importance);
}

/**
 * Filter tasks by agent
 *
 * @example
 * ```typescript
 * const agentTasks = filterTasksByAgent(tasks, 'agent-1');
 * ```
 */
export function filterTasksByAgent(tasks: AgentTask[], agentId: string): AgentTask[] {
  return tasks.filter((task) => task.agentId === agentId);
}

/**
 * Group tasks by status
 *
 * @example
 * ```typescript
 * const grouped = groupTasksByStatus(tasks);
 * console.log(grouped[TaskStatus.IN_PROGRESS]); // array of in-progress tasks
 * ```
 */
export function groupTasksByStatus(
  tasks: AgentTask[]
): Record<TaskStatus, AgentTask[]> {
  const grouped: Record<TaskStatus, AgentTask[]> = {
    [TaskStatus.TODO]: [],
    [TaskStatus.CLAIMED]: [],
    [TaskStatus.IN_PROGRESS]: [],
    [TaskStatus.REVIEW]: [],
    [TaskStatus.DONE]: [],
  };

  tasks.forEach((task) => {
    grouped[task.status].push(task);
  });

  return grouped;
}

/**
 * Sort tasks by creation date
 *
 * @example
 * ```typescript
 * const sorted = sortTasksByDate(tasks, 'desc');
 * ```
 */
export function sortTasksByDate(
  tasks: AgentTask[],
  order: 'asc' | 'desc' = 'desc'
): AgentTask[] {
  return [...tasks].sort((a, b) => {
    const timeA = a.createdAt.getTime();
    const timeB = b.createdAt.getTime();
    return order === 'asc' ? timeA - timeB : timeB - timeA;
  });
}
