/**
 * Database schema definitions for Agent Track Dashboard
 *
 * This module contains the SQLite schema SQL and default data constants.
 * The schema supports tracking agents, tasks, sessions, boards, and related entities.
 */

/**
 * Board column definition
 */
export interface ColumnDefinition {
  /** Unique identifier for the column */
  id: string;
  /** Display name of the column */
  name: string;
  /** Position/order of the column (0-indexed) */
  position: number;
  /** Optional color code for the column (hex format) */
  color?: string;
}

/**
 * Complete SQL schema for the database
 * Includes all tables, indexes, and constraints
 */
export const SCHEMA_SQL = `
-- Boards table
CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    project_path TEXT,
    repository TEXT,
    settings JSON NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Board columns table
CREATE TABLE IF NOT EXISTS board_columns (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    wip_limit INTEGER,
    color TEXT,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_board_columns_board ON board_columns(board_id);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    current_session_id TEXT,
    capabilities JSON,
    max_concurrent_tasks INTEGER DEFAULT 1,
    tasks_completed INTEGER DEFAULT 0,
    tasks_in_progress INTEGER DEFAULT 0,
    average_task_duration REAL DEFAULT 0,
    success_rate REAL DEFAULT 100,
    last_heartbeat INTEGER NOT NULL,
    metadata JSON
);

-- Agent tasks table
CREATE TABLE IF NOT EXISTS agent_tasks (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL,

    title TEXT NOT NULL,
    description TEXT,

    importance TEXT NOT NULL,
    status TEXT NOT NULL,

    agent_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    session_id TEXT NOT NULL,

    created_at INTEGER NOT NULL,
    claimed_at INTEGER,
    started_at INTEGER,
    completed_at INTEGER,
    updated_at INTEGER NOT NULL,

    progress INTEGER,
    current_action TEXT,

    files JSON,
    lines_changed JSON,
    tokens_used INTEGER,
    estimated_duration INTEGER,
    actual_duration INTEGER,

    parent_task_id TEXT,
    blocked_by JSON,
    tags JSON,

    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    commit_hash TEXT,
    diff_summary JSON,

    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_board ON agent_tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON agent_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_importance ON agent_tasks(importance);
CREATE INDEX IF NOT EXISTS idx_tasks_session ON agent_tasks(session_id);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    board_id TEXT NOT NULL,

    started_at INTEGER NOT NULL,
    ended_at INTEGER,

    last_heartbeat INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT 1,

    tasks_created INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    tasks_failed INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,

    metadata JSON,

    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_board ON sessions(board_id);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,

    event_type TEXT NOT NULL,

    agent_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,

    task_id TEXT,
    board_id TEXT NOT NULL,

    message TEXT NOT NULL,
    details JSON,

    before_state JSON,
    after_state JSON,

    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_board ON activity_logs(board_id);
CREATE INDEX IF NOT EXISTS idx_logs_task ON activity_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_logs_event_type ON activity_logs(event_type);

-- Code changes table
CREATE TABLE IF NOT EXISTS code_changes (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,

    file_path TEXT NOT NULL,
    change_type TEXT NOT NULL,
    old_path TEXT,

    diff TEXT NOT NULL,
    language TEXT,

    lines_added INTEGER DEFAULT 0,
    lines_deleted INTEGER DEFAULT 0,

    created_at INTEGER NOT NULL,

    FOREIGN KEY (task_id) REFERENCES agent_tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_code_changes_task ON code_changes(task_id);
CREATE INDEX IF NOT EXISTS idx_code_changes_file ON code_changes(file_path);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,

    author TEXT NOT NULL,
    author_type TEXT NOT NULL,

    content TEXT NOT NULL,

    created_at INTEGER NOT NULL,
    updated_at INTEGER,

    parent_comment_id TEXT,

    metadata JSON,

    FOREIGN KEY (task_id) REFERENCES agent_tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id);
`;

/**
 * Default board columns following a kanban-style workflow
 * These columns are created when a new board is initialized
 */
export const DEFAULT_COLUMNS: ColumnDefinition[] = [
  { id: 'todo', name: 'TODO', position: 0, color: '#94a3b8' },
  { id: 'claimed', name: 'Claimed', position: 1, color: '#60a5fa' },
  { id: 'in_progress', name: 'In Progress', position: 2, color: '#fbbf24' },
  { id: 'review', name: 'Review', position: 3, color: '#a78bfa' },
  { id: 'done', name: 'Done', position: 4, color: '#34d399' },
];

/**
 * Valid task status values that map to column IDs
 */
export const TASK_STATUSES = ['todo', 'claimed', 'in_progress', 'review', 'done'] as const;

/**
 * Valid task importance levels
 */
export const TASK_IMPORTANCE_LEVELS = ['critical', 'high', 'medium', 'low'] as const;

/**
 * Valid agent status values
 */
export const AGENT_STATUSES = ['active', 'idle', 'offline'] as const;

/**
 * Valid code change types
 */
export const CODE_CHANGE_TYPES = ['added', 'modified', 'deleted', 'renamed'] as const;
