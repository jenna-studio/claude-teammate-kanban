/**
 * Board-related types, interfaces, and validation schemas
 * @module board-types
 */

import { z } from 'zod';
import { LIMITS, DEFAULTS } from './constants.js';
import type { AgentTask } from './task-types.js';
import type { Agent } from './agent-types.js';

// ============================================================================
// Board Column Types
// ============================================================================

/**
 * Customizable Kanban board columns
 *
 * @example
 * ```typescript
 * const column: BoardColumn = {
 *   id: 'col-1',
 *   name: 'In Progress',
 *   position: 2,
 *   wipLimit: 5,
 *   color: '#3B82F6'
 * };
 * ```
 */
export interface BoardColumn {
  /** Unique column identifier */
  id: string;
  /** Display name of the column */
  name: string;
  /** Position/order of the column (0-based) */
  position: number;
  /** Work In Progress limit (optional) */
  wipLimit?: number;
  /** Column color (hex code) */
  color?: string;
}

/**
 * Zod schema for BoardColumn validation
 */
export const boardColumnSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  position: z.number().int().min(LIMITS.MIN_COLUMN_POSITION),
  wipLimit: z.number().int().positive().max(LIMITS.MAX_WIP_LIMIT).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// ============================================================================
// Board Settings Types
// ============================================================================

/**
 * Configuration settings for a board
 *
 * @example
 * ```typescript
 * const settings: BoardSettings = {
 *   autoArchiveCompleted: true,
 *   archiveAfterHours: 48,
 *   enableNotifications: true,
 *   criticalTaskAlerts: true
 * };
 * ```
 */
export interface BoardSettings {
  /** Automatically archive completed tasks */
  autoArchiveCompleted: boolean;
  /** Hours after completion before archiving */
  archiveAfterHours: number;
  /** Enable notifications for board events */
  enableNotifications: boolean;
  /** Send alerts for critical tasks */
  criticalTaskAlerts: boolean;
}

/**
 * Zod schema for BoardSettings validation
 */
export const boardSettingsSchema = z.object({
  autoArchiveCompleted: z.boolean(),
  archiveAfterHours: z.number().int().positive(),
  enableNotifications: z.boolean(),
  criticalTaskAlerts: z.boolean(),
});

/**
 * Default board settings
 */
export const DEFAULT_BOARD_SETTINGS: BoardSettings = {
  autoArchiveCompleted: true,
  archiveAfterHours: DEFAULTS.AUTO_ARCHIVE_HOURS,
  enableNotifications: true,
  criticalTaskAlerts: true,
};

// ============================================================================
// Board Types
// ============================================================================

/**
 * A workspace for organizing agent tasks
 *
 * @example
 * ```typescript
 * const board: Board = {
 *   id: 'board-1',
 *   name: 'Sprint 23 Development',
 *   description: 'Tasks for the current development sprint',
 *   projectPath: '/home/user/projects/my-app',
 *   repository: 'https://github.com/org/my-app',
 *   agentIds: ['agent-1', 'agent-2'],
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 *   settings: DEFAULT_BOARD_SETTINGS
 * };
 * ```
 */
export interface Board {
  // ========== Identity ==========
  /** Unique board identifier */
  id: string;
  /** Board name/title */
  name: string;
  /** Board description */
  description?: string;

  // ========== Configuration ==========
  /** Custom board columns (if not using defaults) */
  columns?: BoardColumn[];

  // ========== Project Context ==========
  /** Local file system path to the project */
  projectPath?: string;
  /** Git repository URL */
  repository?: string;

  // ========== Team ==========
  /** Agent IDs assigned to this board */
  agentIds?: string[];

  // ========== Timestamps ==========
  /** When the board was created */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;

  // ========== Settings ==========
  /** Board configuration settings */
  settings: BoardSettings;
}

/**
 * Zod schema for Board validation
 */
export const boardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(LIMITS.MAX_TITLE_LENGTH),
  description: z.string().max(LIMITS.MAX_DESCRIPTION_LENGTH).optional(),
  columns: z.array(boardColumnSchema).optional(),
  projectPath: z.string().optional(),
  repository: z.string().url().optional(),
  agentIds: z.array(z.string()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  settings: boardSettingsSchema,
});

// ============================================================================
// Board Statistics Types
// ============================================================================

/**
 * Statistical information about a board
 *
 * @example
 * ```typescript
 * const stats: BoardStatistics = {
 *   totalTasks: 50,
 *   todoCount: 10,
 *   claimedCount: 5,
 *   inProgressCount: 8,
 *   reviewCount: 7,
 *   doneCount: 20,
 *   averageCompletionTime: 3600,
 *   totalTokensUsed: 150000
 * };
 * ```
 */
export interface BoardStatistics {
  /** Total number of tasks on the board */
  totalTasks: number;
  /** Number of tasks in TODO status */
  todoCount: number;
  /** Number of tasks in CLAIMED status */
  claimedCount: number;
  /** Number of tasks in IN_PROGRESS status */
  inProgressCount: number;
  /** Number of tasks in REVIEW status */
  reviewCount: number;
  /** Number of tasks in DONE status */
  doneCount: number;
  /** Average task completion time in seconds */
  averageCompletionTime: number;
  /** Total tokens used across all tasks */
  totalTokensUsed: number;
}

/**
 * Zod schema for BoardStatistics validation
 */
export const boardStatisticsSchema = z.object({
  totalTasks: z.number().int().min(0),
  todoCount: z.number().int().min(0),
  claimedCount: z.number().int().min(0),
  inProgressCount: z.number().int().min(0),
  reviewCount: z.number().int().min(0),
  doneCount: z.number().int().min(0),
  averageCompletionTime: z.number().min(0),
  totalTokensUsed: z.number().int().min(0),
});

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Complete board response with all related data
 *
 * @example
 * ```typescript
 * const response: BoardResponse = {
 *   board: { ... },
 *   columns: [...],
 *   tasks: [...],
 *   agents: [...],
 *   activeSessionCount: 3,
 *   statistics: { ... }
 * };
 * ```
 */
export interface BoardResponse {
  /** The board entity */
  board: Board;
  /** Board columns */
  columns: BoardColumn[];
  /** All tasks on the board */
  tasks: AgentTask[];
  /** Agents assigned to the board */
  agents: Agent[];
  /** Number of active sessions */
  activeSessionCount: number;
  /** Board statistics */
  statistics: BoardStatistics;
}

/**
 * Zod schema for BoardResponse validation
 */
export const boardResponseSchema = z.object({
  board: boardSchema,
  columns: z.array(boardColumnSchema),
  tasks: z.array(z.any()), // AgentTask schema imported separately
  agents: z.array(z.any()), // Agent schema imported separately
  activeSessionCount: z.number().int().min(0),
  statistics: boardStatisticsSchema,
});

// ============================================================================
// MCP Tool Input Types for Board Operations
// ============================================================================

/**
 * Input for creating a new board
 *
 * @example
 * ```typescript
 * const input: CreateBoardInput = {
 *   name: 'Q1 2024 Sprint',
 *   description: 'First quarter development tasks',
 *   projectPath: '/home/user/projects/app',
 *   repository: 'https://github.com/org/app'
 * };
 * ```
 */
export interface CreateBoardInput {
  /** Board name */
  name: string;
  /** Board description */
  description?: string;
  /** Project file path */
  projectPath?: string;
  /** Git repository URL */
  repository?: string;
}

/**
 * Zod schema for CreateBoardInput validation
 */
export const createBoardInputSchema = z.object({
  name: z.string().min(1).max(LIMITS.MAX_TITLE_LENGTH),
  description: z.string().max(LIMITS.MAX_DESCRIPTION_LENGTH).optional(),
  projectPath: z.string().optional(),
  repository: z.string().url().optional(),
});

/**
 * Input for updating board settings
 *
 * @example
 * ```typescript
 * const input: UpdateBoardSettingsInput = {
 *   boardId: 'board-1',
 *   settings: {
 *     autoArchiveCompleted: false,
 *     archiveAfterHours: 72,
 *     enableNotifications: true,
 *     criticalTaskAlerts: true
 *   }
 * };
 * ```
 */
export interface UpdateBoardSettingsInput {
  /** Board ID to update */
  boardId: string;
  /** New settings (partial update supported) */
  settings: Partial<BoardSettings>;
}

/**
 * Zod schema for UpdateBoardSettingsInput validation
 */
export const updateBoardSettingsInputSchema = z.object({
  boardId: z.string().min(1),
  settings: boardSettingsSchema.partial(),
});

/**
 * Input for adding a column to a board
 *
 * @example
 * ```typescript
 * const input: AddBoardColumnInput = {
 *   boardId: 'board-1',
 *   name: 'Code Review',
 *   position: 3,
 *   wipLimit: 5,
 *   color: '#F59E0B'
 * };
 * ```
 */
export interface AddBoardColumnInput {
  /** Board ID to add column to */
  boardId: string;
  /** Column name */
  name: string;
  /** Column position */
  position: number;
  /** WIP limit (optional) */
  wipLimit?: number;
  /** Column color (optional) */
  color?: string;
}

/**
 * Zod schema for AddBoardColumnInput validation
 */
export const addBoardColumnInputSchema = z.object({
  boardId: z.string().min(1),
  name: z.string().min(1),
  position: z.number().int().min(LIMITS.MIN_COLUMN_POSITION),
  wipLimit: z.number().int().positive().max(LIMITS.MAX_WIP_LIMIT).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

/**
 * Input for updating a board column
 *
 * @example
 * ```typescript
 * const input: UpdateBoardColumnInput = {
 *   boardId: 'board-1',
 *   columnId: 'col-1',
 *   name: 'In Review',
 *   wipLimit: 3
 * };
 * ```
 */
export interface UpdateBoardColumnInput {
  /** Board ID */
  boardId: string;
  /** Column ID to update */
  columnId: string;
  /** New column name (optional) */
  name?: string;
  /** New position (optional) */
  position?: number;
  /** New WIP limit (optional) */
  wipLimit?: number;
  /** New color (optional) */
  color?: string;
}

/**
 * Zod schema for UpdateBoardColumnInput validation
 */
export const updateBoardColumnInputSchema = z.object({
  boardId: z.string().min(1),
  columnId: z.string().min(1),
  name: z.string().min(1).optional(),
  position: z.number().int().min(LIMITS.MIN_COLUMN_POSITION).optional(),
  wipLimit: z.number().int().positive().max(LIMITS.MAX_WIP_LIMIT).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

/**
 * Input for deleting a board column
 *
 * @example
 * ```typescript
 * const input: DeleteBoardColumnInput = {
 *   boardId: 'board-1',
 *   columnId: 'col-1'
 * };
 * ```
 */
export interface DeleteBoardColumnInput {
  /** Board ID */
  boardId: string;
  /** Column ID to delete */
  columnId: string;
}

/**
 * Zod schema for DeleteBoardColumnInput validation
 */
export const deleteBoardColumnInputSchema = z.object({
  boardId: z.string().min(1),
  columnId: z.string().min(1),
});

/**
 * Input for assigning an agent to a board
 *
 * @example
 * ```typescript
 * const input: AssignAgentToBoardInput = {
 *   boardId: 'board-1',
 *   agentId: 'agent-1'
 * };
 * ```
 */
export interface AssignAgentToBoardInput {
  /** Board ID */
  boardId: string;
  /** Agent ID to assign */
  agentId: string;
}

/**
 * Zod schema for AssignAgentToBoardInput validation
 */
export const assignAgentToBoardInputSchema = z.object({
  boardId: z.string().min(1),
  agentId: z.string().min(1),
});

/**
 * Input for removing an agent from a board
 *
 * @example
 * ```typescript
 * const input: RemoveAgentFromBoardInput = {
 *   boardId: 'board-1',
 *   agentId: 'agent-1'
 * };
 * ```
 */
export interface RemoveAgentFromBoardInput {
  /** Board ID */
  boardId: string;
  /** Agent ID to remove */
  agentId: string;
}

/**
 * Zod schema for RemoveAgentFromBoardInput validation
 */
export const removeAgentFromBoardInputSchema = z.object({
  boardId: z.string().min(1),
  agentId: z.string().min(1),
});
