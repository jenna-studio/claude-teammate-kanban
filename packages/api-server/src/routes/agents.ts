/**
 * Agent routes
 */

import { Router, type Router as RouterType } from 'express';
import { AgentRepository } from '../repositories/index.js';
import { getDatabase } from '../database.js';
import { asyncHandler, HttpError, validate, schemas } from '../middleware/index.js';

const router: RouterType = Router();

/**
 * GET /api/agents
 * Get all agents
 */
router.get('/', asyncHandler(async (_req, res) => {
  const db = getDatabase();
  const agentRepo = new AgentRepository(db);
  const agents = agentRepo.getAll();

  res.json({
    success: true,
    data: agents,
  });
}));

/**
 * GET /api/agents/active
 * Get active agents (with recent heartbeat)
 */
router.get('/active', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const agentRepo = new AgentRepository(db);
  const maxAgeMinutes = parseInt(req.query.maxAge as string) || 5;
  const agents = agentRepo.getActive(maxAgeMinutes);

  res.json({
    success: true,
    data: agents,
  });
}));

/**
 * POST /api/agents
 * Register or update an agent
 */
router.post('/', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const agentRepo = new AgentRepository(db);
  const agent = agentRepo.upsert(req.body);

  res.status(201).json({
    success: true,
    data: agent,
  });
}));

/**
 * PATCH /api/agents/:id
 * Update agent fields
 */
router.patch('/:id', validate(schemas.agentId, 'params'), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const agentRepo = new AgentRepository(db);

  const agent = agentRepo.getById(req.params.id);
  if (!agent) {
    throw new HttpError(404, 'Agent not found');
  }

  agentRepo.update(req.params.id, req.body);
  const updated = agentRepo.getById(req.params.id);

  res.json({
    success: true,
    data: updated,
  });
}));

/**
 * GET /api/agents/:id
 * Get agent by ID
 */
router.get('/:id', validate(schemas.agentId, 'params'), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const agentRepo = new AgentRepository(db);
  const agent = agentRepo.getById(req.params.id);

  if (!agent) {
    throw new HttpError(404, 'Agent not found');
  }

  res.json({
    success: true,
    data: agent,
  });
}));

/**
 * GET /api/agents/:id/tasks
 * Get tasks for an agent
 */
router.get('/:id/tasks', validate(schemas.agentId, 'params'), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const agentRepo = new AgentRepository(db);

  // Verify agent exists
  const agent = agentRepo.getById(req.params.id);
  if (!agent) {
    throw new HttpError(404, 'Agent not found');
  }

  const status = req.query.status as string | undefined;
  const tasks = agentRepo.getAgentTasks(req.params.id, status);

  res.json({
    success: true,
    data: tasks,
  });
}));

/**
 * GET /api/agents/:id/statistics
 * Get agent statistics
 */
router.get('/:id/statistics', validate(schemas.agentId, 'params'), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const agentRepo = new AgentRepository(db);

  // Verify agent exists
  const agent = agentRepo.getById(req.params.id);
  if (!agent) {
    throw new HttpError(404, 'Agent not found');
  }

  const statistics = agentRepo.getStatistics(req.params.id);

  res.json({
    success: true,
    data: statistics,
  });
}));

export default router;
