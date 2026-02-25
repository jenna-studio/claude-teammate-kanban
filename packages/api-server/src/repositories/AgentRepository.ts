/**
 * Agent Repository - Data access layer for agents
 */

import Database from 'better-sqlite3';
import { Agent, AgentTask } from '@agent-track/shared';

export class AgentRepository {
  constructor(private db: Database.Database) {}

  /**
   * Get all agents
   * @returns Array of agents
   */
  getAll(): Agent[] {
    const stmt = this.db.prepare(`
      SELECT
        id,
        name,
        type,
        status,
        current_session_id as currentSessionId,
        capabilities,
        max_concurrent_tasks as maxConcurrentTasks,
        tasks_completed as tasksCompleted,
        tasks_in_progress as tasksInProgress,
        average_task_duration as averageTaskDuration,
        success_rate as successRate,
        last_heartbeat as lastHeartbeat,
        metadata
      FROM agents
      ORDER BY last_heartbeat DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => this.mapRowToAgent(row));
  }

  /**
   * Get agent by ID
   * @param id - Agent ID
   * @returns Agent or null if not found
   */
  getById(id: string): Agent | null {
    const stmt = this.db.prepare(`
      SELECT
        id,
        name,
        type,
        status,
        current_session_id as currentSessionId,
        capabilities,
        max_concurrent_tasks as maxConcurrentTasks,
        tasks_completed as tasksCompleted,
        tasks_in_progress as tasksInProgress,
        average_task_duration as averageTaskDuration,
        success_rate as successRate,
        last_heartbeat as lastHeartbeat,
        metadata
      FROM agents
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    return row ? this.mapRowToAgent(row) : null;
  }

  /**
   * Get active agents (with recent heartbeat)
   * @param maxAgeMinutes - Maximum age of heartbeat in minutes (default: 5)
   * @returns Array of active agents
   */
  getActive(maxAgeMinutes: number = 5): Agent[] {
    const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString();

    const stmt = this.db.prepare(`
      SELECT
        id,
        name,
        type,
        status,
        current_session_id as currentSessionId,
        capabilities,
        max_concurrent_tasks as maxConcurrentTasks,
        tasks_completed as tasksCompleted,
        tasks_in_progress as tasksInProgress,
        average_task_duration as averageTaskDuration,
        success_rate as successRate,
        last_heartbeat as lastHeartbeat,
        metadata
      FROM agents
      WHERE status = 'active'
        AND last_heartbeat >= ?
      ORDER BY last_heartbeat DESC
    `);

    const rows = stmt.all(cutoffTime) as any[];
    return rows.map(row => this.mapRowToAgent(row));
  }

  /**
   * Get tasks for an agent
   * @param agentId - Agent ID
   * @param status - Optional status filter
   * @returns Array of tasks
   */
  getAgentTasks(agentId: string, status?: string): AgentTask[] {
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
      WHERE agent_id = ?
    `;

    const params: any[] = [agentId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY updated_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => this.mapRowToTask(row));
  }

  /**
   * Get agent statistics
   * @param agentId - Agent ID
   * @returns Statistics object
   */
  getStatistics(agentId: string): {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    inProgressTasks: number;
    averageDuration: number;
    totalTokensUsed: number;
  } {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as totalTasks,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completedTasks,
        SUM(CASE WHEN error_message IS NOT NULL THEN 1 ELSE 0 END) as failedTasks,
        SUM(CASE WHEN status IN ('claimed', 'in_progress') THEN 1 ELSE 0 END) as inProgressTasks,
        AVG(CASE WHEN actual_duration IS NOT NULL THEN actual_duration ELSE NULL END) as averageDuration,
        SUM(COALESCE(tokens_used, 0)) as totalTokensUsed
      FROM agent_tasks
      WHERE agent_id = ?
    `);

    const result = stmt.get(agentId) as any;

    return {
      totalTasks: result.totalTasks || 0,
      completedTasks: result.completedTasks || 0,
      failedTasks: result.failedTasks || 0,
      inProgressTasks: result.inProgressTasks || 0,
      averageDuration: result.averageDuration || 0,
      totalTokensUsed: result.totalTokensUsed || 0,
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
      currentSessionId: row.currentSessionId,
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
