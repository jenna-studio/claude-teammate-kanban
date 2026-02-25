/**
 * Core data types for Agent Track Dashboard
 */

// Task statuses (Kanban columns)
export type TaskStatus = 'todo' | 'claimed' | 'in_progress' | 'review' | 'done';

// Task importance/priority levels
export type TaskImportance = 'critical' | 'high' | 'medium' | 'low';

// Agent status
export type AgentStatus = 'active' | 'idle' | 'offline';

// Code change types
export type ChangeType = 'added' | 'modified' | 'deleted' | 'renamed';

// Activity log event types
export type EventType =
  | 'task_created'
  | 'task_claimed'
  | 'task_started'
  | 'task_progressed'
  | 'task_completed'
  | 'task_failed'
  | 'task_moved'
  | 'comment_added'
  | 'file_modified';

// Author types for comments
export type AuthorType = 'agent' | 'human';

/**
 * Agent Task - Primary entity representing work being done by an agent
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
  agentType: string;
  sessionId: string;

  // Timestamps
  createdAt: Date;
  claimedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  updatedAt: Date;

  // Progress Tracking
  progress?: number; // 0-100 percentage
  currentAction?: string;

  // Context & Metadata
  files?: string[];
  linesChanged?: {
    added: number;
    removed: number;
  };
  tokensUsed?: number;
  estimatedDuration?: number; // seconds
  actualDuration?: number; // seconds

  // Relationships
  parentTaskId?: string;
  blockedBy?: string[];
  tags?: string[];

  // Error Handling
  errorMessage?: string;
  retryCount?: number;

  // Code Changes
  codeChanges?: CodeChange[];
  commitHash?: string;
  diffSummary?: {
    filesChanged: number;
    insertions: number;
    deletions: number;
  };
}

/**
 * Code Change - Represents a code diff for a file
 */
export interface CodeChange {
  filePath: string;
  changeType: ChangeType;
  oldPath?: string; // For renamed files
  diff: string; // Unified diff format
  language?: string; // For syntax highlighting
  hunks?: DiffHunk[];
  linesAdded?: number;
  linesDeleted?: number;
}

/**
 * Diff Hunk - A section of changes in a file
 */
export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

/**
 * Diff Line - A single line in a diff
 */
export interface DiffLine {
  type: 'context' | 'addition' | 'deletion';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

/**
 * Agent - Information about an AI agent
 */
export interface Agent {
  id: string;
  name: string;
  type: string;
  status: AgentStatus;
  currentSessionId?: string;

  // Capabilities
  capabilities?: string[];
  maxConcurrentTasks: number;

  // Statistics
  tasksCompleted: number;
  tasksInProgress: number;
  averageTaskDuration: number; // seconds
  successRate: number; // 0-100

  // Heartbeat
  lastHeartbeat: Date;

  // Metadata
  metadata?: Record<string, unknown>;
}

/**
 * Board - A workspace for organizing agent tasks
 */
export interface Board {
  id: string;
  name: string;
  description?: string;

  // Configuration
  columns?: BoardColumn[];

  // Project Context
  projectPath?: string;
  repository?: string;

  // Team
  agentIds?: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Settings
  settings: BoardSettings;
}

/**
 * Board Settings
 */
export interface BoardSettings {
  autoArchiveCompleted: boolean;
  archiveAfterHours: number;
  enableNotifications: boolean;
  criticalTaskAlerts: boolean;
}

/**
 * Board Column - Customizable kanban columns
 */
export interface BoardColumn {
  id: string;
  name: string;
  position: number;
  wipLimit?: number;
  color?: string;
}

/**
 * Session - An agent work session
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
 * Activity Log - Detailed timeline of agent activities
 */
export interface ActivityLog {
  id: string;
  timestamp: Date;

  // What happened
  eventType: EventType;

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
  before?: any;
  after?: any;
}

/**
 * Comment - Inter-agent communication on tasks
 */
export interface Comment {
  id: string;
  taskId: string;

  author: string;
  authorType: AuthorType;

  content: string;

  createdAt: Date;
  updatedAt?: Date;

  // Threading
  parentCommentId?: string;

  // Metadata
  metadata?: Record<string, unknown>;
}

/**
 * API Response Types
 */

export interface BoardResponse {
  board: Board;
  columns: BoardColumn[];
  tasks: AgentTask[];
  agents: Agent[];
  activeSessionCount: number;
  statistics: BoardStatistics;
}

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
 * WebSocket Message Types
 */

export type ClientMessage =
  | { type: 'subscribe'; boardId: string }
  | { type: 'unsubscribe'; boardId: string }
  | { type: 'heartbeat' };

export type ServerMessage =
  | { type: 'task_created'; task: AgentTask }
  | { type: 'task_updated'; task: AgentTask }
  | { type: 'task_moved'; taskId: string; fromStatus: TaskStatus; toStatus: TaskStatus }
  | { type: 'task_deleted'; taskId: string }
  | { type: 'agent_status_changed'; agent: Agent }
  | { type: 'activity_logged'; log: ActivityLog }
  | { type: 'comment_added'; comment: Comment };

/**
 * MCP Tool Input Types
 */

export interface RegisterAgentInput {
  name: string;
  type: string;
  capabilities?: string[];
  maxConcurrentTasks?: number;
}

export interface StartSessionInput {
  agentId: string;
  boardId: string;
  metadata?: Record<string, unknown>;
}

export interface CreateBoardInput {
  name: string;
  description?: string;
  projectPath?: string;
  repository?: string;
}

export interface StartTaskInput {
  boardId: string;
  sessionId: string;
  title: string;
  description?: string;
  importance?: TaskImportance;
  estimatedDuration?: number;
  tags?: string[];
  parentTaskId?: string;
}

export interface UpdateTaskStatusInput {
  taskId: string;
  status: TaskStatus;
  currentAction?: string;
}

export interface UpdateTaskProgressInput {
  taskId: string;
  progress?: number;
  currentAction?: string;
  files?: string[];
  linesChanged?: {
    added: number;
    removed: number;
  };
  tokensUsed?: number;
  codeChanges?: CodeChange[];
}

export interface CompleteTaskInput {
  taskId: string;
  summary?: string;
  tokensUsed?: number;
}

export interface FailTaskInput {
  taskId: string;
  errorMessage: string;
  willRetry?: boolean;
}

export interface AddCommentInput {
  taskId: string;
  author: string;
  content: string;
}

export interface SetTaskBlockerInput {
  taskId: string;
  blockedBy: string[];
}
