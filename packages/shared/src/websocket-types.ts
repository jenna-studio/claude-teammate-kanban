/**
 * WebSocket message types and schemas for real-time communication
 * @module websocket-types
 */

import { z } from 'zod';
import { TaskStatus, WS_MESSAGE_TYPES } from './constants.js';

// ============================================================================
// WebSocket Connection State
// ============================================================================

/**
 * WebSocket connection state
 */
export enum WebSocketState {
  /** Connection is being established */
  CONNECTING = 'connecting',
  /** Connection is open and ready */
  OPEN = 'open',
  /** Connection is closing */
  CLOSING = 'closing',
  /** Connection is closed */
  CLOSED = 'closed',
  /** Connection error occurred */
  ERROR = 'error',
}
import type { AgentTask } from './task-types.js';
import type { Agent } from './agent-types.js';
import type { ActivityLog } from './agent-types.js';
import type { Comment } from './task-types.js';

// ============================================================================
// Client Message Types (Client -> Server)
// ============================================================================

/**
 * Subscribe to board updates
 *
 * @example
 * ```typescript
 * const msg: SubscribeMessage = {
 *   type: 'subscribe',
 *   boardId: 'board-1'
 * };
 * ```
 */
export interface SubscribeMessage {
  /** Message type */
  type: 'subscribe';
  /** Board ID to subscribe to */
  boardId: string;
}

/**
 * Zod schema for SubscribeMessage validation
 */
export const subscribeMessageSchema = z.object({
  type: z.literal(WS_MESSAGE_TYPES.CLIENT.SUBSCRIBE),
  boardId: z.string().min(1),
});

/**
 * Unsubscribe from board updates
 *
 * @example
 * ```typescript
 * const msg: UnsubscribeMessage = {
 *   type: 'unsubscribe',
 *   boardId: 'board-1'
 * };
 * ```
 */
export interface UnsubscribeMessage {
  /** Message type */
  type: 'unsubscribe';
  /** Board ID to unsubscribe from */
  boardId: string;
}

/**
 * Zod schema for UnsubscribeMessage validation
 */
export const unsubscribeMessageSchema = z.object({
  type: z.literal(WS_MESSAGE_TYPES.CLIENT.UNSUBSCRIBE),
  boardId: z.string().min(1),
});

/**
 * Heartbeat/ping message to keep connection alive
 *
 * @example
 * ```typescript
 * const msg: HeartbeatMessage = {
 *   type: 'heartbeat'
 * };
 * ```
 */
export interface HeartbeatMessage {
  /** Message type */
  type: 'heartbeat';
}

/**
 * Zod schema for HeartbeatMessage validation
 */
export const heartbeatMessageSchema = z.object({
  type: z.literal(WS_MESSAGE_TYPES.CLIENT.HEARTBEAT),
});

/**
 * Union type of all client messages
 *
 * @example
 * ```typescript
 * function handleClientMessage(msg: ClientMessage) {
 *   switch (msg.type) {
 *     case 'subscribe':
 *       // msg is SubscribeMessage
 *       break;
 *     case 'unsubscribe':
 *       // msg is UnsubscribeMessage
 *       break;
 *     case 'heartbeat':
 *       // msg is HeartbeatMessage
 *       break;
 *   }
 * }
 * ```
 */
export type ClientMessage = SubscribeMessage | UnsubscribeMessage | HeartbeatMessage;

/**
 * Zod schema for ClientMessage validation (discriminated union)
 */
export const clientMessageSchema = z.discriminatedUnion('type', [
  subscribeMessageSchema,
  unsubscribeMessageSchema,
  heartbeatMessageSchema,
]);

// ============================================================================
// Server Message Types (Server -> Client)
// ============================================================================

/**
 * Task created event
 *
 * @example
 * ```typescript
 * const msg: TaskCreatedMessage = {
 *   type: 'task_created',
 *   task: { ... }
 * };
 * ```
 */
export interface TaskCreatedMessage {
  /** Message type */
  type: 'task_created';
  /** The newly created task */
  task: AgentTask;
}

/**
 * Zod schema for TaskCreatedMessage validation
 */
export const taskCreatedMessageSchema = z.object({
  type: z.literal(WS_MESSAGE_TYPES.SERVER.TASK_CREATED),
  task: z.any(), // AgentTask schema imported separately
});

/**
 * Task updated event
 *
 * @example
 * ```typescript
 * const msg: TaskUpdatedMessage = {
 *   type: 'task_updated',
 *   task: { ... }
 * };
 * ```
 */
export interface TaskUpdatedMessage {
  /** Message type */
  type: 'task_updated';
  /** The updated task */
  task: AgentTask;
}

/**
 * Zod schema for TaskUpdatedMessage validation
 */
export const taskUpdatedMessageSchema = z.object({
  type: z.literal(WS_MESSAGE_TYPES.SERVER.TASK_UPDATED),
  task: z.any(), // AgentTask schema imported separately
});

/**
 * Task moved between statuses
 *
 * @example
 * ```typescript
 * const msg: TaskMovedMessage = {
 *   type: 'task_moved',
 *   taskId: 'task-123',
 *   fromStatus: TaskStatus.TODO,
 *   toStatus: TaskStatus.IN_PROGRESS
 * };
 * ```
 */
export interface TaskMovedMessage {
  /** Message type */
  type: 'task_moved';
  /** Task ID that was moved */
  taskId: string;
  /** Previous status */
  fromStatus: TaskStatus;
  /** New status */
  toStatus: TaskStatus;
}

/**
 * Zod schema for TaskMovedMessage validation
 */
export const taskMovedMessageSchema = z.object({
  type: z.literal(WS_MESSAGE_TYPES.SERVER.TASK_MOVED),
  taskId: z.string().min(1),
  fromStatus: z.nativeEnum(TaskStatus),
  toStatus: z.nativeEnum(TaskStatus),
});

/**
 * Task deleted event
 *
 * @example
 * ```typescript
 * const msg: TaskDeletedMessage = {
 *   type: 'task_deleted',
 *   taskId: 'task-123'
 * };
 * ```
 */
export interface TaskDeletedMessage {
  /** Message type */
  type: 'task_deleted';
  /** ID of the deleted task */
  taskId: string;
}

/**
 * Zod schema for TaskDeletedMessage validation
 */
export const taskDeletedMessageSchema = z.object({
  type: z.literal(WS_MESSAGE_TYPES.SERVER.TASK_DELETED),
  taskId: z.string().min(1),
});

/**
 * Agent status changed event
 *
 * @example
 * ```typescript
 * const msg: AgentStatusChangedMessage = {
 *   type: 'agent_status_changed',
 *   agent: { ... }
 * };
 * ```
 */
export interface AgentStatusChangedMessage {
  /** Message type */
  type: 'agent_status_changed';
  /** The agent with updated status */
  agent: Agent;
}

/**
 * Zod schema for AgentStatusChangedMessage validation
 */
export const agentStatusChangedMessageSchema = z.object({
  type: z.literal(WS_MESSAGE_TYPES.SERVER.AGENT_STATUS_CHANGED),
  agent: z.any(), // Agent schema imported separately
});

/**
 * Activity logged event
 *
 * @example
 * ```typescript
 * const msg: ActivityLoggedMessage = {
 *   type: 'activity_logged',
 *   log: { ... }
 * };
 * ```
 */
export interface ActivityLoggedMessage {
  /** Message type */
  type: 'activity_logged';
  /** The activity log entry */
  log: ActivityLog;
}

/**
 * Zod schema for ActivityLoggedMessage validation
 */
export const activityLoggedMessageSchema = z.object({
  type: z.literal(WS_MESSAGE_TYPES.SERVER.ACTIVITY_LOGGED),
  log: z.any(), // ActivityLog schema imported separately
});

/**
 * Comment added event
 *
 * @example
 * ```typescript
 * const msg: CommentAddedMessage = {
 *   type: 'comment_added',
 *   comment: { ... }
 * };
 * ```
 */
export interface CommentAddedMessage {
  /** Message type */
  type: 'comment_added';
  /** The newly added comment */
  comment: Comment;
}

/**
 * Zod schema for CommentAddedMessage validation
 */
export const commentAddedMessageSchema = z.object({
  type: z.literal(WS_MESSAGE_TYPES.SERVER.COMMENT_ADDED),
  comment: z.any(), // Comment schema imported separately
});

/**
 * Union type of all server messages
 *
 * @example
 * ```typescript
 * function handleServerMessage(msg: ServerMessage) {
 *   switch (msg.type) {
 *     case 'task_created':
 *       console.log('New task:', msg.task);
 *       break;
 *     case 'task_updated':
 *       console.log('Updated task:', msg.task);
 *       break;
 *     case 'task_moved':
 *       console.log(`Task ${msg.taskId} moved from ${msg.fromStatus} to ${msg.toStatus}`);
 *       break;
 *     // ... handle other message types
 *   }
 * }
 * ```
 */
export type ServerMessage =
  | TaskCreatedMessage
  | TaskUpdatedMessage
  | TaskMovedMessage
  | TaskDeletedMessage
  | AgentStatusChangedMessage
  | ActivityLoggedMessage
  | CommentAddedMessage;

/**
 * Zod schema for ServerMessage validation (discriminated union)
 */
export const serverMessageSchema = z.discriminatedUnion('type', [
  taskCreatedMessageSchema,
  taskUpdatedMessageSchema,
  taskMovedMessageSchema,
  taskDeletedMessageSchema,
  agentStatusChangedMessageSchema,
  activityLoggedMessageSchema,
  commentAddedMessageSchema,
]);

// ============================================================================
// WebSocket Connection Types
// ============================================================================

/**
 * WebSocket connection options
 *
 * @example
 * ```typescript
 * const options: WebSocketOptions = {
 *   reconnect: true,
 *   reconnectInterval: 3000,
 *   maxReconnectAttempts: 5,
 *   heartbeatInterval: 30000
 * };
 * ```
 */
export interface WebSocketOptions {
  /** Enable automatic reconnection */
  reconnect?: boolean;
  /** Interval between reconnect attempts (ms) */
  reconnectInterval?: number;
  /** Maximum number of reconnect attempts */
  maxReconnectAttempts?: number;
  /** Interval for sending heartbeat messages (ms) */
  heartbeatInterval?: number;
}

/**
 * Zod schema for WebSocketOptions validation
 */
export const webSocketOptionsSchema = z.object({
  reconnect: z.boolean().optional(),
  reconnectInterval: z.number().int().positive().optional(),
  maxReconnectAttempts: z.number().int().positive().optional(),
  heartbeatInterval: z.number().int().positive().optional(),
});

/**
 * Default WebSocket options
 */
export const DEFAULT_WEBSOCKET_OPTIONS: Required<WebSocketOptions> = {
  reconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
};

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a message is a ClientMessage
 *
 * @example
 * ```typescript
 * if (isClientMessage(msg)) {
 *   // msg is ClientMessage
 *   console.log('Client message type:', msg.type);
 * }
 * ```
 */
export function isClientMessage(msg: unknown): msg is ClientMessage {
  if (typeof msg !== 'object' || msg === null) return false;
  const type = (msg as any).type;
  return (
    type === WS_MESSAGE_TYPES.CLIENT.SUBSCRIBE ||
    type === WS_MESSAGE_TYPES.CLIENT.UNSUBSCRIBE ||
    type === WS_MESSAGE_TYPES.CLIENT.HEARTBEAT
  );
}

/**
 * Type guard to check if a message is a ServerMessage
 *
 * @example
 * ```typescript
 * if (isServerMessage(msg)) {
 *   // msg is ServerMessage
 *   console.log('Server message type:', msg.type);
 * }
 * ```
 */
export function isServerMessage(msg: unknown): msg is ServerMessage {
  if (typeof msg !== 'object' || msg === null) return false;
  const type = (msg as any).type;
  return (
    type === WS_MESSAGE_TYPES.SERVER.TASK_CREATED ||
    type === WS_MESSAGE_TYPES.SERVER.TASK_UPDATED ||
    type === WS_MESSAGE_TYPES.SERVER.TASK_MOVED ||
    type === WS_MESSAGE_TYPES.SERVER.TASK_DELETED ||
    type === WS_MESSAGE_TYPES.SERVER.AGENT_STATUS_CHANGED ||
    type === WS_MESSAGE_TYPES.SERVER.ACTIVITY_LOGGED ||
    type === WS_MESSAGE_TYPES.SERVER.COMMENT_ADDED
  );
}
