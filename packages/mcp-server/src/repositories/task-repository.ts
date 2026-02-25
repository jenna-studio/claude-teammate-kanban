/**
 * Task Repository
 *
 * Handles all database operations related to agent tasks including
 * creation, retrieval, updates, code changes, and task filtering.
 * This is the most complex repository as it manages the core task entities.
 */

import { getDatabase } from '../db/database.js';
import type { AgentTask, CodeChange, DiffSummary } from '@agent-track/shared';
import { randomUUID } from 'crypto';
import { DatabaseError, NotFoundError } from '../types/index.js';
import { validateNonEmptyString, validateUUID, safeJsonParse, safeJsonStringify } from '../utils/validation.js';
import { camelToSnake } from '../utils/converters.js';

/**
 * Database row structure for agent_tasks table
 */
interface TaskRow {
  id: string;
  board_id: string;
  title: string;
  description: string | null;
  importance: string;
  status: string;
  agent_id: string;
  agent_name: string;
  agent_type: string;
  session_id: string;
  created_at: number;
  claimed_at: number | null;
  started_at: number | null;
  completed_at: number | null;
  updated_at: number;
  progress: number | null;
  current_action: string | null;
  files: string | null;
  lines_changed: string | null;
  tokens_used: number | null;
  estimated_duration: number | null;
  actual_duration: number | null;
  parent_task_id: string | null;
  blocked_by: string | null;
  tags: string | null;
  error_message: string | null;
  retry_count: number;
  commit_hash: string | null;
  diff_summary: string | null;
}

/**
 * Database row structure for code_changes table
 */
interface CodeChangeRow {
  id: string;
  task_id: string;
  file_path: string;
  change_type: string;
  old_path: string | null;
  diff: string;
  language: string | null;
  lines_added: number;
  lines_deleted: number;
  created_at: number;
}

/**
 * Repository for managing task entities and their code changes in the database
 */
export class TaskRepository {
  /**
   * Creates a new task in the database.
   *
   * @param task - The task to create
   * @throws {ValidationError} If task data is invalid
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * const task = {
   *   id: 'task-123',
   *   boardId: 'board-456',
   *   title: 'Implement feature X',
   *   description: 'Add new feature',
   *   importance: 'high',
   *   status: 'todo',
   *   agentId: 'agent-789',
   *   agentName: 'Agent Smith',
   *   agentType: 'coding',
   *   sessionId: 'session-012',
   *   createdAt: new Date(),
   *   updatedAt: new Date(),
   * };
   * repository.create(task);
   * ```
   */
  create(task: AgentTask): void {
    // Validate required fields
    validateUUID(task.id, 'task.id');
    validateUUID(task.boardId, 'task.boardId');
    validateNonEmptyString(task.title, 'task.title');
    validateUUID(task.agentId, 'task.agentId');
    validateUUID(task.sessionId, 'task.sessionId');

    try {
      const db = getDatabase();

      db.prepare(`
        INSERT INTO agent_tasks (
          id, board_id, title, description, importance, status,
          agent_id, agent_name, agent_type, session_id,
          created_at, claimed_at, started_at, completed_at, updated_at,
          progress, current_action, files, lines_changed, tokens_used,
          estimated_duration, actual_duration, parent_task_id, blocked_by,
          tags, error_message, retry_count, commit_hash, diff_summary
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `).run(
        task.id,
        task.boardId,
        task.title,
        task.description ?? null,
        task.importance,
        task.status,
        task.agentId,
        task.agentName,
        task.agentType,
        task.sessionId,
        task.createdAt.getTime(),
        task.claimedAt?.getTime() ?? null,
        task.startedAt?.getTime() ?? null,
        task.completedAt?.getTime() ?? null,
        task.updatedAt.getTime(),
        task.progress ?? null,
        task.currentAction ?? null,
        safeJsonStringify(task.files),
        safeJsonStringify(task.linesChanged),
        task.tokensUsed ?? null,
        task.estimatedDuration ?? null,
        task.actualDuration ?? null,
        task.parentTaskId ?? null,
        safeJsonStringify(task.blockedBy),
        safeJsonStringify(task.tags),
        task.errorMessage ?? null,
        task.retryCount ?? 0,
        task.commitHash ?? null,
        safeJsonStringify(task.diffSummary)
      );

      // Insert code changes if any
      if (task.codeChanges && task.codeChanges.length > 0) {
        this.addCodeChanges(task.id, task.codeChanges);
      }
    } catch (error) {
      throw new DatabaseError(
        `Failed to create task ${task.id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Retrieves a task by its unique identifier, including its code changes.
   *
   * @param id - The unique identifier of the task
   * @returns The task object or null if not found
   * @throws {ValidationError} If the ID is invalid
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * const task = repository.get('task-123');
   * if (task) {
   *   console.log(`Task: ${task.title} (${task.status})`);
   * }
   * ```
   */
  get(id: string): AgentTask | null {
    validateUUID(id, 'id');

    try {
      const db = getDatabase();
      const row = db.prepare('SELECT * FROM agent_tasks WHERE id = ?').get(id) as TaskRow | undefined;

      if (!row) return null;

      // Get associated code changes
      const codeChanges = this.getCodeChanges(id);

      return this.rowToTask(row, codeChanges);
    } catch (error) {
      throw new DatabaseError(
        `Failed to get task ${id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Updates a task with partial data.
   * Only the fields provided in the updates object will be modified.
   *
   * @param id - The unique identifier of the task
   * @param updates - Partial task data to update
   * @throws {ValidationError} If the ID is invalid
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * repository.update('task-123', {
   *   status: 'in_progress',
   *   progress: 50,
   *   currentAction: 'Writing tests',
   * });
   * ```
   */
  update(id: string, updates: Partial<AgentTask>): void {
    validateUUID(id, 'id');

    try {
      const db = getDatabase();
      const fields: string[] = [];
      const values: any[] = [];

      // Build UPDATE query dynamically
      for (const [key, value] of Object.entries(updates)) {
        if (key === 'id' || key === 'codeChanges') continue; // Skip these fields

        const dbColumn = camelToSnake(key);

        if (value instanceof Date) {
          fields.push(`${dbColumn} = ?`);
          values.push(value.getTime());
        } else if (typeof value === 'object' && value !== null) {
          fields.push(`${dbColumn} = ?`);
          values.push(safeJsonStringify(value));
        } else {
          fields.push(`${dbColumn} = ?`);
          values.push(value);
        }
      }

      if (fields.length > 0) {
        values.push(id);
        const result = db.prepare(`
          UPDATE agent_tasks SET ${fields.join(', ')} WHERE id = ?
        `).run(...values);

        if (result.changes === 0) {
          throw new NotFoundError(`Task not found: ${id}`, id);
        }
      }

      // Update code changes if provided
      if (updates.codeChanges) {
        this.addCodeChanges(id, updates.codeChanges);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(
        `Failed to update task ${id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Deletes a task from the database.
   * This will also delete associated code changes due to CASCADE constraint.
   *
   * @param id - The unique identifier of the task
   * @throws {ValidationError} If the ID is invalid
   * @throws {NotFoundError} If the task is not found
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * repository.delete('task-123');
   * ```
   */
  delete(id: string): void {
    validateUUID(id, 'id');

    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM agent_tasks WHERE id = ?').run(id);

      if (result.changes === 0) {
        throw new NotFoundError(`Task not found: ${id}`, id);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(
        `Failed to delete task ${id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Retrieves all tasks for a specific board, ordered by update time (newest first).
   *
   * @param boardId - The unique identifier of the board
   * @returns Array of tasks for the board
   * @throws {ValidationError} If the board ID is invalid
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * const tasks = repository.getByBoard('board-123');
   * console.log(`Found ${tasks.length} tasks`);
   * ```
   */
  getByBoard(boardId: string): AgentTask[] {
    validateUUID(boardId, 'boardId');

    try {
      const db = getDatabase();
      const rows = db.prepare(`
        SELECT * FROM agent_tasks WHERE board_id = ? ORDER BY updated_at DESC
      `).all(boardId) as TaskRow[];

      return rows.map((row) => {
        const codeChanges = this.getCodeChanges(row.id);
        return this.rowToTask(row, codeChanges);
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to get tasks for board ${boardId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Retrieves tasks assigned to a specific agent, optionally filtered by status.
   *
   * @param agentId - The unique identifier of the agent
   * @param status - Optional filter: 'active' (in progress), 'completed', or 'all'
   * @returns Array of tasks for the agent
   * @throws {ValidationError} If the agent ID is invalid
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * // Get all active tasks for an agent
   * const activeTasks = repository.getByAgent('agent-123', 'active');
   *
   * // Get all tasks (any status)
   * const allTasks = repository.getByAgent('agent-123', 'all');
   * ```
   */
  getByAgent(agentId: string, status?: 'active' | 'completed' | 'all'): AgentTask[] {
    validateUUID(agentId, 'agentId');

    try {
      const db = getDatabase();
      let query = 'SELECT * FROM agent_tasks WHERE agent_id = ?';
      const params: any[] = [agentId];

      if (status === 'active') {
        query += ' AND status IN (?, ?, ?)';
        params.push('claimed', 'in_progress', 'review');
      } else if (status === 'completed') {
        query += ' AND status = ?';
        params.push('done');
      }

      query += ' ORDER BY updated_at DESC';

      const rows = db.prepare(query).all(...params) as TaskRow[];

      return rows.map((row) => {
        const codeChanges = this.getCodeChanges(row.id);
        return this.rowToTask(row, codeChanges);
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to get tasks for agent ${agentId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Retrieves all tasks that are currently blocked on a specific board.
   * A task is considered blocked if it has a non-empty blockedBy array.
   *
   * @param boardId - The unique identifier of the board
   * @returns Array of blocked tasks
   * @throws {ValidationError} If the board ID is invalid
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * const blockedTasks = repository.getBlockedTasks('board-123');
   * blockedTasks.forEach(task => {
   *   console.log(`${task.title} is blocked by: ${task.blockedBy?.join(', ')}`);
   * });
   * ```
   */
  getBlockedTasks(boardId: string): AgentTask[] {
    validateUUID(boardId, 'boardId');

    try {
      const db = getDatabase();
      const rows = db.prepare(`
        SELECT * FROM agent_tasks
        WHERE board_id = ? AND blocked_by IS NOT NULL AND blocked_by != '[]'
        ORDER BY updated_at DESC
      `).all(boardId) as TaskRow[];

      return rows.map((row) => {
        const codeChanges = this.getCodeChanges(row.id);
        return this.rowToTask(row, codeChanges);
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to get blocked tasks for board ${boardId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Adds code changes to a task.
   * Each code change is stored as a separate row in the code_changes table.
   *
   * @param taskId - The unique identifier of the task
   * @param changes - Array of code changes to add
   * @private
   */
  private addCodeChanges(taskId: string, changes: CodeChange[]): void {
    const db = getDatabase();

    for (const change of changes) {
      const id = randomUUID();
      db.prepare(`
        INSERT INTO code_changes (
          id, task_id, file_path, change_type, old_path, diff, language,
          lines_added, lines_deleted, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        taskId,
        change.filePath,
        change.changeType,
        change.oldPath ?? null,
        change.diff,
        change.language ?? null,
        change.linesAdded ?? 0,
        change.linesDeleted ?? 0,
        Date.now()
      );
    }
  }

  /**
   * Retrieves all code changes associated with a task.
   * Code changes are ordered by creation time (oldest first).
   *
   * @param taskId - The unique identifier of the task
   * @returns Array of code changes
   * @private
   */
  private getCodeChanges(taskId: string): CodeChange[] {
    const db = getDatabase();

    const rows = db.prepare(`
      SELECT * FROM code_changes WHERE task_id = ? ORDER BY created_at ASC
    `).all(taskId) as CodeChangeRow[];

    return rows.map((row) => ({
      filePath: row.file_path,
      changeType: row.change_type as CodeChange['changeType'],
      oldPath: row.old_path ?? undefined,
      diff: row.diff,
      language: row.language ?? undefined,
      linesAdded: row.lines_added,
      linesDeleted: row.lines_deleted,
    }));
  }

  /**
   * Converts a database row to an AgentTask object.
   *
   * @param row - The database row to convert
   * @param codeChanges - Array of associated code changes
   * @returns The AgentTask object
   * @private
   */
  private rowToTask(row: TaskRow, codeChanges: CodeChange[]): AgentTask {
    return {
      id: row.id,
      boardId: row.board_id,
      title: row.title,
      description: row.description ?? undefined,
      importance: row.importance as AgentTask['importance'],
      status: row.status as AgentTask['status'],
      agentId: row.agent_id,
      agentName: row.agent_name,
      agentType: row.agent_type,
      sessionId: row.session_id,
      createdAt: new Date(row.created_at),
      claimedAt: row.claimed_at ? new Date(row.claimed_at) : undefined,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      updatedAt: new Date(row.updated_at),
      progress: row.progress ?? undefined,
      currentAction: row.current_action ?? undefined,
      files: safeJsonParse<string[]>(row.files) || undefined,
      linesChanged: safeJsonParse<{ added: number; removed: number }>(row.lines_changed) || undefined,
      tokensUsed: row.tokens_used ?? undefined,
      estimatedDuration: row.estimated_duration ?? undefined,
      actualDuration: row.actual_duration ?? undefined,
      parentTaskId: row.parent_task_id ?? undefined,
      blockedBy: safeJsonParse<string[]>(row.blocked_by) || undefined,
      tags: safeJsonParse<string[]>(row.tags) || undefined,
      errorMessage: row.error_message ?? undefined,
      retryCount: row.retry_count,
      commitHash: row.commit_hash ?? undefined,
      diffSummary: safeJsonParse<DiffSummary>(row.diff_summary) || undefined,
      codeChanges: codeChanges.length > 0 ? codeChanges : undefined,
    };
  }
}
