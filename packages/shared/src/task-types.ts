/**
 * Task-related types, interfaces, and validation schemas
 * @module task-types
 */

import { z } from 'zod';
import {
  TaskStatus,
  TaskImportance,
  ChangeType,
  DiffLineType,
  taskStatusSchema,
  taskImportanceSchema,
  changeTypeSchema,
  diffLineTypeSchema,
  LIMITS,
} from './constants.js';

// ============================================================================
// Code Diff Types
// ============================================================================

/**
 * A single line in a code diff
 *
 * @example
 * ```typescript
 * const line: DiffLine = {
 *   type: DiffLineType.ADDITION,
 *   content: '  console.log("Hello");',
 *   newLineNumber: 42
 * };
 * ```
 */
export interface DiffLine {
  /** Type of diff line (context, addition, deletion) */
  type: DiffLineType;
  /** The actual line content */
  content: string;
  /** Line number in the old file (for deletions and context) */
  oldLineNumber?: number;
  /** Line number in the new file (for additions and context) */
  newLineNumber?: number;
}

/**
 * Zod schema for DiffLine validation
 */
export const diffLineSchema = z.object({
  type: diffLineTypeSchema,
  content: z.string(),
  oldLineNumber: z.number().int().positive().optional(),
  newLineNumber: z.number().int().positive().optional(),
});

/**
 * A section of changes within a file (hunk)
 *
 * @example
 * ```typescript
 * const hunk: DiffHunk = {
 *   oldStart: 10,
 *   oldLines: 5,
 *   newStart: 10,
 *   newLines: 7,
 *   lines: [...]
 * };
 * ```
 */
export interface DiffHunk {
  /** Starting line number in the old file */
  oldStart: number;
  /** Number of lines from the old file */
  oldLines: number;
  /** Starting line number in the new file */
  newStart: number;
  /** Number of lines in the new file */
  newLines: number;
  /** Array of diff lines in this hunk */
  lines: DiffLine[];
}

/**
 * Zod schema for DiffHunk validation
 */
export const diffHunkSchema = z.object({
  oldStart: z.number().int().min(0),
  oldLines: z.number().int().min(0),
  newStart: z.number().int().min(0),
  newLines: z.number().int().min(0),
  lines: z.array(diffLineSchema),
});

/**
 * Code changes for a single file
 *
 * @example
 * ```typescript
 * const change: CodeChange = {
 *   filePath: 'src/components/Button.tsx',
 *   changeType: ChangeType.MODIFIED,
 *   diff: '--- a/src/components/Button.tsx\n+++ b/src/components/Button.tsx\n...',
 *   language: 'typescript',
 *   linesAdded: 10,
 *   linesDeleted: 5
 * };
 * ```
 */
export interface CodeChange {
  /** Path to the file */
  filePath: string;
  /** Type of change (added, modified, deleted, renamed) */
  changeType: ChangeType;
  /** Original path (for renamed files) */
  oldPath?: string;
  /** Unified diff format string */
  diff: string;
  /** Programming language for syntax highlighting */
  language?: string;
  /** Parsed diff hunks */
  hunks?: DiffHunk[];
  /** Number of lines added */
  linesAdded?: number;
  /** Number of lines deleted */
  linesDeleted?: number;
}

/**
 * Zod schema for CodeChange validation
 */
export const codeChangeSchema = z.object({
  filePath: z.string().min(1),
  changeType: changeTypeSchema,
  oldPath: z.string().optional(),
  diff: z.string(),
  language: z.string().optional(),
  hunks: z.array(diffHunkSchema).optional(),
  linesAdded: z.number().int().min(0).optional(),
  linesDeleted: z.number().int().min(0).optional(),
});

/**
 * Summary of code changes across multiple files
 *
 * @example
 * ```typescript
 * const summary: DiffSummary = {
 *   filesChanged: 3,
 *   insertions: 45,
 *   deletions: 12
 * };
 * ```
 */
export interface DiffSummary {
  /** Total number of files changed */
  filesChanged: number;
  /** Total number of lines inserted */
  insertions: number;
  /** Total number of lines deleted */
  deletions: number;
}

/**
 * Zod schema for DiffSummary validation
 */
export const diffSummarySchema = z.object({
  filesChanged: z.number().int().min(0),
  insertions: z.number().int().min(0),
  deletions: z.number().int().min(0),
});

// ============================================================================
// Task Types
// ============================================================================

/**
 * Lines changed statistics
 *
 * @example
 * ```typescript
 * const stats: LinesChanged = {
 *   added: 50,
 *   removed: 20
 * };
 * ```
 */
export interface LinesChanged {
  /** Number of lines added */
  added: number;
  /** Number of lines removed */
  removed: number;
}

/**
 * Zod schema for LinesChanged validation
 */
export const linesChangedSchema = z.object({
  added: z.number().int().min(0),
  removed: z.number().int().min(0),
});

/**
 * Primary entity representing work being done by an agent
 *
 * @example
 * ```typescript
 * const task: AgentTask = {
 *   id: 'task-123',
 *   boardId: 'board-1',
 *   title: 'Implement user authentication',
 *   description: 'Add JWT-based authentication to the API',
 *   importance: TaskImportance.HIGH,
 *   status: TaskStatus.IN_PROGRESS,
 *   agentId: 'agent-1',
 *   agentName: 'CodeAgent',
 *   agentType: 'development',
 *   sessionId: 'session-abc',
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 *   progress: 45,
 *   currentAction: 'Writing authentication middleware'
 * };
 * ```
 */
export interface AgentTask {
  // ========== Identity ==========
  /** Unique task identifier */
  id: string;
  /** Board this task belongs to */
  boardId: string;

  // ========== Task Information ==========
  /** Task title/summary */
  title: string;
  /** Detailed task description */
  description?: string;

  // ========== Importance/Priority ==========
  /** Task importance level */
  importance: TaskImportance;

  // ========== Status (Kanban columns) ==========
  /** Current task status */
  status: TaskStatus;

  // ========== Agent Information ==========
  /** ID of the agent working on this task */
  agentId: string;
  /** Display name of the agent */
  agentName: string;
  /** Type/category of the agent */
  agentType: string;
  /** Current session ID */
  sessionId: string;

  // ========== Timestamps ==========
  /** When the task was created */
  createdAt: Date;
  /** When the task was claimed by an agent */
  claimedAt?: Date;
  /** When work actually started on the task */
  startedAt?: Date;
  /** When the task was completed */
  completedAt?: Date;
  /** Last update timestamp */
  updatedAt: Date;

  // ========== Progress Tracking ==========
  /** Progress percentage (0-100) */
  progress?: number;
  /** Current action being performed */
  currentAction?: string;

  // ========== Context & Metadata ==========
  /** Files being worked on */
  files?: string[];
  /** Lines changed statistics */
  linesChanged?: LinesChanged;
  /** Total tokens used by the agent */
  tokensUsed?: number;
  /** Estimated duration in seconds */
  estimatedDuration?: number;
  /** Actual duration in seconds */
  actualDuration?: number;

  // ========== Relationships ==========
  /** Parent task ID (for subtasks) */
  parentTaskId?: string;
  /** Array of task IDs blocking this task */
  blockedBy?: string[];
  /** Tags for categorization */
  tags?: string[];

  // ========== Error Handling ==========
  /** Error message if task failed */
  errorMessage?: string;
  /** Number of retry attempts */
  retryCount?: number;

  // ========== Code Changes ==========
  /** Detailed code changes */
  codeChanges?: CodeChange[];
  /** Git commit hash */
  commitHash?: string;
  /** Summary of all changes */
  diffSummary?: DiffSummary;
}

/**
 * Zod schema for AgentTask validation
 */
export const agentTaskSchema = z.object({
  // Identity
  id: z.string().min(1),
  boardId: z.string().min(1),

  // Task Information
  title: z.string().min(1).max(LIMITS.MAX_TITLE_LENGTH),
  description: z.string().max(LIMITS.MAX_DESCRIPTION_LENGTH).optional(),

  // Importance/Priority
  importance: taskImportanceSchema,

  // Status
  status: taskStatusSchema,

  // Agent Information
  agentId: z.string().min(1),
  agentName: z.string().min(1),
  agentType: z.string().min(1),
  sessionId: z.string().min(1),

  // Timestamps
  createdAt: z.date(),
  claimedAt: z.date().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  updatedAt: z.date(),

  // Progress Tracking
  progress: z.number().int().min(LIMITS.MIN_PROGRESS).max(LIMITS.MAX_PROGRESS).optional(),
  currentAction: z.string().optional(),

  // Context & Metadata
  files: z.array(z.string()).optional(),
  linesChanged: linesChangedSchema.optional(),
  tokensUsed: z.number().int().min(0).optional(),
  estimatedDuration: z.number().int().min(0).optional(),
  actualDuration: z.number().int().min(0).optional(),

  // Relationships
  parentTaskId: z.string().optional(),
  blockedBy: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),

  // Error Handling
  errorMessage: z.string().optional(),
  retryCount: z.number().int().min(0).max(LIMITS.MAX_RETRY_COUNT).optional(),

  // Code Changes
  codeChanges: z.array(codeChangeSchema).optional(),
  commitHash: z.string().optional(),
  diffSummary: diffSummarySchema.optional(),
});

// ============================================================================
// Comment Types
// ============================================================================

/**
 * Comment author type
 */
export type AuthorType = 'agent' | 'human';

/**
 * Zod schema for author type validation
 */
export const authorTypeSchema = z.enum(['agent', 'human']);

/**
 * Inter-agent and human communication on tasks
 *
 * @example
 * ```typescript
 * const comment: Comment = {
 *   id: 'comment-123',
 *   taskId: 'task-456',
 *   author: 'CodeAgent',
 *   authorType: 'agent',
 *   content: 'Completed authentication middleware implementation',
 *   createdAt: new Date()
 * };
 * ```
 */
export interface Comment {
  /** Unique comment identifier */
  id: string;
  /** Task this comment belongs to */
  taskId: string;

  /** Name of the comment author */
  author: string;
  /** Type of author (agent or human) */
  authorType: AuthorType;

  /** Comment content/message */
  content: string;

  /** When the comment was created */
  createdAt: Date;
  /** When the comment was last updated */
  updatedAt?: Date;

  /** Parent comment ID (for threading) */
  parentCommentId?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Zod schema for Comment validation
 */
export const commentSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  author: z.string().min(1),
  authorType: authorTypeSchema,
  content: z.string().min(1).max(LIMITS.MAX_COMMENT_LENGTH),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
  parentCommentId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// MCP Tool Input Types for Task Operations
// ============================================================================

/**
 * Input for starting a new task
 *
 * @example
 * ```typescript
 * const input: StartTaskInput = {
 *   boardId: 'board-1',
 *   sessionId: 'session-abc',
 *   title: 'Fix login bug',
 *   importance: TaskImportance.HIGH,
 *   tags: ['bug', 'authentication']
 * };
 * ```
 */
export interface StartTaskInput {
  /** Board to create task in */
  boardId: string;
  /** Current agent session ID */
  sessionId: string;
  /** Task title */
  title: string;
  /** Task description */
  description?: string;
  /** Task importance level */
  importance?: TaskImportance;
  /** Estimated duration in seconds */
  estimatedDuration?: number;
  /** Task tags */
  tags?: string[];
  /** Parent task ID (for subtasks) */
  parentTaskId?: string;
}

/**
 * Zod schema for StartTaskInput validation
 */
export const startTaskInputSchema = z.object({
  boardId: z.string().min(1),
  sessionId: z.string().min(1),
  title: z.string().min(1).max(LIMITS.MAX_TITLE_LENGTH),
  description: z.string().max(LIMITS.MAX_DESCRIPTION_LENGTH).optional(),
  importance: taskImportanceSchema.optional(),
  estimatedDuration: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  parentTaskId: z.string().optional(),
});

/**
 * Input for updating task status
 *
 * @example
 * ```typescript
 * const input: UpdateTaskStatusInput = {
 *   taskId: 'task-123',
 *   status: TaskStatus.IN_PROGRESS,
 *   currentAction: 'Implementing authentication logic'
 * };
 * ```
 */
export interface UpdateTaskStatusInput {
  /** Task ID to update */
  taskId: string;
  /** New status */
  status: TaskStatus;
  /** Current action being performed */
  currentAction?: string;
}

/**
 * Zod schema for UpdateTaskStatusInput validation
 */
export const updateTaskStatusInputSchema = z.object({
  taskId: z.string().min(1),
  status: taskStatusSchema,
  currentAction: z.string().optional(),
});

/**
 * Input for updating task progress
 *
 * @example
 * ```typescript
 * const input: UpdateTaskProgressInput = {
 *   taskId: 'task-123',
 *   progress: 75,
 *   currentAction: 'Writing tests',
 *   files: ['src/auth.ts', 'tests/auth.test.ts'],
 *   linesChanged: { added: 150, removed: 20 },
 *   tokensUsed: 2500
 * };
 * ```
 */
export interface UpdateTaskProgressInput {
  /** Task ID to update */
  taskId: string;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Current action being performed */
  currentAction?: string;
  /** Files being worked on */
  files?: string[];
  /** Lines changed statistics */
  linesChanged?: LinesChanged;
  /** Tokens used */
  tokensUsed?: number;
  /** Code changes */
  codeChanges?: CodeChange[];
}

/**
 * Zod schema for UpdateTaskProgressInput validation
 */
export const updateTaskProgressInputSchema = z.object({
  taskId: z.string().min(1),
  progress: z.number().int().min(LIMITS.MIN_PROGRESS).max(LIMITS.MAX_PROGRESS).optional(),
  currentAction: z.string().optional(),
  files: z.array(z.string()).optional(),
  linesChanged: linesChangedSchema.optional(),
  tokensUsed: z.number().int().min(0).optional(),
  codeChanges: z.array(codeChangeSchema).optional(),
});

/**
 * Input for completing a task
 *
 * @example
 * ```typescript
 * const input: CompleteTaskInput = {
 *   taskId: 'task-123',
 *   summary: 'Successfully implemented user authentication',
 *   tokensUsed: 5000
 * };
 * ```
 */
export interface CompleteTaskInput {
  /** Task ID to complete */
  taskId: string;
  /** Completion summary */
  summary?: string;
  /** Total tokens used */
  tokensUsed?: number;
}

/**
 * Zod schema for CompleteTaskInput validation
 */
export const completeTaskInputSchema = z.object({
  taskId: z.string().min(1),
  summary: z.string().optional(),
  tokensUsed: z.number().int().min(0).optional(),
});

/**
 * Input for failing a task
 *
 * @example
 * ```typescript
 * const input: FailTaskInput = {
 *   taskId: 'task-123',
 *   errorMessage: 'Authentication API endpoint not responding',
 *   willRetry: true
 * };
 * ```
 */
export interface FailTaskInput {
  /** Task ID to fail */
  taskId: string;
  /** Error message */
  errorMessage: string;
  /** Whether the task will be retried */
  willRetry?: boolean;
}

/**
 * Zod schema for FailTaskInput validation
 */
export const failTaskInputSchema = z.object({
  taskId: z.string().min(1),
  errorMessage: z.string().min(1),
  willRetry: z.boolean().optional(),
});

/**
 * Input for adding a comment
 *
 * @example
 * ```typescript
 * const input: AddCommentInput = {
 *   taskId: 'task-123',
 *   author: 'CodeAgent',
 *   content: 'Waiting for database migration to complete'
 * };
 * ```
 */
export interface AddCommentInput {
  /** Task ID to comment on */
  taskId: string;
  /** Comment author name */
  author: string;
  /** Comment content */
  content: string;
}

/**
 * Zod schema for AddCommentInput validation
 */
export const addCommentInputSchema = z.object({
  taskId: z.string().min(1),
  author: z.string().min(1),
  content: z.string().min(1).max(LIMITS.MAX_COMMENT_LENGTH),
});

/**
 * Input for setting task blockers
 *
 * @example
 * ```typescript
 * const input: SetTaskBlockerInput = {
 *   taskId: 'task-123',
 *   blockedBy: ['task-456', 'task-789']
 * };
 * ```
 */
export interface SetTaskBlockerInput {
  /** Task ID to update */
  taskId: string;
  /** Array of task IDs blocking this task */
  blockedBy: string[];
}

/**
 * Zod schema for SetTaskBlockerInput validation
 */
export const setTaskBlockerInputSchema = z.object({
  taskId: z.string().min(1),
  blockedBy: z.array(z.string()),
});
