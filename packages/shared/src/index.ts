/**
 * Shared types and utilities for Agent Track Dashboard
 * @packageDocumentation
 */

// ============================================================================
// Constants and Enums
// ============================================================================

export {
  // Enums
  TaskStatus,
  TaskImportance,
  AgentStatus,
  ChangeType,
  EventType,
  AuthorType,
  DiffLineType,

  // Zod Schemas for validation
  taskStatusSchema,
  taskImportanceSchema,
  agentStatusSchema,
  changeTypeSchema,
  eventTypeSchema,
  authorTypeSchema,
  diffLineTypeSchema,

  // Constants
  TASK_STATUSES,
  TASK_IMPORTANCES,
  AGENT_STATUSES,
  CHANGE_TYPES,
  EVENT_TYPES,
  AUTHOR_TYPES,
  DIFF_LINE_TYPES,
  DEFAULTS,
  LIMITS,
  TIME,
  WS_MESSAGE_TYPES,
  VALID_STATUS_TRANSITIONS,
  COLORS,
  IMPORTANCE_PRIORITY_VALUES,

  // Helper Functions
  isValidStatusTransition,
} from './constants.js';

// ============================================================================
// Task Types
// ============================================================================

export type {
  // Core Task Types
  AgentTask,
  Comment,

  // Code Change Types
  CodeChange,
  DiffHunk,
  DiffLine,
  DiffSummary,
  LinesChanged,

  // MCP Input Types
  StartTaskInput,
  UpdateTaskStatusInput,
  UpdateTaskProgressInput,
  CompleteTaskInput,
  FailTaskInput,
  AddCommentInput,
  SetTaskBlockerInput,
} from './task-types.js';

export {
  // Zod Schemas
  agentTaskSchema,
  commentSchema,
  codeChangeSchema,
  diffHunkSchema,
  diffLineSchema,
  diffSummarySchema,
  linesChangedSchema,
  startTaskInputSchema,
  updateTaskStatusInputSchema,
  updateTaskProgressInputSchema,
  completeTaskInputSchema,
  failTaskInputSchema,
  addCommentInputSchema,
  setTaskBlockerInputSchema,
} from './task-types.js';

// ============================================================================
// Agent Types
// ============================================================================

export type {
  // Core Agent Types
  Agent,
  Session,
  ActivityLog,
  AgentStatistics,

  // MCP Input Types
  RegisterAgentInput,
  StartSessionInput,
  AgentHeartbeatInput,
  EndSessionInput,
  UpdateAgentStatusInput,
} from './agent-types.js';

export {
  // Zod Schemas
  agentSchema,
  sessionSchema,
  activityLogSchema,
  agentStatisticsSchema,
  registerAgentInputSchema,
  startSessionInputSchema,
  agentHeartbeatInputSchema,
  endSessionInputSchema,
  updateAgentStatusInputSchema,
} from './agent-types.js';

// ============================================================================
// Board Types
// ============================================================================

export type {
  // Core Board Types
  Board,
  BoardColumn,
  BoardSettings,
  BoardStatistics,
  BoardResponse,

  // MCP Input Types
  CreateBoardInput,
  UpdateBoardSettingsInput,
  AddBoardColumnInput,
  UpdateBoardColumnInput,
  DeleteBoardColumnInput,
  AssignAgentToBoardInput,
  RemoveAgentFromBoardInput,
} from './board-types.js';

export {
  // Constants
  DEFAULT_BOARD_SETTINGS,

  // Zod Schemas
  boardSchema,
  boardColumnSchema,
  boardSettingsSchema,
  boardStatisticsSchema,
  boardResponseSchema,
  createBoardInputSchema,
  updateBoardSettingsInputSchema,
  addBoardColumnInputSchema,
  updateBoardColumnInputSchema,
  deleteBoardColumnInputSchema,
  assignAgentToBoardInputSchema,
  removeAgentFromBoardInputSchema,
} from './board-types.js';

// ============================================================================
// WebSocket Types
// ============================================================================

export type {
  // Client Messages
  ClientMessage,
  SubscribeMessage,
  UnsubscribeMessage,
  HeartbeatMessage,

  // Server Messages
  ServerMessage,
  TaskCreatedMessage,
  TaskUpdatedMessage,
  TaskMovedMessage,
  TaskDeletedMessage,
  AgentStatusChangedMessage,
  ActivityLoggedMessage,
  CommentAddedMessage,

  // WebSocket Options
  WebSocketOptions,
} from './websocket-types.js';

export {
  // Enums
  WebSocketState,

  // Constants
  DEFAULT_WEBSOCKET_OPTIONS,

  // Zod Schemas
  clientMessageSchema,
  serverMessageSchema,
  subscribeMessageSchema,
  unsubscribeMessageSchema,
  heartbeatMessageSchema,
  taskCreatedMessageSchema,
  taskUpdatedMessageSchema,
  taskMovedMessageSchema,
  taskDeletedMessageSchema,
  agentStatusChangedMessageSchema,
  activityLoggedMessageSchema,
  commentAddedMessageSchema,
  webSocketOptionsSchema,

  // Type Guards
  isClientMessage,
  isServerMessage,
} from './websocket-types.js';

// ============================================================================
// Utility Types and Functions
// ============================================================================

export type {
  // Utility Types
  RequireProps,
  OptionalProps,
  DeepPartial,
  DeepReadonly,
  KeysOfType,
  PickByType,
  OmitByType,
  StrictPick,
  NonNullableFields,
  FunctionPropertyNames,
  NonFunctionPropertyNames,
  ID,
  Timestamp,
  Metadata,
  Result,
  AsyncResult,
  PaginationParams,
  PaginatedResponse,
} from './utility-types.js';

export {
  // Type Guards
  isAgentTask,
  isAgent,
  isBoard,
  isSession,
  isComment,
  isActivityLog,
  isTaskBlocked,
  isTaskCompleted,
  isTaskInProgress,
  isTaskFailed,
  isAgentActive,
  isSessionActive,

  // Utility Functions
  calculateTaskDuration,
  calculateSessionDuration,
  getImportancePriority,
  compareTasksByPriority,
  canTransitionTaskStatus,
  getTotalLinesChanged,
  getFilesChangedCount,
  formatDuration,
  parseDuration,
  getTaskProgress,
  isTaskProgressComplete,
  cloneWithDates,
  filterTasksByStatus,
  filterTasksByImportance,
  filterTasksByAgent,
  groupTasksByStatus,
  sortTasksByDate,
} from './utility-types.js';

// ============================================================================
// Legacy Type Exports (for backward compatibility)
// ============================================================================

// Note: The old types.ts file has been split into multiple modules for better
// organization. All types are still available through this index file.
// If you were previously importing from './types.js', you can now import
// directly from the package root.
