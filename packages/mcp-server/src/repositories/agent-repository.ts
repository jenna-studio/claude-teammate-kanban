/**
 * Agent Repository
 *
 * Handles all database operations related to agents including
 * creation, retrieval, updates, and status management.
 */

import { getDatabase } from '../db/database.js';
import type { Agent } from '@agent-track/shared';
import { DatabaseError, NotFoundError } from '../types/index.js';
import { validateNonEmptyString, validateUUID, safeJsonParse, safeJsonStringify } from '../utils/validation.js';

/**
 * Database row structure for agents table
 */
interface AgentRow {
  id: string;
  name: string;
  type: string;
  status: string;
  current_session_id: string | null;
  capabilities: string | null;
  max_concurrent_tasks: number;
  tasks_completed: number;
  tasks_in_progress: number;
  average_task_duration: number;
  success_rate: number;
  last_heartbeat: number;
  metadata: string | null;
}

/**
 * Repository for managing agent entities in the database
 */
export class AgentRepository {
  /**
   * Creates or updates an agent (upsert operation).
   * If an agent with the given ID exists, it will be updated.
   * Otherwise, a new agent will be created.
   *
   * @param agent - The agent to create or update
   * @throws {ValidationError} If agent data is invalid
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * const agent = {
   *   id: '123',
   *   name: 'Agent Smith',
   *   type: 'coding',
   *   status: 'active',
   *   // ... other fields
   * };
   * repository.upsert(agent);
   * ```
   */
  upsert(agent: Agent): void {
    // Validate required fields
    validateUUID(agent.id, 'agent.id');
    validateNonEmptyString(agent.name, 'agent.name');
    validateNonEmptyString(agent.type, 'agent.type');

    try {
      const db = getDatabase();

      db.prepare(`
        INSERT INTO agents (
          id, name, type, status, current_session_id, capabilities,
          max_concurrent_tasks, tasks_completed, tasks_in_progress,
          average_task_duration, success_rate, last_heartbeat, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          type = excluded.type,
          status = excluded.status,
          current_session_id = excluded.current_session_id,
          capabilities = excluded.capabilities,
          max_concurrent_tasks = excluded.max_concurrent_tasks,
          tasks_completed = excluded.tasks_completed,
          tasks_in_progress = excluded.tasks_in_progress,
          average_task_duration = excluded.average_task_duration,
          success_rate = excluded.success_rate,
          last_heartbeat = excluded.last_heartbeat,
          metadata = excluded.metadata
      `).run(
        agent.id,
        agent.name,
        agent.type,
        agent.status,
        agent.currentSessionId || null,
        safeJsonStringify(agent.capabilities),
        agent.maxConcurrentTasks,
        agent.tasksCompleted,
        agent.tasksInProgress,
        agent.averageTaskDuration,
        agent.successRate,
        agent.lastHeartbeat.getTime(),
        safeJsonStringify(agent.metadata)
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to upsert agent ${agent.id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Retrieves an agent by their unique identifier.
   *
   * @param id - The unique identifier of the agent
   * @returns The agent object or null if not found
   * @throws {ValidationError} If the ID is invalid
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * const agent = repository.get('agent-123');
   * if (agent) {
   *   console.log(`Found agent: ${agent.name}`);
   * }
   * ```
   */
  get(id: string): Agent | null {
    validateUUID(id, 'id');

    try {
      const db = getDatabase();
      const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as AgentRow | undefined;

      if (!row) return null;

      return this.rowToAgent(row);
    } catch (error) {
      throw new DatabaseError(
        `Failed to get agent ${id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Retrieves all agents from the database, ordered by name.
   *
   * @returns Array of all agents
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * const agents = repository.getAll();
   * console.log(`Total agents: ${agents.length}`);
   * ```
   */
  getAll(): Agent[] {
    try {
      const db = getDatabase();
      const rows = db.prepare('SELECT * FROM agents ORDER BY name ASC').all() as AgentRow[];

      return rows.map((row) => this.rowToAgent(row));
    } catch (error) {
      throw new DatabaseError(
        'Failed to get all agents',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Updates the agent's heartbeat timestamp and sets status to active.
   * This should be called periodically to indicate the agent is still running.
   *
   * @param id - The unique identifier of the agent
   * @throws {ValidationError} If the ID is invalid
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * // Call this every 30 seconds to keep agent active
   * repository.updateHeartbeat('agent-123');
   * ```
   */
  updateHeartbeat(id: string): void {
    validateUUID(id, 'id');

    try {
      const db = getDatabase();
      const result = db.prepare(`
        UPDATE agents SET last_heartbeat = ?, status = ? WHERE id = ?
      `).run(Date.now(), 'active', id);

      if (result.changes === 0) {
        throw new NotFoundError(`Agent not found: ${id}`, id);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(
        `Failed to update heartbeat for agent ${id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Updates the agent's status.
   *
   * @param id - The unique identifier of the agent
   * @param status - The new status for the agent
   * @throws {ValidationError} If the ID or status is invalid
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * repository.updateStatus('agent-123', 'idle');
   * ```
   */
  updateStatus(id: string, status: 'active' | 'idle' | 'offline'): void {
    validateUUID(id, 'id');

    try {
      const db = getDatabase();
      const result = db.prepare('UPDATE agents SET status = ? WHERE id = ?').run(status, id);

      if (result.changes === 0) {
        throw new NotFoundError(`Agent not found: ${id}`, id);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(
        `Failed to update status for agent ${id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Increments the number of tasks completed by an agent.
   *
   * @param id - The unique identifier of the agent
   * @throws {ValidationError} If the ID is invalid
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * repository.incrementTasksCompleted('agent-123');
   * ```
   */
  incrementTasksCompleted(id: string): void {
    validateUUID(id, 'id');

    try {
      const db = getDatabase();
      const result = db.prepare(`
        UPDATE agents SET tasks_completed = tasks_completed + 1 WHERE id = ?
      `).run(id);

      if (result.changes === 0) {
        throw new NotFoundError(`Agent not found: ${id}`, id);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(
        `Failed to increment tasks completed for agent ${id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Updates the number of tasks currently in progress for an agent.
   *
   * @param id - The unique identifier of the agent
   * @param inProgress - The new count of tasks in progress
   * @throws {ValidationError} If the ID is invalid
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```typescript
   * repository.updateTaskCounters('agent-123', 2);
   * ```
   */
  updateTaskCounters(id: string, inProgress: number): void {
    validateUUID(id, 'id');

    try {
      const db = getDatabase();
      const result = db.prepare(`
        UPDATE agents SET tasks_in_progress = ? WHERE id = ?
      `).run(inProgress, id);

      if (result.changes === 0) {
        throw new NotFoundError(`Agent not found: ${id}`, id);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(
        `Failed to update task counters for agent ${id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Converts a database row to an Agent object.
   *
   * @param row - The database row to convert
   * @returns The Agent object
   * @private
   */
  private rowToAgent(row: AgentRow): Agent {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status as Agent['status'],
      currentSessionId: row.current_session_id ?? undefined,
      capabilities: safeJsonParse<string[]>(row.capabilities) ?? [],
      maxConcurrentTasks: row.max_concurrent_tasks,
      tasksCompleted: row.tasks_completed,
      tasksInProgress: row.tasks_in_progress,
      averageTaskDuration: row.average_task_duration,
      successRate: row.success_rate,
      lastHeartbeat: new Date(row.last_heartbeat),
      metadata: safeJsonParse<Record<string, any>>(row.metadata) || undefined,
    };
  }
}
