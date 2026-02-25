/**
 * Database connection and initialization module
 *
 * This module provides singleton access to the SQLite database connection
 * and handles database initialization with schema creation and default data.
 */

import Database from 'better-sqlite3';
import { SCHEMA_SQL, DEFAULT_COLUMNS } from './schema.js';
import { randomUUID } from 'crypto';
import { DatabaseError, DEFAULT_BOARD_SETTINGS } from '../types/index.js';
import { safeJsonStringify } from '../utils/validation.js';

/**
 * Singleton database instance
 */
let db: Database.Database | null = null;

/**
 * Database configuration options
 */
export interface DatabaseOptions {
  /** Path to the SQLite database file */
  path?: string;
  /** Enable verbose logging for debugging */
  verbose?: boolean;
  /** Timeout for database operations in milliseconds */
  timeout?: number;
}

/**
 * Default database path
 */
const DEFAULT_DB_PATH = './data/kanban.db';

/**
 * Initializes the database with schema and default data.
 * This function is idempotent - calling it multiple times returns the same instance.
 *
 * @param options - Database configuration options
 * @returns The initialized database instance
 * @throws {DatabaseError} If database initialization fails
 *
 * @example
 * ```typescript
 * const db = initDatabase({ path: './data/my-db.db' });
 * ```
 */
export function initDatabase(options: DatabaseOptions = {}): Database.Database {
  if (db) {
    return db;
  }

  const { path = DEFAULT_DB_PATH, verbose = false, timeout = 5000 } = options;

  try {
    // Create database connection
    db = new Database(path, { verbose: verbose ? console.log : undefined, timeout });

    // Enable foreign keys for referential integrity
    db.pragma('foreign_keys = ON');

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');

    // Execute schema creation
    db.exec(SCHEMA_SQL);

    // Initialize default board if needed
    initializeDefaultBoard(db);

    console.error(`Database initialized successfully at: ${path}`);
    return db;
  } catch (error) {
    db = null;
    throw new DatabaseError(
      `Failed to initialize database at ${path}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Creates the default board with standard columns if no boards exist
 *
 * @param database - The database instance
 * @throws {DatabaseError} If default board creation fails
 */
function initializeDefaultBoard(database: Database.Database): void {
  try {
    // Check if any boards exist
    const result = database.prepare('SELECT COUNT(*) as count FROM boards').get() as { count: number };

    if (result.count === 0) {
      const boardId = randomUUID();
      const now = Date.now();

      // Begin transaction for atomic operation
      const insertBoard = database.prepare(`
        INSERT INTO boards (id, name, description, settings, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const insertColumn = database.prepare(`
        INSERT INTO board_columns (id, board_id, name, position, color)
        VALUES (?, ?, ?, ?, ?)
      `);

      // Execute in transaction
      database.transaction(() => {
        // Insert default board
        insertBoard.run(
          boardId,
          'Main Board',
          'Default board for agent activities',
          safeJsonStringify(DEFAULT_BOARD_SETTINGS),
          now,
          now
        );

        // Insert default columns
        for (const column of DEFAULT_COLUMNS) {
          insertColumn.run(
            column.id,
            boardId,
            column.name,
            column.position,
            column.color
          );
        }
      })();

      console.error(`Created default board with ID: ${boardId}`);
    }
  } catch (error) {
    throw new DatabaseError(
      'Failed to initialize default board',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Gets the current database instance.
 *
 * @returns The database instance
 * @throws {DatabaseError} If database has not been initialized
 *
 * @example
 * ```typescript
 * const db = getDatabase();
 * const result = db.prepare('SELECT * FROM boards').all();
 * ```
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new DatabaseError('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Closes the database connection and releases resources.
 * After calling this, you must call initDatabase() again to use the database.
 *
 * @example
 * ```typescript
 * closeDatabase();
 * // Database is now closed and db reference is cleared
 * ```
 */
export function closeDatabase(): void {
  if (db) {
    try {
      db.close();
      console.error('Database connection closed successfully');
    } catch (error) {
      console.error('Error closing database:', error);
    } finally {
      db = null;
    }
  }
}

/**
 * Checks if the database is currently initialized
 *
 * @returns True if database is initialized, false otherwise
 */
export function isDatabaseInitialized(): boolean {
  return db !== null;
}
