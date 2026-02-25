/**
 * Session Repository
 *
 * Handles all database operations related to agent sessions including
 * creation, retrieval, heartbeat updates, and session termination.
 */

import { getDatabase } from '../db/database.js';
import type { Session } from '@agent-track/shared';
import { DatabaseError, NotFoundError } from '../types/index.js';
import { validateUUID, safeJsonParse, safeJsonStringify } from '../utils/validation.js';

/**
 * Database row structure for sessions table
 */
interface SessionRow {
  id: string;
  agent_id: string;
  board_id: string;
  started_at: number;
  ended_at: number | null;
  last_heartbeat: number;
  is_active: number;
  tasks_created: number;
  tasks_completed: number;
  tasks_failed: number;
  total_tokens_used: number;
  metadata: string | null;
}

/**
 * Repository for managing session entities in the database
 */
export class SessionRepository {
  /**
   * Creates a new session in the database.
   *
   * @param session - The session to create
   * @throws {ValidationError} If session data is invalid
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * const session = {
   *   id: 'session-123',
   *   agentId: 'agent-456',
   *   boardId: 'board-789',
   *   startedAt: new Date(),
   *   lastHeartbeat: new Date(),
   *   isActive: true,
   *   tasksCreated: 0,
   *   tasksCompleted: 0,
   *   tasksFailed: 0,
   *   totalTokensUsed: 0,
   * };
   * repository.create(session);
   * ```
   */
  create(session: Session): void {
    // Validate required fields
    validateUUID(session.id, 'session.id');
    validateUUID(session.agentId, 'session.agentId');
    validateUUID(session.boardId, 'session.boardId');

    try {
      const db = getDatabase();

      db.prepare(`
        INSERT INTO sessions (
          id, agent_id, board_id, started_at, ended_at, last_heartbeat,
          is_active, tasks_created, tasks_completed, tasks_failed,
          total_tokens_used, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        session.id,
        session.agentId,
        session.boardId,
        session.startedAt.getTime(),
        session.endedAt?.getTime() ?? null,
        session.lastHeartbeat.getTime(),
        session.isActive ? 1 : 0,
        session.tasksCreated,
        session.tasksCompleted,
        session.tasksFailed,
        session.totalTokensUsed,
        safeJsonStringify(session.metadata)
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to create session ${session.id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Retrieves a session by its unique identifier.
   *
   * @param id - The unique identifier of the session
   * @returns The session object or null if not found
   * @throws {ValidationError} If the ID is invalid
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * const session = repository.get('session-123');
   * if (session) {
   *   console.log(`Session for agent ${session.agentId}`);
   * }
   * ```
   */
  get(id: string): Session | null {
    validateUUID(id, 'id');

    try {
      const db = getDatabase();
      const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as SessionRow | undefined;

      if (!row) return null;

      return this.rowToSession(row);
    } catch (error) {
      throw new DatabaseError(
        `Failed to get session ${id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Updates the session's heartbeat timestamp.
   * This should be called periodically to indicate the session is still active.
   *
   * @param id - The unique identifier of the session
   * @throws {ValidationError} If the ID is invalid
   * @throws {NotFoundError} If the session is not found
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * // Call this every 30 seconds to keep session alive
   * repository.updateHeartbeat('session-123');
   * ```
   */
  updateHeartbeat(id: string): void {
    validateUUID(id, 'id');

    try {
      const db = getDatabase();
      const result = db.prepare(`
        UPDATE sessions SET last_heartbeat = ? WHERE id = ?
      `).run(Date.now(), id);

      if (result.changes === 0) {
        throw new NotFoundError(`Session not found: ${id}`, id);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(
        `Failed to update heartbeat for session ${id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Ends a session by setting its end time and marking it as inactive.
   *
   * @param id - The unique identifier of the session
   * @throws {ValidationError} If the ID is invalid
   * @throws {NotFoundError} If the session is not found
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * repository.endSession('session-123');
   * ```
   */
  endSession(id: string): void {
    validateUUID(id, 'id');

    try {
      const db = getDatabase();
      const result = db.prepare(`
        UPDATE sessions SET ended_at = ?, is_active = 0 WHERE id = ?
      `).run(Date.now(), id);

      if (result.changes === 0) {
        throw new NotFoundError(`Session not found: ${id}`, id);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(
        `Failed to end session ${id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Increments the count of tasks created in this session.
   *
   * @param id - The unique identifier of the session
   * @throws {ValidationError} If the ID is invalid
   * @throws {NotFoundError} If the session is not found
   * @throws {DatabaseError} If database operation fails
   */
  incrementTaskCreated(id: string): void {
    validateUUID(id, 'id');

    try {
      const db = getDatabase();
      const result = db.prepare(`
        UPDATE sessions SET tasks_created = tasks_created + 1 WHERE id = ?
      `).run(id);

      if (result.changes === 0) {
        throw new NotFoundError(`Session not found: ${id}`, id);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(
        `Failed to increment tasks created for session ${id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Increments the count of tasks completed in this session.
   *
   * @param id - The unique identifier of the session
   * @throws {ValidationError} If the ID is invalid
   * @throws {NotFoundError} If the session is not found
   * @throws {DatabaseError} If database operation fails
   */
  incrementTaskCompleted(id: string): void {
    validateUUID(id, 'id');

    try {
      const db = getDatabase();
      const result = db.prepare(`
        UPDATE sessions SET tasks_completed = tasks_completed + 1 WHERE id = ?
      `).run(id);

      if (result.changes === 0) {
        throw new NotFoundError(`Session not found: ${id}`, id);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(
        `Failed to increment tasks completed for session ${id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Increments the count of tasks failed in this session.
   *
   * @param id - The unique identifier of the session
   * @throws {ValidationError} If the ID is invalid
   * @throws {NotFoundError} If the session is not found
   * @throws {DatabaseError} If database operation fails
   */
  incrementTaskFailed(id: string): void {
    validateUUID(id, 'id');

    try {
      const db = getDatabase();
      const result = db.prepare(`
        UPDATE sessions SET tasks_failed = tasks_failed + 1 WHERE id = ?
      `).run(id);

      if (result.changes === 0) {
        throw new NotFoundError(`Session not found: ${id}`, id);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(
        `Failed to increment tasks failed for session ${id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Adds to the total tokens used in this session.
   *
   * @param id - The unique identifier of the session
   * @param tokens - The number of tokens to add
   * @throws {ValidationError} If the ID is invalid
   * @throws {NotFoundError} If the session is not found
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * repository.addTokensUsed('session-123', 1500);
   * ```
   */
  addTokensUsed(id: string, tokens: number): void {
    validateUUID(id, 'id');

    try {
      const db = getDatabase();
      const result = db.prepare(`
        UPDATE sessions SET total_tokens_used = total_tokens_used + ? WHERE id = ?
      `).run(tokens, id);

      if (result.changes === 0) {
        throw new NotFoundError(`Session not found: ${id}`, id);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(
        `Failed to add tokens used for session ${id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Retrieves all active sessions for a specific board.
   *
   * @param boardId - The unique identifier of the board
   * @returns Array of active sessions
   * @throws {ValidationError} If the board ID is invalid
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * const activeSessions = repository.getActiveSessions('board-123');
   * console.log(`${activeSessions.length} active sessions`);
   * ```
   */
  getActiveSessions(boardId: string): Session[] {
    validateUUID(boardId, 'boardId');

    try {
      const db = getDatabase();
      const rows = db.prepare(`
        SELECT * FROM sessions WHERE board_id = ? AND is_active = 1
      `).all(boardId) as SessionRow[];

      return rows.map((row) => this.rowToSession(row));
    } catch (error) {
      throw new DatabaseError(
        `Failed to get active sessions for board ${boardId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Converts a database row to a Session object.
   *
   * @param row - The database row to convert
   * @returns The Session object
   * @private
   */
  private rowToSession(row: SessionRow): Session {
    return {
      id: row.id,
      agentId: row.agent_id,
      boardId: row.board_id,
      startedAt: new Date(row.started_at),
      endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
      lastHeartbeat: new Date(row.last_heartbeat),
      isActive: Boolean(row.is_active),
      tasksCreated: row.tasks_created,
      tasksCompleted: row.tasks_completed,
      tasksFailed: row.tasks_failed,
      totalTokensUsed: row.total_tokens_used,
      metadata: safeJsonParse<Record<string, any>>(row.metadata) || undefined,
    };
  }
}
