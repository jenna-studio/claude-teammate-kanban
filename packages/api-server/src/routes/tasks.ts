/**
 * Task routes
 */

import { Router, type Router as RouterType } from 'express';
import { TaskRepository } from '../repositories/index.js';
import { getDatabase } from '../database.js';
import { asyncHandler, HttpError, validate, schemas } from '../middleware/index.js';

const router: RouterType = Router();

/**
 * GET /api/tasks
 * Get all tasks with optional filters
 */
router.get('/', validate(schemas.taskFilters, 'query'), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const taskRepo = new TaskRepository(db);

  const filters = {
    boardId: req.query.boardId as string | undefined,
    agentId: req.query.agentId as string | undefined,
    status: req.query.status as string | undefined,
    importance: req.query.importance as string | undefined,
  };

  const tasks = taskRepo.getAll(filters);

  res.json({
    success: true,
    data: tasks,
  });
}));

/**
 * GET /api/tasks/:id
 * Get task by ID with code changes and comments
 */
router.get('/:id', validate(schemas.taskId, 'params'), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const taskRepo = new TaskRepository(db);
  const task = taskRepo.getById(req.params.id);

  if (!task) {
    throw new HttpError(404, 'Task not found');
  }

  res.json({
    success: true,
    data: task,
  });
}));

/**
 * GET /api/tasks/:id/comments
 * Get comments for a task
 */
router.get('/:id/comments', validate(schemas.taskId, 'params'), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const taskRepo = new TaskRepository(db);
  const comments = taskRepo.getComments(req.params.id);

  res.json({
    success: true,
    data: comments,
  });
}));

/**
 * POST /api/tasks/:id/comments
 * Add a comment to a task
 */
router.post('/:id/comments', validate(schemas.addComment, 'body'), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const taskRepo = new TaskRepository(db);

  // Verify task exists
  const task = taskRepo.getById(req.params.id);
  if (!task) {
    throw new HttpError(404, 'Task not found');
  }

  const comment = taskRepo.addComment({
    taskId: req.params.id,
    author: req.body.author,
    authorType: req.body.authorType || 'human',
    content: req.body.content,
    parentCommentId: req.body.parentCommentId,
  });

  res.status(201).json({
    success: true,
    data: comment,
  });
}));

/**
 * GET /api/tasks/:id/code-changes
 * Get code changes for a task
 */
router.get('/:id/code-changes', validate(schemas.taskId, 'params'), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const taskRepo = new TaskRepository(db);
  const codeChanges = taskRepo.getCodeChanges(req.params.id);

  res.json({
    success: true,
    data: codeChanges,
  });
}));

/**
 * POST /api/tasks
 * Create a new task
 */
router.post('/', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const taskRepo = new TaskRepository(db);

  const {
    boardId,
    title,
    description,
    importance,
    status,
    agentId,
    agentName,
    agentType,
    sessionId,
    progress,
    currentAction,
    files,
    estimatedDuration,
    parentTaskId,
    tags,
  } = req.body;

  if (!boardId || !title) {
    throw new HttpError(400, 'boardId and title are required');
  }

  const task = taskRepo.create({
    boardId,
    title,
    description,
    importance,
    status,
    agentId,
    agentName,
    agentType,
    sessionId,
    progress,
    currentAction,
    files,
    estimatedDuration,
    parentTaskId,
    tags,
  });

  res.status(201).json({
    success: true,
    data: task,
  });
}));

/**
 * PATCH /api/tasks/:id
 * Update a task
 */
router.patch('/:id', validate(schemas.taskId, 'params'), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const taskRepo = new TaskRepository(db);

  const {
    title,
    description,
    importance,
    status,
    progress,
    currentAction,
    files,
    linesChanged,
    tokensUsed,
    estimatedDuration,
    actualDuration,
    blockedBy,
    tags,
    errorMessage,
    commitHash,
  } = req.body;

  const task = taskRepo.update(req.params.id, {
    title,
    description,
    importance,
    status,
    progress,
    currentAction,
    files,
    linesChanged,
    tokensUsed,
    estimatedDuration,
    actualDuration,
    blockedBy,
    tags,
    errorMessage,
    commitHash,
  });

  if (!task) {
    throw new HttpError(404, 'Task not found');
  }

  res.json({
    success: true,
    data: task,
  });
}));

/**
 * DELETE /api/tasks/:id
 * Delete a task
 */
router.delete('/:id', validate(schemas.taskId, 'params'), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const taskRepo = new TaskRepository(db);

  const deleted = taskRepo.delete(req.params.id);

  if (!deleted) {
    throw new HttpError(404, 'Task not found');
  }

  res.json({
    success: true,
    message: 'Task deleted successfully',
  });
}));

export default router;
