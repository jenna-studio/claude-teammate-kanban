/**
 * Agent-related types, interfaces, and validation schemas
 * @module agent-types
 */

import { z } from 'zod';
import {
  AgentStatus,
  EventType,
  agentStatusSchema,
  eventTypeSchema,
  DEFAULTS,
  LIMITS,
} from './constants.js';

// ============================================================================
// Agent Types
// ============================================================================

/**
 * Information about an AI agent
 *
 * @example
 * ```typescript
 * const agent: Agent = {
 *   id: 'agent-1',
 *   name: 'CodeAgent',
 *   type: 'development',
 *   status: AgentStatus.ACTIVE,
 *   capabilities: ['typescript', 'react', 'testing'],
 *   maxConcurrentTasks: 5,
 *   tasksCompleted: 42,
 *   tasksInProgress: 2,
 *   averageTaskDuration: 1800,
 *   successRate: 95,
 *   lastHeartbeat: new Date()
 * };
 * ```
 */
export interface Agent {
  // ========== Identity ==========
  /** Unique agent identifier */
  id: string;
  /** Display name of the agent */
  name: string;
  /** Agent type/category (e.g., 'development', 'testing', 'documentation') */
  type: string;

  // ========== Status ==========
  /** Current operational status */
  status: AgentStatus;
  /** Current session ID if active */
  currentSessionId?: string;

  // ========== Capabilities ==========
  /** List of agent capabilities/skills */
  capabilities?: string[];
  /** Maximum number of tasks the agent can handle concurrently */
  maxConcurrentTasks: number;

  // ========== Statistics ==========
  /** Total number of completed tasks */
  tasksCompleted: number;
  /** Number of tasks currently in progress */
  tasksInProgress: number;
  /** Average task duration in seconds */
  averageTaskDuration: number;
  /** Success rate percentage (0-100) */
  successRate: number;

  // ========== Heartbeat ==========
  /** Timestamp of last heartbeat/ping */
  lastHeartbeat: Date;

  // ========== Metadata ==========
  /** Additional agent metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Zod schema for Agent validation
 */
export const agentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  status: agentStatusSchema,
  currentSessionId: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  maxConcurrentTasks: z.number().int().positive(),
  tasksCompleted: z.number().int().min(0),
  tasksInProgress: z.number().int().min(0),
  averageTaskDuration: z.number().min(0),
  successRate: z.number().min(LIMITS.MIN_SUCCESS_RATE).max(LIMITS.MAX_SUCCESS_RATE),
  lastHeartbeat: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Session Types
// ============================================================================

/**
 * An agent work session
 *
 * @example
 * ```typescript
 * const session: Session = {
 *   id: 'session-abc',
 *   agentId: 'agent-1',
 *   boardId: 'board-1',
 *   startedAt: new Date(),
 *   lastHeartbeat: new Date(),
 *   isActive: true,
 *   tasksCreated: 5,
 *   tasksCompleted: 3,
 *   tasksFailed: 1,
 *   totalTokensUsed: 15000
 * };
 * ```
 */
export interface Session {
  // ========== Identity ==========
  /** Unique session identifier */
  id: string;
  /** Agent this session belongs to */
  agentId: string;
  /** Board this session is working on */
  boardId: string;

  // ========== Timing ==========
  /** When the session started */
  startedAt: Date;
  /** When the session ended (if completed) */
  endedAt?: Date;

  // ========== Health Check ==========
  /** Timestamp of last heartbeat */
  lastHeartbeat: Date;
  /** Whether the session is currently active */
  isActive: boolean;

  // ========== Session Statistics ==========
  /** Number of tasks created in this session */
  tasksCreated: number;
  /** Number of tasks completed in this session */
  tasksCompleted: number;
  /** Number of tasks that failed in this session */
  tasksFailed: number;
  /** Total tokens used in this session */
  totalTokensUsed: number;

  // ========== Context ==========
  /** Additional session metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Zod schema for Session validation
 */
export const sessionSchema = z.object({
  id: z.string().min(1),
  agentId: z.string().min(1),
  boardId: z.string().min(1),
  startedAt: z.date(),
  endedAt: z.date().optional(),
  lastHeartbeat: z.date(),
  isActive: z.boolean(),
  tasksCreated: z.number().int().min(0),
  tasksCompleted: z.number().int().min(0),
  tasksFailed: z.number().int().min(0),
  totalTokensUsed: z.number().int().min(0),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Activity Log Types
// ============================================================================

/**
 * Detailed timeline of agent activities
 *
 * @example
 * ```typescript
 * const log: ActivityLog = {
 *   id: 'log-123',
 *   timestamp: new Date(),
 *   eventType: EventType.TASK_COMPLETED,
 *   agentId: 'agent-1',
 *   agentName: 'CodeAgent',
 *   taskId: 'task-456',
 *   boardId: 'board-1',
 *   message: 'Completed authentication implementation',
 *   details: { tokensUsed: 3000, filesChanged: 5 }
 * };
 * ```
 */
export interface ActivityLog {
  // ========== Identity ==========
  /** Unique log entry identifier */
  id: string;
  /** Timestamp of the event */
  timestamp: Date;

  // ========== Event Information ==========
  /** Type of event that occurred */
  eventType: EventType;

  // ========== Actor Information ==========
  /** Agent who performed the action */
  agentId: string;
  /** Display name of the agent */
  agentName: string;

  // ========== Target Information ==========
  /** Task affected by this event (if applicable) */
  taskId?: string;
  /** Board this event occurred in */
  boardId: string;

  // ========== Details ==========
  /** Human-readable message describing the event */
  message: string;
  /** Additional event details */
  details?: Record<string, unknown>;

  // ========== Change Tracking ==========
  /** State before the change */
  before?: unknown;
  /** State after the change */
  after?: unknown;
}

/**
 * Zod schema for ActivityLog validation
 */
export const activityLogSchema = z.object({
  id: z.string().min(1),
  timestamp: z.date(),
  eventType: eventTypeSchema,
  agentId: z.string().min(1),
  agentName: z.string().min(1),
  taskId: z.string().optional(),
  boardId: z.string().min(1),
  message: z.string().min(1),
  details: z.record(z.unknown()).optional(),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
});

// ============================================================================
// MCP Tool Input Types for Agent Operations
// ============================================================================

/**
 * Input for registering a new agent
 *
 * @example
 * ```typescript
 * const input: RegisterAgentInput = {
 *   name: 'CodeAgent',
 *   type: 'development',
 *   capabilities: ['typescript', 'react', 'node'],
 *   maxConcurrentTasks: 5
 * };
 * ```
 */
export interface RegisterAgentInput {
  /** Agent display name */
  name: string;
  /** Agent type/category */
  type: string;
  /** Agent capabilities/skills */
  capabilities?: string[];
  /** Maximum concurrent tasks (defaults to 5) */
  maxConcurrentTasks?: number;
}

/**
 * Zod schema for RegisterAgentInput validation
 */
export const registerAgentInputSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  capabilities: z.array(z.string()).optional(),
  maxConcurrentTasks: z.number().int().positive().default(DEFAULTS.MAX_CONCURRENT_TASKS),
});

/**
 * Input for starting a new session
 *
 * @example
 * ```typescript
 * const input: StartSessionInput = {
 *   agentId: 'agent-1',
 *   boardId: 'board-1',
 *   metadata: { environment: 'production' }
 * };
 * ```
 */
export interface StartSessionInput {
  /** Agent starting the session */
  agentId: string;
  /** Board to work on */
  boardId: string;
  /** Session metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Zod schema for StartSessionInput validation
 */
export const startSessionInputSchema = z.object({
  agentId: z.string().min(1),
  boardId: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Input for sending agent heartbeat
 *
 * @example
 * ```typescript
 * const input: AgentHeartbeatInput = {
 *   agentId: 'agent-1',
 *   sessionId: 'session-abc',
 *   status: AgentStatus.ACTIVE,
 *   metadata: { currentTask: 'task-123' }
 * };
 * ```
 */
export interface AgentHeartbeatInput {
  /** Agent ID */
  agentId: string;
  /** Session ID */
  sessionId: string;
  /** Current agent status */
  status?: AgentStatus;
  /** Additional heartbeat data */
  metadata?: Record<string, unknown>;
}

/**
 * Zod schema for AgentHeartbeatInput validation
 */
export const agentHeartbeatInputSchema = z.object({
  agentId: z.string().min(1),
  sessionId: z.string().min(1),
  status: agentStatusSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Input for ending a session
 *
 * @example
 * ```typescript
 * const input: EndSessionInput = {
 *   sessionId: 'session-abc',
 *   reason: 'Completed all assigned tasks'
 * };
 * ```
 */
export interface EndSessionInput {
  /** Session to end */
  sessionId: string;
  /** Reason for ending the session */
  reason?: string;
}

/**
 * Zod schema for EndSessionInput validation
 */
export const endSessionInputSchema = z.object({
  sessionId: z.string().min(1),
  reason: z.string().optional(),
});

/**
 * Input for updating agent status
 *
 * @example
 * ```typescript
 * const input: UpdateAgentStatusInput = {
 *   agentId: 'agent-1',
 *   status: AgentStatus.IDLE
 * };
 * ```
 */
export interface UpdateAgentStatusInput {
  /** Agent ID to update */
  agentId: string;
  /** New status */
  status: AgentStatus;
}

/**
 * Zod schema for UpdateAgentStatusInput validation
 */
export const updateAgentStatusInputSchema = z.object({
  agentId: z.string().min(1),
  status: agentStatusSchema,
});

// ============================================================================
// Agent Statistics Types
// ============================================================================

/**
 * Aggregated statistics for an agent
 *
 * @example
 * ```typescript
 * const stats: AgentStatistics = {
 *   totalTasks: 100,
 *   completedTasks: 95,
 *   failedTasks: 3,
 *   inProgressTasks: 2,
 *   averageCompletionTime: 1800,
 *   totalTokensUsed: 250000,
 *   successRate: 95,
 *   totalWorkTime: 180000
 * };
 * ```
 */
export interface AgentStatistics {
  /** Total number of tasks handled */
  totalTasks: number;
  /** Number of completed tasks */
  completedTasks: number;
  /** Number of failed tasks */
  failedTasks: number;
  /** Number of currently in-progress tasks */
  inProgressTasks: number;
  /** Average task completion time in seconds */
  averageCompletionTime: number;
  /** Total tokens used across all tasks */
  totalTokensUsed: number;
  /** Success rate percentage (0-100) */
  successRate: number;
  /** Total work time in seconds */
  totalWorkTime: number;
}

/**
 * Zod schema for AgentStatistics validation
 */
export const agentStatisticsSchema = z.object({
  totalTasks: z.number().int().min(0),
  completedTasks: z.number().int().min(0),
  failedTasks: z.number().int().min(0),
  inProgressTasks: z.number().int().min(0),
  averageCompletionTime: z.number().min(0),
  totalTokensUsed: z.number().int().min(0),
  successRate: z.number().min(LIMITS.MIN_SUCCESS_RATE).max(LIMITS.MAX_SUCCESS_RATE),
  totalWorkTime: z.number().min(0),
});
