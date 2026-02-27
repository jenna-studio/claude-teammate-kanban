/**
 * WebSocket server for real-time updates
 * Manages client connections and broadcasts events to subscribed clients
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { ServerMessage, ClientMessage } from '@agent-track/shared';

/**
 * Extended WebSocket with client metadata
 */
interface ExtendedWebSocket extends WebSocket {
  clientId?: string;
  subscribedBoards?: Set<string>;
  lastHeartbeat?: number;
}

/**
 * WebSocket server configuration
 */
export interface RealtimeServerConfig {
  port: number;
  heartbeatInterval?: number;
  clientTimeout?: number;
}

/**
 * RealtimeServer class
 * Manages WebSocket connections and real-time message broadcasting
 */
export class RealtimeServer {
  private wss: WebSocketServer;
  private subscriptions: Map<string, Set<ExtendedWebSocket>> = new Map();
  private clients: Map<string, ExtendedWebSocket> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: Required<RealtimeServerConfig>;

  constructor(config: RealtimeServerConfig | number) {
    // Support both old (port number) and new (config object) constructor signatures
    if (typeof config === 'number') {
      this.config = {
        port: config,
        heartbeatInterval: 30000,
        clientTimeout: 300000, // 5 minutes - much more lenient to prevent disconnections
      };
    } else {
      this.config = {
        heartbeatInterval: 30000,
        clientTimeout: 300000, // 5 minutes - much more lenient to prevent disconnections
        ...config,
      };
    }

    this.wss = new WebSocketServer({ port: this.config.port });
    this.setupServer();
    this.startHeartbeatCheck();
  }

  /**
   * Setup WebSocket server and event handlers
   */
  private setupServer(): void {
    this.wss.on('connection', (ws: ExtendedWebSocket) => {
      const clientId = this.generateClientId();
      ws.clientId = clientId;
      ws.subscribedBoards = new Set();
      ws.lastHeartbeat = Date.now();

      this.clients.set(clientId, ws);

      console.log(`[WebSocket] Client connected: ${clientId} (Total: ${this.clients.size})`);

      // Handle incoming messages
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString()) as ClientMessage;
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error(`[WebSocket] Invalid message from ${clientId}:`, error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        console.log(`[WebSocket] Client disconnected: ${clientId} (Total: ${this.clients.size - 1})`);
        this.removeClient(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`[WebSocket] Client error (${clientId}):`, error);
      });

      // Send welcome message
      this.sendToClient(ws, {
        type: 'task_created',
        task: {} as any,
      });
    });

    this.wss.on('error', (error) => {
      console.error('[WebSocket] Server error:', error);
    });

    console.log(`[WebSocket] Server listening on port ${this.config.port}`);
    console.log(`[WebSocket] Endpoint: ws://localhost:${this.config.port}`);
  }

  /**
   * Handle incoming client messages
   */
  private handleClientMessage(ws: ExtendedWebSocket, message: ClientMessage): void {
    ws.lastHeartbeat = Date.now();

    switch (message.type) {
      case 'subscribe':
        if (message.boardId) {
          this.subscribe(message.boardId, ws);
          console.log(`[WebSocket] Client ${ws.clientId} subscribed to board: ${message.boardId}`);
        }
        break;

      case 'unsubscribe':
        if (message.boardId) {
          this.unsubscribe(message.boardId, ws);
          console.log(`[WebSocket] Client ${ws.clientId} unsubscribed from board: ${message.boardId}`);
        }
        break;

      case 'heartbeat':
      case 'ping':
        // Respond to heartbeat/ping with pong
        this.sendToClient(ws, { type: 'pong' } as any);
        break;

      default:
        console.warn(`[WebSocket] Unknown message type from ${ws.clientId}:`, message);
    }
  }

  /**
   * Subscribe a client to board updates
   */
  private subscribe(boardId: string, ws: ExtendedWebSocket): void {
    if (!this.subscriptions.has(boardId)) {
      this.subscriptions.set(boardId, new Set());
    }
    this.subscriptions.get(boardId)!.add(ws);
    ws.subscribedBoards?.add(boardId);
  }

  /**
   * Unsubscribe a client from board updates
   */
  private unsubscribe(boardId: string, ws: ExtendedWebSocket): void {
    const subs = this.subscriptions.get(boardId);
    if (subs) {
      subs.delete(ws);
      if (subs.size === 0) {
        this.subscriptions.delete(boardId);
      }
    }
    ws.subscribedBoards?.delete(boardId);
  }

  /**
   * Remove a client from all subscriptions
   */
  private removeClient(ws: ExtendedWebSocket): void {
    // Remove from all subscriptions
    ws.subscribedBoards?.forEach(boardId => {
      const subs = this.subscriptions.get(boardId);
      if (subs) {
        subs.delete(ws);
        if (subs.size === 0) {
          this.subscriptions.delete(boardId);
        }
      }
    });

    // Remove from clients map
    if (ws.clientId) {
      this.clients.delete(ws.clientId);
    }
  }

  /**
   * Send a message to a specific client
   */
  private sendToClient(ws: ExtendedWebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`[WebSocket] Failed to send to client ${ws.clientId}:`, error);
      }
    }
  }

  /**
   * Broadcast a message to all clients subscribed to a board
   */
  public broadcast(boardId: string, message: ServerMessage): void {
    const clients = this.subscriptions.get(boardId);
    if (!clients || clients.size === 0) {
      return;
    }

    const data = JSON.stringify(message);
    let sentCount = 0;

    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(data);
          sentCount++;
        } catch (error) {
          console.error(`[WebSocket] Failed to broadcast to client ${client.clientId}:`, error);
        }
      }
    }

    if (sentCount > 0) {
      console.log(`[WebSocket] Broadcasted to ${sentCount} clients on board: ${boardId}`);
    }
  }

  /**
   * Broadcast to all connected clients
   */
  public broadcastAll(message: ServerMessage): void {
    const data = JSON.stringify(message);
    let sentCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(data);
          sentCount++;
        } catch (error) {
          console.error(`[WebSocket] Failed to broadcast to client ${client.clientId}:`, error);
        }
      }
    });

    if (sentCount > 0) {
      console.log(`[WebSocket] Broadcasted to ${sentCount} total clients`);
    }
  }

  /**
   * Start periodic heartbeat check
   * Removes clients that haven't sent a heartbeat recently
   */
  private startHeartbeatCheck(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const staleClients: ExtendedWebSocket[] = [];

      this.clients.forEach((client) => {
        const lastHeartbeat = client.lastHeartbeat || 0;
        if (now - lastHeartbeat > this.config.clientTimeout) {
          staleClients.push(client);
        }
      });

      // Remove stale clients
      staleClients.forEach((client) => {
        console.log(`[WebSocket] Removing stale client: ${client.clientId}`);
        client.terminate();
        this.removeClient(client);
      });
    }, this.config.heartbeatInterval);
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get number of connected clients
   */
  public getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get clients subscribed to a specific board
   */
  public getBoardSubscribers(boardId: string): number {
    const clients = this.subscriptions.get(boardId);
    return clients ? clients.size : 0;
  }

  /**
   * Close the WebSocket server
   */
  public close(): Promise<void> {
    return new Promise((resolve) => {
      // Clear heartbeat interval
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      // Close all client connections
      this.clients.forEach((client) => {
        client.close();
      });
      this.clients.clear();
      this.subscriptions.clear();

      // Close server
      this.wss.close(() => {
        console.log('[WebSocket] Server closed');
        resolve();
      });
    });
  }
}
