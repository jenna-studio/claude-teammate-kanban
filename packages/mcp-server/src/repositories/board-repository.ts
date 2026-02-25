/**
 * Board Repository
 *
 * Handles all database operations related to boards and their columns,
 * including creation, retrieval, and column management.
 */

import { getDatabase } from '../db/database.js';
import type { Board, BoardColumn } from '@agent-track/shared';
import { DatabaseError, BoardSettings } from '../types/index.js';
import { validateNonEmptyString, validateUUID, safeJsonParse, safeJsonStringify } from '../utils/validation.js';

/**
 * Database row structure for boards table
 */
interface BoardRow {
  id: string;
  name: string;
  description: string | null;
  project_path: string | null;
  repository: string | null;
  settings: string;
  created_at: number;
  updated_at: number;
}

/**
 * Database row structure for board_columns table
 */
interface BoardColumnRow {
  id: string;
  board_id: string;
  name: string;
  position: number;
  wip_limit: number | null;
  color: string | null;
}

/**
 * Repository for managing board entities and their columns in the database
 */
export class BoardRepository {
  /**
   * Creates a new board in the database.
   *
   * @param board - The board to create
   * @throws {ValidationError} If board data is invalid
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * const board = {
   *   id: 'board-123',
   *   name: 'My Project',
   *   description: 'Project board',
   *   settings: { autoArchiveCompleted: true },
   *   createdAt: new Date(),
   *   updatedAt: new Date(),
   * };
   * repository.create(board);
   * ```
   */
  create(board: Board): void {
    // Validate required fields
    validateUUID(board.id, 'board.id');
    validateNonEmptyString(board.name, 'board.name');

    try {
      const db = getDatabase();

      db.prepare(`
        INSERT INTO boards (
          id, name, description, project_path, repository, settings, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        board.id,
        board.name,
        board.description ?? null,
        board.projectPath ?? null,
        board.repository ?? null,
        safeJsonStringify(board.settings),
        board.createdAt.getTime(),
        board.updatedAt.getTime()
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to create board ${board.id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Retrieves a board by its unique identifier.
   *
   * @param id - The unique identifier of the board
   * @returns The board object or null if not found
   * @throws {ValidationError} If the ID is invalid
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * const board = repository.get('board-123');
   * if (board) {
   *   console.log(`Found board: ${board.name}`);
   * }
   * ```
   */
  get(id: string): Board | null {
    validateUUID(id, 'id');

    try {
      const db = getDatabase();
      const row = db.prepare('SELECT * FROM boards WHERE id = ?').get(id) as BoardRow | undefined;

      if (!row) return null;

      return this.rowToBoard(row);
    } catch (error) {
      throw new DatabaseError(
        `Failed to get board ${id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Retrieves all boards from the database, ordered by creation date (newest first).
   *
   * @returns Array of all boards
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * const boards = repository.getAll();
   * console.log(`Total boards: ${boards.length}`);
   * ```
   */
  getAll(): Board[] {
    try {
      const db = getDatabase();
      const rows = db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all() as BoardRow[];

      return rows.map((row) => this.rowToBoard(row));
    } catch (error) {
      throw new DatabaseError(
        'Failed to get all boards',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Retrieves all columns for a specific board, ordered by position.
   *
   * @param boardId - The unique identifier of the board
   * @returns Array of board columns
   * @throws {ValidationError} If the board ID is invalid
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * const columns = repository.getColumns('board-123');
   * columns.forEach(col => console.log(`${col.name} at position ${col.position}`));
   * ```
   */
  getColumns(boardId: string): BoardColumn[] {
    validateUUID(boardId, 'boardId');

    try {
      const db = getDatabase();
      const rows = db.prepare(`
        SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC
      `).all(boardId) as BoardColumnRow[];

      return rows.map((row) => this.rowToColumn(row));
    } catch (error) {
      throw new DatabaseError(
        `Failed to get columns for board ${boardId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Creates a new column for a board.
   *
   * @param boardId - The unique identifier of the board
   * @param column - The column to create
   * @throws {ValidationError} If the board ID or column data is invalid
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * const column = {
   *   id: 'col-123',
   *   name: 'In Review',
   *   position: 3,
   *   wipLimit: 5,
   *   color: '#9333ea',
   * };
   * repository.createColumn('board-123', column);
   * ```
   */
  createColumn(boardId: string, column: BoardColumn): void {
    validateUUID(boardId, 'boardId');
    validateUUID(column.id, 'column.id');
    validateNonEmptyString(column.name, 'column.name');

    try {
      const db = getDatabase();

      db.prepare(`
        INSERT INTO board_columns (id, board_id, name, position, wip_limit, color)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        column.id,
        boardId,
        column.name,
        column.position,
        column.wipLimit ?? null,
        column.color ?? null
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to create column ${column.id} for board ${boardId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Converts a database row to a Board object.
   *
   * @param row - The database row to convert
   * @returns The Board object
   * @private
   */
  private rowToBoard(row: BoardRow): Board {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      projectPath: row.project_path ?? undefined,
      repository: row.repository ?? undefined,
      settings: safeJsonParse<BoardSettings>(row.settings) ?? { autoArchiveCompleted: false, archiveAfterHours: 24, enableNotifications: true, criticalTaskAlerts: true },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Converts a database row to a BoardColumn object.
   *
   * @param row - The database row to convert
   * @returns The BoardColumn object
   * @private
   */
  private rowToColumn(row: BoardColumnRow): BoardColumn {
    return {
      id: row.id,
      name: row.name,
      position: row.position,
      wipLimit: row.wip_limit ?? undefined,
      color: row.color ?? undefined,
    };
  }
}
