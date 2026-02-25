/**
 * Core type definitions for the Agent Track Dashboard
 * Based on the data model specification
 */

/**
 * Task importance/priority levels
 */
export type TaskImportance = 'critical' | 'high' | 'medium' | 'low';

/**
 * Task status representing kanban columns
 */
export type TaskStatus = 'todo' | 'claimed' | 'in_progress' | 'review' | 'done';

/**
 * Agent status
 */
export type AgentStatus = 'active' | 'idle' | 'offline';

/**
 * Agent type categories
 */
export type AgentType = 'code-generator' | 'code-reviewer' | 'tester' | 'general';

/**
 * Activity log event types
 */
export type ActivityEventType =
  | 'task_created'
  | 'task_claimed'
  | 'task_started'
  | 'task_progressed'
  | 'task_completed'
  | 'task_failed'
  | 'task_moved'
  | 'comment_added'
  | 'file_modified';

/**
 * Lines changed statistics
 */
export interface LinesChanged {
  added: number;
  removed: number;
}

/**
 * Main task entity representing work done by an agent
 */
export interface AgentTask {
  // Identity
  id: string;
  boardId: string;

  // Task Information
  title: string;
  description?: string;

  // Importance/Priority
  importance: TaskImportance;

  // Status (Kanban columns)
  status: TaskStatus;

  // Agent Information
  agentId: string;
  agentName: string;
  agentType: AgentType;
  sessionId: string;

  // Timestamps
  createdAt: Date;
  claimedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  updatedAt: Date;

  // Progress Tracking
  progress?: number;
  currentAction?: string;

  // Context & Metadata
  files?: string[];
  linesChanged?: LinesChanged;
  tokensUsed?: number;
  estimatedDuration?: number;
  actualDuration?: number;

  // Relationships
  parentTaskId?: string;
  blockedBy?: string[];
  tags?: string[];

  // Error Handling
  errorMessage?: string;
  retryCount?: number;
}

/**
 * Agent entity
 */
export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  currentSessionId?: string;

  // Capabilities
  capabilities: string[];
  maxConcurrentTasks: number;

  // Statistics
  tasksCompleted: number;
  tasksInProgress: number;
  averageTaskDuration: number;
  successRate: number;

  // Heartbeat
  lastHeartbeat: Date;

  // Metadata
  metadata?: Record<string, unknown>;
}

/**
 * Board column configuration
 */
export interface BoardColumn {
  id: string;
  name: string;
  position: number;
  wipLimit?: number;
  color?: string;
}

/**
 * Board settings
 */
export interface BoardSettings {
  autoArchiveCompleted: boolean;
  archiveAfterHours: number;
  enableNotifications: boolean;
  criticalTaskAlerts: boolean;
}

/**
 * Board entity
 */
export interface Board {
  id: string;
  name: string;
  description?: string;

  // Configuration
  columns: BoardColumn[];

  // Project Context
  projectPath?: string;
  repository?: string;

  // Team
  agentIds: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Settings
  settings: BoardSettings;
}

/**
 * Work session
 */
export interface Session {
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

/**
 * Activity log entry
 */
export interface ActivityLog {
  id: string;
  timestamp: Date;

  // What happened
  eventType: ActivityEventType;

  // Who did it
  agentId: string;
  agentName: string;

  // What was affected
  taskId?: string;
  boardId: string;

  // Details
  message: string;
  details?: Record<string, unknown>;

  // Changes
  before?: unknown;
  after?: unknown;
}

/**
 * Comment on a task
 */
export interface Comment {
  id: string;
  taskId: string;

  author: string;
  authorType: 'agent' | 'human';

  content: string;

  createdAt: Date;
  updatedAt?: Date;

  // Threading
  parentCommentId?: string;

  // Metadata
  metadata?: Record<string, unknown>;
}

/**
 * Board statistics
 */
export interface BoardStatistics {
  totalTasks: number;
  todoCount: number;
  claimedCount: number;
  inProgressCount: number;
  reviewCount: number;
  doneCount: number;
  averageCompletionTime: number;
  totalTokensUsed: number;
}

/**
 * Board response from API
 */
export interface BoardResponse {
  board: Board;
  columns: BoardColumn[];
  tasks: AgentTask[];
  agents: Agent[];
  activeSessionCount: number;
  statistics: BoardStatistics;
}

/**
 * WebSocket message types - Client to Server
 */
export type ClientMessage =
  | { type: 'subscribe'; boardId: string }
  | { type: 'unsubscribe'; boardId: string }
  | { type: 'heartbeat' };

/**
 * WebSocket message types - Server to Client
 */
export type ServerMessage =
  | { type: 'task_created'; task: AgentTask }
  | { type: 'task_updated'; task: AgentTask }
  | { type: 'task_moved'; taskId: string; fromStatus: string; toStatus: string }
  | { type: 'task_deleted'; taskId: string }
  | { type: 'agent_status_changed'; agent: Agent }
  | { type: 'activity_logged'; log: ActivityLog }
  | { type: 'comment_added'; comment: Comment };

/**
 * UI filter state
 */
export interface FilterState {
  search: string;
  agentIds: string[];
  importance: TaskImportance[];
  tags: string[];
  showCompleted: boolean;
}

/**
 * Code change for diff viewing
 */
export interface CodeChange {
  filePath: string;
  oldContent?: string;
  newContent?: string;
  diff: string;
  linesAdded: number;
  linesRemoved: number;
}

/**
 * Drag and drop item type
 */
export interface DragItem {
  id: string;
  type: 'task';
  data: AgentTask;
}
