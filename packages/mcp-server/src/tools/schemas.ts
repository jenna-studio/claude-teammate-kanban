/**
 * Zod schemas for MCP tool inputs
 */

import { z } from 'zod';

// Board Management
export const CreateBoardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  projectPath: z.string().optional(),
  repository: z.string().optional(),
});

export const GetBoardSchema = z.object({
  boardId: z.string(),
});

// Agent Registration
export const RegisterAgentSchema = z.object({
  name: z.string(),
  type: z.string(),
  capabilities: z.array(z.string()).optional(),
  maxConcurrentTasks: z.number().default(1),
});

export const HeartbeatSchema = z.object({
  agentId: z.string(),
  sessionId: z.string().optional(),
});

// Session Management
export const StartSessionSchema = z.object({
  agentId: z.string(),
  boardId: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export const EndSessionSchema = z.object({
  sessionId: z.string(),
  summary: z.string().optional(),
});

// Task Management
export const StartTaskSchema = z.object({
  boardId: z.string(),
  sessionId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  importance: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  estimatedDuration: z.number().optional(),
  tags: z.array(z.string()).optional(),
  parentTaskId: z.string().optional(),
});

export const UpdateTaskStatusSchema = z.object({
  taskId: z.string(),
  status: z.enum(['todo', 'claimed', 'in_progress', 'review', 'done']),
  currentAction: z.string().optional(),
});

export const UpdateTaskProgressSchema = z.object({
  taskId: z.string(),
  progress: z.number().min(0).max(100).optional(),
  currentAction: z.string().optional(),
  files: z.array(z.string()).optional(),
  linesChanged: z.object({
    added: z.number(),
    removed: z.number(),
  }).optional(),
  tokensUsed: z.number().optional(),
  codeChanges: z.array(z.object({
    filePath: z.string(),
    changeType: z.enum(['added', 'modified', 'deleted', 'renamed']),
    oldPath: z.string().optional(),
    diff: z.string(),
    language: z.string().optional(),
    linesAdded: z.number().optional(),
    linesDeleted: z.number().optional(),
  })).optional(),
});

export const CompleteTaskSchema = z.object({
  taskId: z.string(),
  summary: z.string().optional(),
  tokensUsed: z.number().optional(),
});

export const FailTaskSchema = z.object({
  taskId: z.string(),
  errorMessage: z.string(),
  willRetry: z.boolean().default(false),
});

export const PauseTaskSchema = z.object({
  taskId: z.string(),
  reason: z.string(),
});

export const ResumeTaskSchema = z.object({
  taskId: z.string(),
});

// Task Collaboration
export const AddCommentSchema = z.object({
  taskId: z.string(),
  author: z.string(),
  content: z.string(),
});

export const SetTaskBlockerSchema = z.object({
  taskId: z.string(),
  blockedBy: z.array(z.string()),
});

// Query Tools
export const GetMyTasksSchema = z.object({
  agentId: z.string(),
  boardId: z.string().optional(),
  status: z.enum(['active', 'completed', 'all']).default('active'),
});

export const GetAvailableTasksSchema = z.object({
  boardId: z.string(),
  importance: z.enum(['critical', 'high', 'medium', 'low']).optional(),
});

export const GetBlockedTasksSchema = z.object({
  boardId: z.string(),
});
