/**
 * Board Repository - Data access layer for boards
 */

import Database from 'better-sqlite3';
import { Board, BoardColumn, BoardSettings, BoardResponse, BoardStatistics, AgentTask, Agent } from '@agent-track/shared';

export class BoardRepository {
  constructor(private db: Database.Database) {}

  /**
   * Get all boards
   * @returns Array of boards
   */
  getAll(): Board[] {
    const stmt = this.db.prepare(`
      SELECT
        id,
        name,
        description,
        project_path as projectPath,
        repository,
        settings,
        created_at as createdAt,
        updated_at as updatedAt
      FROM boards
      ORDER BY updated_at DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => this.mapRowToBoard(row));
  }

  /**
   * Get board by ID
   * @param id - Board ID
   * @returns Board or null if not found
   */
  getById(id: string): Board | null {
    const stmt = this.db.prepare(`
      SELECT
        id,
        name,
        description,
        project_path as projectPath,
        repository,
        settings,
        created_at as createdAt,
        updated_at as updatedAt
      FROM boards
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    return row ? this.mapRowToBoard(row) : null;
  }

  /**
   * Get complete board with columns, tasks, and agents
   * @param id - Board ID
   * @returns BoardResponse or null if not found
   */
  getBoardWithDetails(id: string): BoardResponse | null {
    const board = this.getById(id);
    if (!board) {
      return null;
    }

    const columns = this.getBoardColumns(id);
    const tasks = this.getBoardTasks(id);
    const agents = this.getBoardAgents(id);
    const activeSessionCount = this.getActiveSessionCount(id);
    const statistics = this.getBoardStatistics(id);

    return {
      board,
      columns,
      tasks,
      agents,
      activeSessionCount,
      statistics,
    };
  }

  /**
   * Get board columns
   * @param boardId - Board ID
   * @returns Array of board columns
   */
  getBoardColumns(boardId: string): BoardColumn[] {
    const stmt = this.db.prepare(`
      SELECT
        id,
        name,
        position,
        wip_limit as wipLimit,
        color
      FROM board_columns
      WHERE board_id = ?
      ORDER BY position
    `);

    return stmt.all(boardId) as BoardColumn[];
  }

  /**
   * Get board tasks
   * @param boardId - Board ID
   * @returns Array of tasks
   */
  private getBoardTasks(boardId: string): AgentTask[] {
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
        retry_count as retryCount
      FROM agent_tasks
      WHERE board_id = ?
      ORDER BY updated_at DESC
    `);

    const rows = stmt.all(boardId) as any[];
    return rows.map(row => this.mapRowToTask(row));
  }

  /**
   * Get agents working on a board
   * @param boardId - Board ID
   * @returns Array of agents
   */
  private getBoardAgents(boardId: string): Agent[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT
        a.id,
        a.name,
        a.type,
        a.status,
        a.capabilities,
        a.max_concurrent_tasks as maxConcurrentTasks,
        a.tasks_completed as tasksCompleted,
        a.tasks_in_progress as tasksInProgress,
        a.average_task_duration as averageTaskDuration,
        a.success_rate as successRate,
        a.last_heartbeat as lastHeartbeat,
        a.metadata
      FROM agents a
      INNER JOIN agent_tasks t ON a.id = t.agent_id
      WHERE t.board_id = ?
    `);

    const rows = stmt.all(boardId) as any[];
    return rows.map(row => this.mapRowToAgent(row));
  }

  /**
   * Get active session count for a board
   * @param boardId - Board ID
   * @returns Number of active sessions
   */
  private getActiveSessionCount(boardId: string): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM sessions
      WHERE board_id = ? AND is_active = 1
    `);

    const result = stmt.get(boardId) as { count: number };
    return result.count;
  }

  /**
   * Get board statistics
   * @param boardId - Board ID
   * @returns Board statistics
   */
  getBoardStatistics(boardId: string): BoardStatistics {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as totalTasks,
        SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todoCount,
        SUM(CASE WHEN status = 'claimed' THEN 1 ELSE 0 END) as claimedCount,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as inProgressCount,
        SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) as reviewCount,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as doneCount,
        AVG(CASE WHEN actual_duration IS NOT NULL THEN actual_duration ELSE NULL END) as averageCompletionTime,
        SUM(COALESCE(tokens_used, 0)) as totalTokensUsed
      FROM agent_tasks
      WHERE board_id = ?
    `);

    const result = stmt.get(boardId) as any;
    return {
      totalTasks: result.totalTasks || 0,
      todoCount: result.todoCount || 0,
      claimedCount: result.claimedCount || 0,
      inProgressCount: result.inProgressCount || 0,
      reviewCount: result.reviewCount || 0,
      doneCount: result.doneCount || 0,
      averageCompletionTime: result.averageCompletionTime || 0,
      totalTokensUsed: result.totalTokensUsed || 0,
    };
  }

  /**
   * Map database row to Board object
   */
  private mapRowToBoard(row: any): Board {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      projectPath: row.projectPath,
      repository: row.repository,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      settings: this.parseJson<BoardSettings>(row.settings, {
        autoArchiveCompleted: false,
        archiveAfterHours: 24,
        enableNotifications: true,
        criticalTaskAlerts: true,
      }),
    };
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
    };
  }

  /**
   * Map database row to Agent object
   */
  private mapRowToAgent(row: any): Agent {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      capabilities: this.parseJson(row.capabilities, []),
      maxConcurrentTasks: row.maxConcurrentTasks,
      tasksCompleted: row.tasksCompleted,
      tasksInProgress: row.tasksInProgress,
      averageTaskDuration: row.averageTaskDuration,
      successRate: row.successRate,
      lastHeartbeat: new Date(row.lastHeartbeat),
      metadata: this.parseJson(row.metadata),
    };
  }

  /**
   * Safely parse JSON string
   */
  private parseJson<T>(value: any): T | undefined;
  private parseJson<T>(value: any, defaultValue: T): T;
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
