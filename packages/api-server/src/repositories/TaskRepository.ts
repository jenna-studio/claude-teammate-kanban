/**
 * Task Repository - Data access layer for tasks
 */

import Database from 'better-sqlite3';
import { AgentTask, CodeChange, Comment } from '@agent-track/shared';

export class TaskRepository {
  constructor(private db: Database.Database) {}

  /**
   * Get task by ID with code changes
   * @param id - Task ID
   * @returns Task with code changes or null if not found
   */
  getById(id: string): AgentTask | null {
    const stmt = this.db.prepare(`
      SELECT
        id,
        board_id as boardId,
        title,
        description,
        importance,
        status,
        agent_id as agentId,
        agent_name as agentName,
        agent_type as agentType,
        session_id as sessionId,
        created_at as createdAt,
        claimed_at as claimedAt,
        started_at as startedAt,
        completed_at as completedAt,
        updated_at as updatedAt,
        progress,
        current_action as currentAction,
        files,
        lines_changed as linesChanged,
        tokens_used as tokensUsed,
        estimated_duration as estimatedDuration,
        actual_duration as actualDuration,
        parent_task_id as parentTaskId,
        blocked_by as blockedBy,
        tags,
        error_message as errorMessage,
        retry_count as retryCount,
        commit_hash as commitHash
      FROM agent_tasks
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) {
      return null;
    }

    const task = this.mapRowToTask(row);

    // Load code changes
    task.codeChanges = this.getCodeChanges(id);

    // Calculate diff summary
    if (task.codeChanges && task.codeChanges.length > 0) {
      task.diffSummary = {
        filesChanged: task.codeChanges.length,
        insertions: task.codeChanges.reduce((sum, c) => sum + (c.linesAdded || 0), 0),
        deletions: task.codeChanges.reduce((sum, c) => sum + (c.linesDeleted || 0), 0),
      };
    }

    return task;
  }

  /**
   * Get all tasks with optional filtering
   * @param filters - Optional filters
   * @returns Array of tasks
   */
  getAll(filters?: {
    boardId?: string;
    agentId?: string;
    status?: string;
    importance?: string;
  }): AgentTask[] {
    let query = `
      SELECT
        id,
        board_id as boardId,
        title,
        description,
        importance,
        status,
        agent_id as agentId,
        agent_name as agentName,
        agent_type as agentType,
        session_id as sessionId,
        created_at as createdAt,
        claimed_at as claimedAt,
        started_at as startedAt,
        completed_at as completedAt,
        updated_at as updatedAt,
        progress,
        current_action as currentAction,
        files,
        lines_changed as linesChanged,
        tokens_used as tokensUsed,
        estimated_duration as estimatedDuration,
        actual_duration as actualDuration,
        parent_task_id as parentTaskId,
        blocked_by as blockedBy,
        tags,
        error_message as errorMessage,
        retry_count as retryCount
      FROM agent_tasks
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters?.boardId) {
      query += ' AND board_id = ?';
      params.push(filters.boardId);
    }

    if (filters?.agentId) {
      query += ' AND agent_id = ?';
      params.push(filters.agentId);
    }

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.importance) {
      query += ' AND importance = ?';
      params.push(filters.importance);
    }

    query += ' ORDER BY updated_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => this.mapRowToTask(row));
  }

  /**
   * Get code changes for a task
   * @param taskId - Task ID
   * @returns Array of code changes
   */
  getCodeChanges(taskId: string): CodeChange[] {
    const stmt = this.db.prepare(`
      SELECT
        file_path as filePath,
        change_type as changeType,
        old_path as oldPath,
        diff,
        language,
        lines_added as linesAdded,
        lines_deleted as linesDeleted
      FROM code_changes
      WHERE task_id = ?
      ORDER BY created_at ASC
    `);

    return stmt.all(taskId) as CodeChange[];
  }

  /**
   * Get comments for a task
   * @param taskId - Task ID
   * @returns Array of comments
   */
  getComments(taskId: string): Comment[] {
    const stmt = this.db.prepare(`
      SELECT
        id,
        task_id as taskId,
        author,
        author_type as authorType,
        content,
        created_at as createdAt,
        updated_at as updatedAt,
        parent_comment_id as parentCommentId,
        metadata
      FROM comments
      WHERE task_id = ?
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(taskId) as any[];
    return rows.map(row => ({
      id: row.id,
      taskId: row.taskId,
      author: row.author,
      authorType: row.authorType,
      content: row.content,
      createdAt: new Date(row.createdAt),
      updatedAt: row.updatedAt ? new Date(row.updatedAt) : undefined,
      parentCommentId: row.parentCommentId,
      metadata: this.parseJson(row.metadata),
    }));
  }

  /**
   * Add a comment to a task
   * @param comment - Comment to add
   * @returns Created comment
   */
  addComment(comment: Omit<Comment, 'id' | 'createdAt'>): Comment {
    const id = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO comments (
        id,
        task_id,
        author,
        author_type,
        content,
        created_at,
        parent_comment_id,
        metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      comment.taskId,
      comment.author,
      comment.authorType,
      comment.content,
      createdAt,
      comment.parentCommentId || null,
      comment.metadata ? JSON.stringify(comment.metadata) : null
    );

    return {
      id,
      taskId: comment.taskId,
      author: comment.author,
      authorType: comment.authorType,
      content: comment.content,
      createdAt: new Date(createdAt),
      parentCommentId: comment.parentCommentId,
      metadata: comment.metadata,
    };
  }

  /**
   * Update task status
   * @param taskId - Task ID
   * @param status - New status
   * @returns Updated task or null if not found
   */
  updateStatus(taskId: string, status: string): AgentTask | null {
    const stmt = this.db.prepare(`
      UPDATE agent_tasks
      SET status = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(status, new Date().toISOString(), taskId);

    if (result.changes === 0) {
      return null;
    }

    return this.getById(taskId);
  }

  /**
   * Map database row to AgentTask object
   */
  private mapRowToTask(row: any): AgentTask {
    return {
      id: row.id,
      boardId: row.boardId,
      title: row.title,
      description: row.description,
      importance: row.importance,
      status: row.status,
      agentId: row.agentId,
      agentName: row.agentName,
      agentType: row.agentType,
      sessionId: row.sessionId,
      createdAt: new Date(row.createdAt),
      claimedAt: row.claimedAt ? new Date(row.claimedAt) : undefined,
      startedAt: row.startedAt ? new Date(row.startedAt) : undefined,
      completedAt: row.completedAt ? new Date(row.completedAt) : undefined,
      updatedAt: new Date(row.updatedAt),
      progress: row.progress,
      currentAction: row.currentAction,
      files: this.parseJson(row.files, []),
      linesChanged: this.parseJson(row.linesChanged),
      tokensUsed: row.tokensUsed,
      estimatedDuration: row.estimatedDuration,
      actualDuration: row.actualDuration,
      parentTaskId: row.parentTaskId,
      blockedBy: this.parseJson(row.blockedBy, []),
      tags: this.parseJson(row.tags, []),
      errorMessage: row.errorMessage,
      retryCount: row.retryCount,
      commitHash: row.commitHash,
    };
  }

  /**
   * Safely parse JSON string
   */
  private parseJson<T>(value: any, defaultValue?: T): T | undefined {
    if (!value) {
      return defaultValue;
    }
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    }
    return value;
  }
}
