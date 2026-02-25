/**
 * Database connection for API server
 * Shares the same database with MCP server
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

let db: Database.Database | null = null;

/**
 * Initialize database connection
 * @param dbPath - Path to the SQLite database file
 * @returns Database instance
 * @throws Error if database initialization fails
 */
export function initDatabase(dbPath: string = './data/kanban.db'): Database.Database {
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
