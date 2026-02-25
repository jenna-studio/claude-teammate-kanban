/**
 * MCP Server implementation for Agent Track Dashboard
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

import { initDatabase, getDatabase } from './db/database.js';
import { TaskRepository } from './repositories/task-repository.js';
import { AgentRepository } from './repositories/agent-repository.js';
import { BoardRepository } from './repositories/board-repository.js';
import { SessionRepository } from './repositories/session-repository.js';

import * as schemas from './tools/schemas.js';
import type {
  AgentTask,
  Agent,
  Board,
  Session,
  BoardColumn,
} from '@agent-track/shared';
import { AgentStatus, TaskStatus, TaskImportance } from '@agent-track/shared';
import { DEFAULT_COLUMNS } from './db/schema.js';
import { notifyApiServer } from './utils/notifier.js';

export class AgentKanbanMCPServer extends EventEmitter {
  private server: Server;
  private taskRepo: TaskRepository;
  private agentRepo: AgentRepository;
  private boardRepo: BoardRepository;
  private sessionRepo: SessionRepository;

  constructor(dbPath?: string) {
    super();

    // Initialize database
    initDatabase(dbPath ? { path: dbPath } : undefined);

    // Initialize repositories
    this.taskRepo = new TaskRepository();
    this.agentRepo = new AgentRepository();
    this.boardRepo = new BoardRepository();
    this.sessionRepo = new SessionRepository();

    // Create MCP server
    this.server = new Server(
      {
        name: 'agent-kanban-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Board Management
        {
          name: 'create_board',
          description: 'Create a new kanban board for tracking agent activities',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Board name' },
              description: { type: 'string', description: 'Board description' },
              projectPath: { type: 'string', description: 'Project file path' },
              repository: { type: 'string', description: 'Git repository URL' },
            },
            required: ['name'],
          },
        },
        {
          name: 'list_boards',
          description: 'List all kanban boards',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_board',
          description: 'Get detailed board information including tasks and agents',
          inputSchema: {
            type: 'object',
            properties: {
              boardId: { type: 'string', description: 'Board ID' },
            },
            required: ['boardId'],
          },
        },

        // Agent Registration
        {
          name: 'register_agent',
          description: 'Register an AI agent with its capabilities',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Agent name' },
              type: { type: 'string', description: 'Agent type (e.g., code-generator)' },
              capabilities: {
                type: 'array',
                items: { type: 'string' },
                description: 'Agent capabilities',
              },
              maxConcurrentTasks: { type: 'number', description: 'Max concurrent tasks' },
            },
            required: ['name', 'type'],
          },
        },
        {
          name: 'heartbeat',
          description: 'Send heartbeat signal to indicate agent is active',
          inputSchema: {
            type: 'object',
            properties: {
              agentId: { type: 'string', description: 'Agent ID' },
              sessionId: { type: 'string', description: 'Session ID' },
            },
            required: ['agentId'],
          },
        },

        // Session Management
        {
          name: 'start_session',
          description: 'Start an agent work session on a board',
          inputSchema: {
            type: 'object',
            properties: {
              agentId: { type: 'string', description: 'Agent ID' },
              boardId: { type: 'string', description: 'Board ID' },
              metadata: { type: 'object', description: 'Session metadata' },
            },
            required: ['agentId', 'boardId'],
          },
        },
        {
          name: 'end_session',
          description: 'End an agent work session',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: { type: 'string', description: 'Session ID' },
              summary: { type: 'string', description: 'Session summary' },
            },
            required: ['sessionId'],
          },
        },

        // Task Management
        {
          name: 'start_task',
          description: 'Create a new task and claim it',
          inputSchema: {
            type: 'object',
            properties: {
              boardId: { type: 'string' },
              sessionId: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              importance: {
                type: 'string',
                enum: ['critical', 'high', 'medium', 'low'],
                default: 'medium',
              },
              estimatedDuration: { type: 'number', description: 'Estimated duration in seconds' },
              tags: { type: 'array', items: { type: 'string' } },
              parentTaskId: { type: 'string' },
            },
            required: ['boardId', 'sessionId', 'title'],
          },
        },
        {
          name: 'update_task_status',
          description: 'Update task status (move between kanban columns)',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string' },
              status: {
                type: 'string',
                enum: ['todo', 'claimed', 'in_progress', 'review', 'done'],
              },
              currentAction: { type: 'string' },
            },
            required: ['taskId', 'status'],
          },
        },
        {
          name: 'update_task_progress',
          description: 'Update task progress and current action',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string' },
              progress: { type: 'number', minimum: 0, maximum: 100 },
              currentAction: { type: 'string' },
              files: { type: 'array', items: { type: 'string' } },
              linesChanged: {
                type: 'object',
                properties: {
                  added: { type: 'number' },
                  removed: { type: 'number' },
                },
              },
              tokensUsed: { type: 'number' },
              codeChanges: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    filePath: { type: 'string' },
                    changeType: { type: 'string', enum: ['added', 'modified', 'deleted', 'renamed'] },
                    oldPath: { type: 'string' },
                    diff: { type: 'string' },
                    language: { type: 'string' },
                    linesAdded: { type: 'number' },
                    linesDeleted: { type: 'number' },
                  },
                  required: ['filePath', 'changeType', 'diff'],
                },
              },
            },
            required: ['taskId'],
          },
        },
        {
          name: 'complete_task',
          description: 'Mark a task as successfully completed',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string' },
              summary: { type: 'string' },
              tokensUsed: { type: 'number' },
            },
            required: ['taskId'],
          },
        },
        {
          name: 'fail_task',
          description: 'Mark a task as failed with error details',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string' },
              errorMessage: { type: 'string' },
              willRetry: { type: 'boolean', default: false },
            },
            required: ['taskId', 'errorMessage'],
          },
        },

        // Task Collaboration
        {
          name: 'add_comment',
          description: 'Add a comment to a task for inter-agent communication',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string' },
              author: { type: 'string' },
              content: { type: 'string' },
            },
            required: ['taskId', 'author', 'content'],
          },
        },
        {
          name: 'set_task_blocker',
          description: 'Mark a task as blocked by other tasks',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string' },
              blockedBy: { type: 'array', items: { type: 'string' } },
            },
            required: ['taskId', 'blockedBy'],
          },
        },

        // Query Tools
        {
          name: 'get_my_tasks',
          description: 'Get all tasks assigned to this agent',
          inputSchema: {
            type: 'object',
            properties: {
              agentId: { type: 'string' },
              boardId: { type: 'string' },
              status: { type: 'string', enum: ['active', 'completed', 'all'], default: 'active' },
            },
            required: ['agentId'],
          },
        },
        {
          name: 'get_available_tasks',
          description: 'Get unclaimed tasks available for claiming',
          inputSchema: {
            type: 'object',
            properties: {
              boardId: { type: 'string' },
              importance: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            },
            required: ['boardId'],
          },
        },
        {
          name: 'get_blocked_tasks',
          description: 'Get all tasks that are blocked by dependencies',
          inputSchema: {
            type: 'object',
            properties: {
              boardId: { type: 'string' },
            },
            required: ['boardId'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const result = await this.handleToolCall(name, args || {});

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: errorMessage }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
      // Board Management
      case 'create_board':
        return this.createBoard(schemas.CreateBoardSchema.parse(args));
      case 'list_boards':
        return this.listBoards();
      case 'get_board':
        return this.getBoard(schemas.GetBoardSchema.parse(args));

      // Agent Registration
      case 'register_agent':
        return this.registerAgent(schemas.RegisterAgentSchema.parse(args));
      case 'heartbeat':
        return this.heartbeat(schemas.HeartbeatSchema.parse(args));

      // Session Management
      case 'start_session':
        return this.startSession(schemas.StartSessionSchema.parse(args));
      case 'end_session':
        return this.endSession(schemas.EndSessionSchema.parse(args));

      // Task Management
      case 'start_task':
        return this.startTask(schemas.StartTaskSchema.parse(args));
      case 'update_task_status':
        return this.updateTaskStatus(schemas.UpdateTaskStatusSchema.parse(args));
      case 'update_task_progress':
        return this.updateTaskProgress(schemas.UpdateTaskProgressSchema.parse(args));
      case 'complete_task':
        return this.completeTask(schemas.CompleteTaskSchema.parse(args));
      case 'fail_task':
        return this.failTask(schemas.FailTaskSchema.parse(args));

      // Task Collaboration
      case 'add_comment':
        return this.addComment(schemas.AddCommentSchema.parse(args));
      case 'set_task_blocker':
        return this.setTaskBlocker(schemas.SetTaskBlockerSchema.parse(args));

      // Query Tools
      case 'get_my_tasks':
        return this.getMyTasks(schemas.GetMyTasksSchema.parse(args));
      case 'get_available_tasks':
        return this.getAvailableTasks(schemas.GetAvailableTasksSchema.parse(args));
      case 'get_blocked_tasks':
        return this.getBlockedTasks(schemas.GetBlockedTasksSchema.parse(args));

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  // Board Management Methods
  private createBoard(args: any): { boardId: string; columns: BoardColumn[] } {
    const boardId = randomUUID();
    const now = new Date();

    const board: Board = {
      id: boardId,
      name: args.name,
      description: args.description,
      projectPath: args.projectPath,
      repository: args.repository,
      settings: {
        autoArchiveCompleted: false,
        archiveAfterHours: 24,
        enableNotifications: true,
        criticalTaskAlerts: true,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.boardRepo.create(board);

    // Create default columns
    for (const column of DEFAULT_COLUMNS) {
      this.boardRepo.createColumn(boardId, column);
    }

    this.emit('board:created', board);
    notifyApiServer('board_created', boardId, { board });

    return { boardId, columns: DEFAULT_COLUMNS };
  }

  private listBoards(): { boards: Board[] } {
    const boards = this.boardRepo.getAll();
    return { boards };
  }

  private getBoard(args: any): any {
    const board = this.boardRepo.get(args.boardId);
    if (!board) {
      throw new Error(`Board not found: ${args.boardId}`);
    }

    const columns = this.boardRepo.getColumns(args.boardId);
    const tasks = this.taskRepo.getByBoard(args.boardId);
    const sessions = this.sessionRepo.getActiveSessions(args.boardId);

    return { board, columns, tasks, activeSessionCount: sessions.length };
  }

  // Agent Registration Methods
  private registerAgent(args: any): { agentId: string } {
    const agentId = randomUUID();

    const agent: Agent = {
      id: agentId,
      name: args.name,
      type: args.type,
      status: AgentStatus.ACTIVE,
      capabilities: args.capabilities,
      maxConcurrentTasks: args.maxConcurrentTasks || 1,
      tasksCompleted: 0,
      tasksInProgress: 0,
      averageTaskDuration: 0,
      successRate: 100,
      lastHeartbeat: new Date(),
    };

    this.agentRepo.upsert(agent);
    this.emit('agent:registered', agent);

    return { agentId };
  }

  private heartbeat(args: any): { status: string } {
    this.agentRepo.updateHeartbeat(args.agentId);

    if (args.sessionId) {
      this.sessionRepo.updateHeartbeat(args.sessionId);
    }

    return { status: 'ok' };
  }

  // Session Management Methods
  private startSession(args: any): { sessionId: string } {
    const sessionId = randomUUID();

    const session: Session = {
      id: sessionId,
      agentId: args.agentId,
      boardId: args.boardId,
      startedAt: new Date(),
      lastHeartbeat: new Date(),
      isActive: true,
      tasksCreated: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      totalTokensUsed: 0,
      metadata: args.metadata,
    };

    this.sessionRepo.create(session);
    this.agentRepo.updateStatus(args.agentId, 'active');

    this.emit('session:started', session);

    return { sessionId };
  }

  private endSession(args: any): { status: string } {
    this.sessionRepo.endSession(args.sessionId);
    this.emit('session:ended', { sessionId: args.sessionId });

    return { status: 'ended' };
  }

  // Task Management Methods
  private async startTask(args: any): Promise<{ taskId: string; status: string }> {
    const taskId = randomUUID();

    // Get session to retrieve agent info
    const session = this.sessionRepo.get(args.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    const agent = this.agentRepo.get(session.agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${session.agentId}`);
    }

    const now = new Date();

    const task: AgentTask = {
      id: taskId,
      boardId: args.boardId,
      title: args.title,
      description: args.description,
      importance: args.importance || TaskImportance.MEDIUM,
      status: TaskStatus.CLAIMED,
      agentId: agent.id,
      agentName: agent.name,
      agentType: agent.type,
      sessionId: args.sessionId,
      createdAt: now,
      claimedAt: now,
      updatedAt: now,
      estimatedDuration: args.estimatedDuration,
      tags: args.tags,
      parentTaskId: args.parentTaskId,
      blockedBy: [],
    };

    this.taskRepo.create(task);
    this.sessionRepo.incrementTaskCreated(args.sessionId);

    this.emit('task:created', task);
    notifyApiServer('task_created', args.boardId, { task });

    return { taskId, status: 'claimed' };
  }

  private updateTaskStatus(args: any): { status: string } {
    const task = this.taskRepo.get(args.taskId);
    if (!task) {
      throw new Error(`Task not found: ${args.taskId}`);
    }

    const updates: Partial<AgentTask> = {
      status: args.status,
      currentAction: args.currentAction,
      updatedAt: new Date(),
    };

    if (args.status === 'in_progress' && !task.startedAt) {
      updates.startedAt = new Date();
    }

    this.taskRepo.update(args.taskId, updates);

    const updatedTask = this.taskRepo.get(args.taskId);
    this.emit('task:updated', updatedTask);
    notifyApiServer('task_updated', task.boardId, { task: updatedTask });

    return { status: args.status };
  }

  private updateTaskProgress(args: any): { progress: number } {
    const task = this.taskRepo.get(args.taskId);
    if (!task) {
      throw new Error(`Task not found: ${args.taskId}`);
    }

    const updates: Partial<AgentTask> = {
      progress: args.progress,
      currentAction: args.currentAction,
      files: args.files,
      linesChanged: args.linesChanged,
      tokensUsed: args.tokensUsed,
      codeChanges: args.codeChanges,
      updatedAt: new Date(),
    };

    // Calculate diff summary if code changes provided
    if (args.codeChanges && args.codeChanges.length > 0) {
      let totalInsertions = 0;
      let totalDeletions = 0;

      for (const change of args.codeChanges) {
        totalInsertions += change.linesAdded || 0;
        totalDeletions += change.linesDeleted || 0;
      }

      updates.diffSummary = {
        filesChanged: args.codeChanges.length,
        insertions: totalInsertions,
        deletions: totalDeletions,
      };
    }

    this.taskRepo.update(args.taskId, updates);

    const updatedTask = this.taskRepo.get(args.taskId);
    this.emit('task:updated', updatedTask);
    notifyApiServer('task_updated', task.boardId, { task: updatedTask });

    return { progress: args.progress || task.progress || 0 };
  }

  private completeTask(args: any): { status: string; actualDuration?: number } {
    const task = this.taskRepo.get(args.taskId);
    if (!task) {
      throw new Error(`Task not found: ${args.taskId}`);
    }

    const completedAt = new Date();
    const actualDuration = task.startedAt
      ? Math.floor((completedAt.getTime() - task.startedAt.getTime()) / 1000)
      : undefined;

    this.taskRepo.update(args.taskId, {
      status: TaskStatus.DONE,
      progress: 100,
      completedAt,
      actualDuration,
      tokensUsed: args.tokensUsed || task.tokensUsed,
      updatedAt: new Date(),
    });

    this.sessionRepo.incrementTaskCompleted(task.sessionId);
    this.agentRepo.incrementTasksCompleted(task.agentId);

    if (args.tokensUsed) {
      this.sessionRepo.addTokensUsed(task.sessionId, args.tokensUsed);
    }

    const updatedTask = this.taskRepo.get(args.taskId);
    this.emit('task:completed', updatedTask);
    notifyApiServer('task_updated', task.boardId, { task: updatedTask });

    return { status: 'done', actualDuration };
  }

  private failTask(args: any): { status: string } {
    const task = this.taskRepo.get(args.taskId);
    if (!task) {
      throw new Error(`Task not found: ${args.taskId}`);
    }

    this.taskRepo.update(args.taskId, {
      errorMessage: args.errorMessage,
      retryCount: (task.retryCount || 0) + 1,
      updatedAt: new Date(),
    });

    if (!args.willRetry) {
      this.sessionRepo.incrementTaskFailed(task.sessionId);
    }

    const updatedTask = this.taskRepo.get(args.taskId);
    this.emit('task:failed', updatedTask);
    notifyApiServer('task_updated', task.boardId, { task: updatedTask });

    return { status: 'failed' };
  }

  // Task Collaboration Methods
  private addComment(args: any): { commentId: string } {
    const commentId = randomUUID();
    const now = Date.now();
    const db = getDatabase();

    db.prepare(`
      INSERT INTO comments (id, task_id, author, author_type, content, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(commentId, args.taskId, args.author, 'agent', args.content, now);

    this.emit('comment:added', { commentId, ...args });
    return { commentId };
  }

  private setTaskBlocker(args: any): { status: string } {
    this.taskRepo.update(args.taskId, {
      blockedBy: args.blockedBy,
      updatedAt: new Date(),
    });

    const updatedTask = this.taskRepo.get(args.taskId);
    this.emit('task:updated', updatedTask);

    return { status: 'updated' };
  }

  // Query Methods
  private getMyTasks(args: any): { tasks: AgentTask[] } {
    const tasks = this.taskRepo.getByAgent(args.agentId, args.status);
    return { tasks };
  }

  private getAvailableTasks(args: any): { tasks: AgentTask[] } {
    const allTasks = this.taskRepo.getByBoard(args.boardId);
    const availableTasks = allTasks.filter(t => t.status === 'todo');

    if (args.importance) {
      return { tasks: availableTasks.filter(t => t.importance === args.importance) };
    }

    return { tasks: availableTasks };
  }

  private getBlockedTasks(args: any): { tasks: AgentTask[] } {
    const tasks = this.taskRepo.getBlockedTasks(args.boardId);
    return { tasks };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Agent Kanban MCP Server running on stdio');
  }
}
