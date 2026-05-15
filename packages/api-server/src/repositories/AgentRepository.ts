/**
 * Agent Repository - Data access layer for agents
 */

import Database from 'better-sqlite3';
import { Agent, AgentTask, AgentStatus } from '@agent-track/shared';

export class AgentRepository {
  constructor(private db: Database.Database) {}

  /**
   * Get all agents with computed statistics
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
        last_heartbeat as lastHeartbeat,
        metadata
      FROM agents
      ORDER BY last_heartbeat DESC
    `);

    const rows = stmt.all() as any[];
    return rows
      .map(row => this.mapRowToAgentWithStats(row))
      .filter(agent => !this.isHidden(agent.metadata));
  }

  /**
   * Get agent by ID with computed statistics
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
        last_heartbeat as lastHeartbeat,
        metadata
      FROM agents
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    return row ? this.mapRowToAgentWithStats(row) : null;
  }

  /**
   * Create or update an agent (upsert by name)
   */
  upsert(data: {
    id?: string;
    name: string;
    type: string;
    status?: string;
    capabilities?: string[];
    maxConcurrentTasks?: number;
    lastHeartbeat?: string | number;
    metadata?: Record<string, unknown>;
  }): Agent {
    const now =
      typeof data.lastHeartbeat === 'number'
        ? data.lastHeartbeat
        : data.lastHeartbeat
          ? new Date(data.lastHeartbeat).getTime()
          : Date.now();
    const agentId = data.id;

    if (agentId) {
      const existing = this.db.prepare('SELECT id FROM agents WHERE id = ?').get(agentId) as any;
      if (existing) {
        this.db.prepare(`
          UPDATE agents SET
            name = ?, type = ?, status = ?, capabilities = ?, max_concurrent_tasks = ?,
            last_heartbeat = ?, metadata = COALESCE(?, metadata)
          WHERE id = ?
        `).run(
          data.name,
          data.type,
          data.status || 'active',
          JSON.stringify(data.capabilities || []),
          data.maxConcurrentTasks || 1,
          now,
          data.metadata ? JSON.stringify(data.metadata) : null,
          agentId
        );
        return this.getById(agentId)!;
      }
    }

    const id = agentId || `agent-${now}-${Math.random().toString(36).slice(2, 9)}`;

    this.db.prepare(`
      INSERT INTO agents (id, name, type, status, capabilities, max_concurrent_tasks,
        tasks_completed, tasks_in_progress, average_task_duration, success_rate, last_heartbeat, metadata)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 100, ?, ?)
    `).run(
      id,
      data.name,
      data.type,
      data.status || 'active',
      JSON.stringify(data.capabilities || []),
      data.maxConcurrentTasks || 1,
      now,
      data.metadata ? JSON.stringify(data.metadata) : null
    );

    return this.getById(id)!;
  }

  /**
   * Update agent fields
   */
  update(id: string, data: Partial<{ name: string; status: string; lastHeartbeat: string | number; metadata: Record<string, unknown> }>): void {
    const existing = this.getById(id);
    if (!existing) {
      return;
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (data.name) {
      fields.push('name = ?');
      values.push(data.name);
      // Also update the agent name on all its tasks
      this.db.prepare('UPDATE agent_tasks SET agent_name = ? WHERE agent_id = ?').run(data.name, id);
    }
    if (data.status) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.lastHeartbeat !== undefined) {
      fields.push('last_heartbeat = ?');
      values.push(
        typeof data.lastHeartbeat === 'number'
          ? data.lastHeartbeat
          : new Date(data.lastHeartbeat).getTime()
      );
    }
    if (data.metadata) {
      fields.push('metadata = ?');
      values.push(JSON.stringify({ ...(existing.metadata || {}), ...data.metadata }));
    }

    if (fields.length > 0) {
      values.push(id);
      this.db.prepare(`
        UPDATE agents SET ${fields.join(', ')} WHERE id = ?
      `).run(...values);
    }
  }

  /**
   * Soft-delete an ended agent from the live pool.
   */
  archiveIfEnded(id: string): Agent | null {
    const activeSession = this.db.prepare(`
      SELECT 1
      FROM sessions
      WHERE agent_id = ? AND is_active = 1
      LIMIT 1
    `).get(id);

    const unfinishedTask = this.db.prepare(`
      SELECT 1
      FROM agent_tasks
      WHERE agent_id = ? AND status IN ('todo', 'claimed', 'in_progress', 'review')
      LIMIT 1
    `).get(id);

    if (activeSession || unfinishedTask) {
      return null;
    }

    this.update(id, {
      status: 'offline',
      metadata: {
        archived: true,
        hidden: true,
        archivedAt: new Date().toISOString(),
      },
    });

    return this.getById(id);
  }

  /**
   * Get active agents (with recent heartbeat) with computed statistics
   * @param maxAgeMinutes - Maximum age of heartbeat in minutes (default: 5)
   * @returns Array of active agents
   */
  getActive(maxAgeMinutes: number = 5): Agent[] {
    const cutoffTime = Date.now() - maxAgeMinutes * 60 * 1000;

    const stmt = this.db.prepare(`
      SELECT
        id,
        name,
        type,
        status,
        current_session_id as currentSessionId,
        capabilities,
        max_concurrent_tasks as maxConcurrentTasks,
        last_heartbeat as lastHeartbeat,
        metadata
      FROM agents
      WHERE status = 'active'
        AND last_heartbeat >= ?
      ORDER BY last_heartbeat DESC
    `);

    const rows = stmt.all(cutoffTime) as any[];
    return rows
      .map(row => this.mapRowToAgentWithStats(row))
      .filter(agent => !this.isHidden(agent.metadata));
  }

  /**
   * Get tasks for an agent
   * @param agentId - Agent ID
   * @param status - Optional status filter
   * @returns Array of tasks
   */
  getAgentTasks(agentId: string, status?: string, boardId?: string): AgentTask[] {
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

    if (boardId) {
      query += ' AND board_id = ?';
      params.push(boardId);
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
        SUM(CASE WHEN status IN ('claimed', 'in_progress', 'review') THEN 1 ELSE 0 END) as inProgressTasks,
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
   * Map database row to Agent object with computed statistics and status
   */
  private mapRowToAgentWithStats(row: any): Agent {
    // Compute real-time statistics from tasks
    const stats = this.computeAgentStats(row.id);

    // Compute agent status based on heartbeat + task activity
    const status = this.computeAgentStatus(row.lastHeartbeat, stats.tasksInProgress, row.id);

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      status,
      currentSessionId: row.currentSessionId,
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

  private isHidden(metadata?: Record<string, unknown>): boolean {
    return Boolean(metadata && metadata.hidden === true);
  }

  /**
   * Compute agent status based on heartbeat and task activity.
   * - active: heartbeat within 5 min OR has recently updated in-progress tasks
   * - idle: heartbeat within 10 min OR has in-progress/claimed tasks (stale but not done)
   * - offline: no heartbeat and no active tasks
   */
  private computeAgentStatus(lastHeartbeat: number, tasksInProgress: number, agentId?: string): AgentStatus {
    const now = Date.now();
    const heartbeatAge = now - lastHeartbeat;
    const fiveMinutes = 5 * 60 * 1000;
    const tenMinutes = 10 * 60 * 1000;

    // Recent heartbeat — trust it
    if (heartbeatAge <= fiveMinutes) {
      return AgentStatus.ACTIVE;
    }
    if (heartbeatAge <= tenMinutes) {
      return AgentStatus.IDLE;
    }

    // No recent heartbeat — check task activity
    if (agentId) {
      const recentTask = this.db.prepare(`
        SELECT MAX(updated_at) as lastUpdate
        FROM agent_tasks
        WHERE agent_id = ? AND status IN ('claimed', 'in_progress', 'review')
      `).get(agentId) as any;

      if (recentTask?.lastUpdate) {
        const taskAge = now - recentTask.lastUpdate;
        if (taskAge <= fiveMinutes) {
          return AgentStatus.ACTIVE;
        }
        if (taskAge <= tenMinutes) {
          return AgentStatus.IDLE;
        }
      }
    }

    // Fallback: if agent still has in-progress tasks, show as idle
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
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as totalTasks,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completedTasks,
        SUM(CASE WHEN error_message IS NOT NULL AND status = 'done' THEN 1 ELSE 0 END) as failedTasks,
        SUM(CASE WHEN status IN ('claimed', 'in_progress', 'review') THEN 1 ELSE 0 END) as inProgressTasks,
        AVG(CASE WHEN actual_duration IS NOT NULL AND status = 'done' THEN actual_duration ELSE NULL END) as averageDuration
      FROM agent_tasks
      WHERE agent_id = ?
    `);

    const result = stmt.get(agentId) as any;

    const completedTasks = result.completedTasks || 0;
    const failedTasks = result.failedTasks || 0;
    const inProgressTasks = result.inProgressTasks || 0;
    const averageDuration = result.averageDuration || 0;

    // Calculate success rate
    let successRate = 100;
    if (completedTasks > 0) {
      const successfulTasks = completedTasks - failedTasks;
      successRate = (successfulTasks / completedTasks) * 100;
    }

    return {
      tasksCompleted: completedTasks,
      tasksInProgress: inProgressTasks,
      averageTaskDuration: Math.round(averageDuration),
      successRate: Math.round(successRate),
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
