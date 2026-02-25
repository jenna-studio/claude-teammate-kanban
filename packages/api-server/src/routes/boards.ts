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

export default router;
