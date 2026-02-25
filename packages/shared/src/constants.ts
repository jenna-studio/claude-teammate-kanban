/**
 * Shared constants, enums, and configuration values for Agent Track Dashboard
 * @module constants
 */

import { z } from 'zod';

// ============================================================================
// Task Status Constants
// ============================================================================

/**
 * Task status types representing the Kanban board columns
 *
 * @example
 * ```typescript
 * const newTask = { status: TaskStatus.TODO };
 * ```
 */
export enum TaskStatus {
  /** Task is in the backlog, not yet started */
  TODO = 'todo',
  /** Task has been claimed by an agent but not started */
  CLAIMED = 'claimed',
  /** Task is actively being worked on */
  IN_PROGRESS = 'in_progress',
  /** Task is complete and awaiting review */
  REVIEW = 'review',
  /** Task is fully completed */
  DONE = 'done',
}

/**
 * Array of all valid task statuses
 */
export const TASK_STATUSES = Object.values(TaskStatus) as [TaskStatus, ...TaskStatus[]];

/**
 * Zod schema for task status validation
 */
export const taskStatusSchema = z.enum(TASK_STATUSES);

// ============================================================================
// Task Importance/Priority Constants
// ============================================================================

/**
 * Task importance levels for prioritization
 *
 * @example
 * ```typescript
 * const urgentTask = { importance: TaskImportance.CRITICAL };
 * ```
 */
export enum TaskImportance {
  /** Urgent, blocking tasks that need immediate attention */
  CRITICAL = 'critical',
  /** High priority tasks */
  HIGH = 'high',
  /** Normal priority tasks */
  MEDIUM = 'medium',
  /** Low priority, nice-to-have tasks */
  LOW = 'low',
}

/**
 * Array of all valid task importance levels
 */
export const TASK_IMPORTANCES = Object.values(TaskImportance) as [TaskImportance, ...TaskImportance[]];

/**
 * Zod schema for task importance validation
 */
export const taskImportanceSchema = z.enum(TASK_IMPORTANCES);

/**
 * Numeric priority values for sorting (higher = more important)
 */
export const IMPORTANCE_PRIORITY_VALUES: Record<TaskImportance, number> = {
  [TaskImportance.CRITICAL]: 100,
  [TaskImportance.HIGH]: 75,
  [TaskImportance.MEDIUM]: 50,
  [TaskImportance.LOW]: 25,
};

// ============================================================================
// Agent Status Constants
// ============================================================================

/**
 * Agent operational status
 *
 * @example
 * ```typescript
 * const agent = { status: AgentStatus.ACTIVE };
 * ```
 */
export enum AgentStatus {
  /** Agent is actively working on tasks */
  ACTIVE = 'active',
  /** Agent is connected but not working */
  IDLE = 'idle',
  /** Agent is disconnected */
  OFFLINE = 'offline',
}

/**
 * Array of all valid agent statuses
 */
export const AGENT_STATUSES = Object.values(AgentStatus) as [AgentStatus, ...AgentStatus[]];

/**
 * Zod schema for agent status validation
 */
export const agentStatusSchema = z.enum(AGENT_STATUSES);

// ============================================================================
// Code Change Type Constants
// ============================================================================

/**
 * Types of code changes in diffs
 *
 * @example
 * ```typescript
 * const change = { changeType: ChangeType.MODIFIED };
 * ```
 */
export enum ChangeType {
  /** New file added */
  ADDED = 'added',
  /** Existing file modified */
  MODIFIED = 'modified',
  /** File deleted */
  DELETED = 'deleted',
  /** File renamed/moved */
  RENAMED = 'renamed',
}

/**
 * Array of all valid change types
 */
export const CHANGE_TYPES = Object.values(ChangeType) as [ChangeType, ...ChangeType[]];

/**
 * Zod schema for change type validation
 */
export const changeTypeSchema = z.enum(CHANGE_TYPES);

// ============================================================================
// Event Type Constants
// ============================================================================

/**
 * Activity log event types for tracking agent actions
 *
 * @example
 * ```typescript
 * const log = { eventType: EventType.TASK_CREATED };
 * ```
 */
export enum EventType {
  /** Task was created */
  TASK_CREATED = 'task_created',
  /** Task was claimed by an agent */
  TASK_CLAIMED = 'task_claimed',
  /** Task work was started */
  TASK_STARTED = 'task_started',
  /** Task progress was updated */
  TASK_PROGRESSED = 'task_progressed',
  /** Task was completed successfully */
  TASK_COMPLETED = 'task_completed',
  /** Task failed */
  TASK_FAILED = 'task_failed',
  /** Task was moved between statuses */
  TASK_MOVED = 'task_moved',
  /** Comment was added to a task */
  COMMENT_ADDED = 'comment_added',
  /** File was modified */
  FILE_MODIFIED = 'file_modified',
}

/**
 * Array of all valid event types
 */
export const EVENT_TYPES = Object.values(EventType) as [EventType, ...EventType[]];

/**
 * Zod schema for event type validation
 */
export const eventTypeSchema = z.enum(EVENT_TYPES);

// ============================================================================
// Author Type Constants
// ============================================================================

/**
 * Types of comment authors
 *
 * @example
 * ```typescript
 * const comment = { authorType: AuthorType.AGENT };
 * ```
 */
export enum AuthorType {
  /** Comment from an AI agent */
  AGENT = 'agent',
  /** Comment from a human user */
  HUMAN = 'human',
}

/**
 * Array of all valid author types
 */
export const AUTHOR_TYPES = Object.values(AuthorType) as [AuthorType, ...AuthorType[]];

/**
 * Zod schema for author type validation
 */
export const authorTypeSchema = z.enum(AUTHOR_TYPES);

// ============================================================================
// Diff Line Type Constants
// ============================================================================

/**
 * Types of lines in a code diff
 */
export enum DiffLineType {
  /** Unchanged context line */
  CONTEXT = 'context',
  /** Added line */
  ADDITION = 'addition',
  /** Deleted line */
  DELETION = 'deletion',
}

/**
 * Array of all valid diff line types
 */
export const DIFF_LINE_TYPES = Object.values(DiffLineType) as [DiffLineType, ...DiffLineType[]];

/**
 * Zod schema for diff line type validation
 */
export const diffLineTypeSchema = z.enum(DIFF_LINE_TYPES);

// ============================================================================
// Default Values and Limits
// ============================================================================

/**
 * Default values for various entities
 */
export const DEFAULTS = {
  /** Default task importance level */
  TASK_IMPORTANCE: TaskImportance.MEDIUM,

  /** Default task status */
  TASK_STATUS: TaskStatus.TODO,

  /** Default agent status */
  AGENT_STATUS: AgentStatus.IDLE,

  /** Default maximum concurrent tasks per agent */
  MAX_CONCURRENT_TASKS: 5,

  /** Default auto-archive time in hours */
  AUTO_ARCHIVE_HOURS: 24,

  /** Default progress value (0-100) */
  TASK_PROGRESS: 0,
} as const;

/**
 * Validation limits and constraints
 */
export const LIMITS = {
  /** Minimum task progress percentage */
  MIN_PROGRESS: 0,

  /** Maximum task progress percentage */
  MAX_PROGRESS: 100,

  /** Minimum success rate percentage */
  MIN_SUCCESS_RATE: 0,

  /** Maximum success rate percentage */
  MAX_SUCCESS_RATE: 100,

  /** Maximum retry count for failed tasks */
  MAX_RETRY_COUNT: 3,

  /** Maximum WIP (Work In Progress) limit per column */
  MAX_WIP_LIMIT: 100,

  /** Minimum column position */
  MIN_COLUMN_POSITION: 0,

  /** Maximum title length */
  MAX_TITLE_LENGTH: 500,

  /** Maximum description length */
  MAX_DESCRIPTION_LENGTH: 5000,

  /** Maximum comment content length */
  MAX_COMMENT_LENGTH: 10000,
} as const;

/**
 * Time-related constants (in seconds)
 */
export const TIME = {
  /** Heartbeat timeout (5 minutes) */
  HEARTBEAT_TIMEOUT: 300,

  /** Session idle timeout (30 minutes) */
  SESSION_IDLE_TIMEOUT: 1800,

  /** Task estimated duration default (1 hour) */
  DEFAULT_TASK_DURATION: 3600,
} as const;

/**
 * WebSocket message types
 */
export const WS_MESSAGE_TYPES = {
  // Client messages
  CLIENT: {
    SUBSCRIBE: 'subscribe',
    UNSUBSCRIBE: 'unsubscribe',
    HEARTBEAT: 'heartbeat',
  },

  // Server messages
  SERVER: {
    TASK_CREATED: 'task_created',
    TASK_UPDATED: 'task_updated',
    TASK_MOVED: 'task_moved',
    TASK_DELETED: 'task_deleted',
    AGENT_STATUS_CHANGED: 'agent_status_changed',
    ACTIVITY_LOGGED: 'activity_logged',
    COMMENT_ADDED: 'comment_added',
  },
} as const;

/**
 * Status transitions map - defines valid status transitions
 */
export const VALID_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.TODO]: [TaskStatus.CLAIMED, TaskStatus.IN_PROGRESS],
  [TaskStatus.CLAIMED]: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.REVIEW, TaskStatus.DONE, TaskStatus.TODO],
  [TaskStatus.REVIEW]: [TaskStatus.DONE, TaskStatus.IN_PROGRESS],
  [TaskStatus.DONE]: [TaskStatus.TODO], // Can reopen tasks
};

/**
 * Helper function to check if a status transition is valid
 *
 * @example
 * ```typescript
 * isValidStatusTransition(TaskStatus.TODO, TaskStatus.IN_PROGRESS); // true
 * isValidStatusTransition(TaskStatus.DONE, TaskStatus.CLAIMED); // false
 * ```
 */
export function isValidStatusTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Color palette for UI consistency
 */
export const COLORS = {
  IMPORTANCE: {
    [TaskImportance.CRITICAL]: '#EF4444', // Red
    [TaskImportance.HIGH]: '#F59E0B',     // Orange
    [TaskImportance.MEDIUM]: '#3B82F6',   // Blue
    [TaskImportance.LOW]: '#6B7280',      // Gray
  },

  STATUS: {
    [TaskStatus.TODO]: '#6B7280',         // Gray
    [TaskStatus.CLAIMED]: '#8B5CF6',      // Purple
    [TaskStatus.IN_PROGRESS]: '#3B82F6',  // Blue
    [TaskStatus.REVIEW]: '#F59E0B',       // Orange
    [TaskStatus.DONE]: '#10B981',         // Green
  },

  AGENT: {
    [AgentStatus.ACTIVE]: '#10B981',      // Green
    [AgentStatus.IDLE]: '#F59E0B',        // Orange
    [AgentStatus.OFFLINE]: '#6B7280',     // Gray
  },

  CHANGE: {
    [ChangeType.ADDED]: '#10B981',        // Green
    [ChangeType.MODIFIED]: '#3B82F6',     // Blue
    [ChangeType.DELETED]: '#EF4444',      // Red
    [ChangeType.RENAMED]: '#8B5CF6',      // Purple
  },
} as const;
