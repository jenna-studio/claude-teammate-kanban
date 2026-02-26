/**
 * Notification route - receives events from MCP server and broadcasts via WebSocket
 */

import { Router, Request, Response } from 'express';
import type { RealtimeServer } from '../websocket.js';
import { getDatabase } from '../database.js';
import { AgentRepository } from '../repositories/index.js';

let wsServer: RealtimeServer | null = null;

/**
 * Set the WebSocket server reference for broadcasting
 */
export function setWebSocketServer(server: RealtimeServer): void {
  wsServer = server;
}

const router = Router();

/**
 * POST /api/notify
 * Receives event notifications from the MCP server and broadcasts them
 * to WebSocket clients subscribed to the relevant board.
 */
router.post('/', (req: Request, res: Response) => {
  const { event, boardId, data } = req.body;

  if (!event) {
    res.status(400).json({ success: false, error: 'Missing event type' });
    return;
  }

  if (!wsServer) {
    res.json({ success: true, broadcasted: false, reason: 'No WebSocket server' });
    return;
  }

  // Map MCP events to WebSocket message types
  const message = { type: event, ...data };

  // board_created events must be broadcast to ALL clients since no client
  // is subscribed to the new board yet
  if (event === 'board_created') {
    wsServer.broadcastAll(message);
  } else if (boardId) {
    wsServer.broadcast(boardId, message);
  } else {
    wsServer.broadcastAll(message);
  }

  // If a task was updated/completed/failed, also broadcast updated agent statistics
  if ((event === 'task_updated' || event === 'task_created') && data?.task?.agentId) {
    try {
      const db = getDatabase();
      const agentRepo = new AgentRepository(db);
      const updatedAgent = agentRepo.getById(data.task.agentId);

      if (updatedAgent) {
        const agentMessage = { type: 'agent_status_changed' as const, agent: updatedAgent };
        if (boardId) {
          wsServer.broadcast(boardId, agentMessage);
        } else {
          wsServer.broadcastAll(agentMessage);
        }
      }
    } catch (error) {
      console.error('[Notify] Failed to broadcast agent update:', error);
    }
  }

  res.json({ success: true, broadcasted: true });
});

export default router;
