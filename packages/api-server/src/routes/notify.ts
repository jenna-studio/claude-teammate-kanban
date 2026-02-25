/**
 * Notification route - receives events from MCP server and broadcasts via WebSocket
 */

import { Router, Request, Response } from 'express';
import type { RealtimeServer } from '../websocket.js';

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

  if (boardId) {
    wsServer.broadcast(boardId, message);
  } else {
    wsServer.broadcastAll(message);
  }

  res.json({ success: true, broadcasted: true });
});

export default router;
