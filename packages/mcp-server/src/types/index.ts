/**
 * Shared types for MCP Server
 */

/**
 * Database row type helper for better-sqlite3
 */
export interface DatabaseRow {
  [key: string]: any;
}

/**
 * Database configuration options
 */
export interface DatabaseConfig {
  /** Path to the SQLite database file */
  path: string;
  /** Whether to enable foreign key constraints */
  foreignKeys?: boolean;
  /** Whether to enable write-ahead logging */
  wal?: boolean;
  /** Timeout for database operations in milliseconds */
  timeout?: number;
}

/**
 * Repository base interface
 */
export interface IRepository<T> {
  /** Get entity by ID */
  get(id: string): T | null;
  /** Get all entities */
  getAll(): T[];
}

/**
 * Error types for better error handling
 */
export class DatabaseError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string, public readonly entityId?: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Re-export BoardSettings and DEFAULT_BOARD_SETTINGS from shared package
 */
export type { BoardSettings } from '@agent-track/shared';
export { DEFAULT_BOARD_SETTINGS } from '@agent-track/shared';
