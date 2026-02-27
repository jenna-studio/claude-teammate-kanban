/**
 * Board routes
 */

import { Router, type Router as RouterType } from 'express';
import { BoardRepository } from '../repositories/index.js';
import { getDatabase } from '../database.js';
import { asyncHandler, HttpError, validate, schemas } from '../middleware/index.js';

const router: RouterType = Router();

/**
 * GET /api/boards
 * Get all boards
 */
router.get('/', asyncHandler(async (_req, res) => {
  const db = getDatabase();
  const boardRepo = new BoardRepository(db);
  const boards = boardRepo.getAll();

  res.json({
    success: true,
    data: boards,
  });
}));

/**
 * GET /api/boards/:id
 * Get board with details (columns, tasks, agents, statistics)
 */
router.get('/:id', validate(schemas.boardId, 'params'), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const boardRepo = new BoardRepository(db);
  const boardData = boardRepo.getBoardWithDetails(req.params.id);

  if (!boardData) {
    throw new HttpError(404, 'Board not found');
  }

  res.json({
    success: true,
    data: boardData,
  });
}));

/**
 * GET /api/boards/:id/agents
 * Get agents working on this board (have tasks or sessions on this board)
 */
router.get('/:id/agents', validate(schemas.boardId, 'params'), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const boardRepo = new BoardRepository(db);

  const board = boardRepo.getById(req.params.id);
  if (!board) {
    throw new HttpError(404, 'Board not found');
  }

  const agents = boardRepo.getBoardAgents(req.params.id);

  res.json({
    success: true,
    data: agents,
  });
}));

/**
 * GET /api/boards/:id/statistics
 * Get board statistics
 */
router.get('/:id/statistics', validate(schemas.boardId, 'params'), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const boardRepo = new BoardRepository(db);
  const statistics = boardRepo.getBoardStatistics(req.params.id);

  res.json({
    success: true,
    data: statistics,
  });
}));

/**
 * POST /api/boards
 * Create a new board
 */
router.post('/', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const boardRepo = new BoardRepository(db);

  const { name, description, projectPath, repository, settings } = req.body;

  if (!name || !projectPath) {
    throw new HttpError(400, 'name and projectPath are required');
  }

  const board = boardRepo.create({
    name,
    description,
    projectPath,
    repository,
    settings,
  });

  res.status(201).json({
    success: true,
    data: board,
  });
}));

/**
 * PATCH /api/boards/:id
 * Update a board
 */
router.patch('/:id', validate(schemas.boardId, 'params'), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const boardRepo = new BoardRepository(db);

  const { name, description, projectPath, repository, settings } = req.body;

  const board = boardRepo.update(req.params.id, {
    name,
    description,
    projectPath,
    repository,
    settings,
  });

  if (!board) {
    throw new HttpError(404, 'Board not found');
  }

  res.json({
    success: true,
    data: board,
  });
}));

/**
 * DELETE /api/boards/:id
 * Delete a board
 */
router.delete('/:id', validate(schemas.boardId, 'params'), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const boardRepo = new BoardRepository(db);

  const deleted = boardRepo.delete(req.params.id);

  if (!deleted) {
    throw new HttpError(404, 'Board not found');
  }

  res.json({
    success: true,
    message: 'Board deleted successfully',
  });
}));

export default router;
