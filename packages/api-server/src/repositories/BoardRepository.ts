/**
 * Board Repository - Data access layer for boards
 */

import Database from 'better-sqlite3';
import { Board, BoardColumn, BoardSettings, BoardResponse, BoardStatistics, AgentTask, Agent, AgentStatus } from '@agent-track/shared';

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
   * Get agents working on a board (have tasks or active sessions on this board)
   * @param boardId - Board ID
   * @returns Array of agents
   */
  getBoardAgents(boardId: string): Agent[] {
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
      WHERE a.id IN (
        SELECT agent_id FROM agent_tasks WHERE board_id = ?
        UNION
        SELECT agent_id FROM sessions WHERE board_id = ?
      )
    `);

    const rows = stmt.all(boardId, boardId) as any[];
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
   * Create a new board
   * @param data - Board data
   * @returns Created board
   */
  create(data: {
    name: string;
    description?: string;
    projectPath: string;
    repository?: string;
    settings?: Partial<BoardSettings>;
  }): Board {
    const id = this.generateId();
    const now = new Date().toISOString();
    const settings = { ...data.settings };

    const stmt = this.db.prepare(`
      INSERT INTO boards (id, name, description, project_path, repository, settings, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.name,
      data.description || null,
      data.projectPath,
      data.repository || null,
      JSON.stringify(settings),
      now,
      now
    );

    return this.getById(id)!;
  }

  /**
   * Update a board
   * @param id - Board ID
   * @param data - Updated board data
   * @returns Updated board or null if not found
   */
  update(id: string, data: {
    name?: string;
    description?: string;
    projectPath?: string;
    repository?: string;
    settings?: Partial<BoardSettings>;
  }): Board | null {
    const existing = this.getById(id);
    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.projectPath !== undefined) {
      updates.push('project_path = ?');
      values.push(data.projectPath);
    }
    if (data.repository !== undefined) {
      updates.push('repository = ?');
      values.push(data.repository);
    }
    if (data.settings !== undefined) {
      updates.push('settings = ?');
      values.push(JSON.stringify({ ...existing.settings, ...data.settings }));
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE boards
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.getById(id);
  }

  /**
   * Delete a board
   * @param id - Board ID
   * @returns True if deleted, false if not found
   */
  delete(id: string): boolean {
    const existing = this.getById(id);
    if (!existing) {
      return false;
    }

    const stmt = this.db.prepare('DELETE FROM boards WHERE id = ?');
    stmt.run(id);
    return true;
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `board-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
   * Map database row to Agent object with computed statistics and status
   */
  private mapRowToAgent(row: any): Agent {
    const stats = this.computeAgentStats(row.id);
    const status = this.computeAgentStatus(row.lastHeartbeat, stats.tasksInProgress, row.id);

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      status,
      capabilities: this.parseJson(row.capabilities, []),
      maxConcurrentTasks: row.maxConcurrentTasks,
      tasksCompleted: stats.tasksCompleted,
      tasksInProgress: stats.tasksInProgress,
      averageTaskDuration: stats.averageTaskDuration,
      successRate: stats.successRate,
      lastHeartbeat: new Date(row.lastHeartbeat),
      metadata: this.parseJson(row.metadata),
    };
  }

  /**
   * Compute agent status based on heartbeat and task activity
   */
  private computeAgentStatus(lastHeartbeat: number, tasksInProgress: number, agentId?: string): AgentStatus {
    const now = Date.now();
    const heartbeatAge = now - lastHeartbeat;
    const fiveMinutes = 5 * 60 * 1000;
    const tenMinutes = 10 * 60 * 1000;

    if (heartbeatAge <= fiveMinutes) {
      return AgentStatus.ACTIVE;
    }
    if (heartbeatAge <= tenMinutes) {
      return AgentStatus.IDLE;
    }

    if (agentId) {
      const recentTask = this.db.prepare(`
        SELECT MAX(updated_at) as lastUpdate
        FROM agent_tasks
        WHERE agent_id = ? AND status IN ('claimed', 'in_progress', 'review')
      `).get(agentId) as any;

      if (recentTask?.lastUpdate) {
        const taskAge = now - recentTask.lastUpdate;
        if (taskAge <= fiveMinutes) return AgentStatus.ACTIVE;
        if (taskAge <= tenMinutes) return AgentStatus.IDLE;
      }
    }

    if (tasksInProgress > 0) {
      return AgentStatus.IDLE;
    }

    return AgentStatus.OFFLINE;
  }

  /**
   * Compute agent statistics from tasks table
   */
  private computeAgentStats(agentId: string): {
    tasksCompleted: number;
    tasksInProgress: number;
    averageTaskDuration: number;
    successRate: number;
  } {
    const result = this.db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completedTasks,
        SUM(CASE WHEN error_message IS NOT NULL AND status = 'done' THEN 1 ELSE 0 END) as failedTasks,
        SUM(CASE WHEN status IN ('claimed', 'in_progress', 'review') THEN 1 ELSE 0 END) as inProgressTasks,
        AVG(CASE WHEN actual_duration IS NOT NULL AND status = 'done' THEN actual_duration ELSE NULL END) as averageDuration
      FROM agent_tasks
      WHERE agent_id = ?
    `).get(agentId) as any;

    const completedTasks = result.completedTasks || 0;
    const failedTasks = result.failedTasks || 0;
    const inProgressTasks = result.inProgressTasks || 0;

    let successRate = 100;
    if (completedTasks > 0) {
      successRate = Math.round(((completedTasks - failedTasks) / completedTasks) * 100);
    }

    return {
      tasksCompleted: completedTasks,
      tasksInProgress: inProgressTasks,
      averageTaskDuration: Math.round(result.averageDuration || 0),
      successRate,
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
