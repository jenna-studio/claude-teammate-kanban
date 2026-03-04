/**
 * Database connection for API server
 * Shares the same database with MCP server
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const defaultDbPath = resolve(__dirname, '../data/kanban.db');

let db: Database.Database | null = null;

/**
 * Initialize database connection
 * @param dbPath - Path to the SQLite database file
 * @returns Database instance
 * @throws Error if database initialization fails
 */
export function initDatabase(dbPath: string = defaultDbPath): Database.Database {
  if (db) {
    return db;
  }

  try {
    // Ensure directory exists
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Open database connection
    db = new Database(dbPath);

    // Enable foreign keys for referential integrity
    db.pragma('foreign_keys = ON');

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');

    // Optimize performance settings
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -64000'); // 64MB cache
    db.pragma('temp_store = MEMORY');

    console.log(`[Database] Connected to database: ${dbPath}`);

    // Create tables if they don't exist
    db.exec(`
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
    `);
    console.log('[Database] Schema initialized');

    return db;
  } catch (error) {
    console.error('[Database] Failed to initialize database:', error);
    throw new Error(`Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the current database connection
 * @returns Database instance
 * @throws Error if database is not initialized
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close database connection gracefully
 */
export function closeDatabase(): void {
  if (db) {
    try {
      db.close();
      db = null;
      console.log('[Database] Connection closed');
    } catch (error) {
      console.error('[Database] Error closing database:', error);
    }
  }
}

/**
 * Check if database is initialized and connected
 */
export function isDatabaseConnected(): boolean {
  return db !== null;
}
