/**
 * WebSocket Client
 * Manages real-time communication with the WebSocket server
 */
import type { ClientMessage, ServerMessage } from '@/types';

/**
 * WebSocket connection states
 */
export enum ConnectionState {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR',
}

/**
 * WebSocket event handler type
 */
type MessageHandler = (message: ServerMessage) => void;
type StateChangeHandler = (state: ConnectionState) => void;

/**
 * WebSocket Client class
 * Handles connection, reconnection, and message routing
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectInterval: number = 3000;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval: number = 30000; // 30 seconds

  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private messageHandlers: Set<MessageHandler> = new Set();
  private stateChangeHandlers: Set<StateChangeHandler> = new Set();

  private subscribedBoards: Set<string> = new Set();

  /**
   * Initialize WebSocket client
   * @param url WebSocket server URL
   */
  constructor(url?: string) {
    this.url = url || WebSocketClient.getStoredWsUrl();
    this.maxReconnectAttempts = WebSocketClient.getStoredMaxAttempts();
  }

  private static getStoredWsUrl(): string {
    try {
      const stored = localStorage.getItem('agent-track-settings');
      if (stored) {
        const settings = JSON.parse(stored);
        if (settings.wsUrl) return settings.wsUrl;
      }
    } catch { /* ignore */ }
    return import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
  }

  private static getStoredMaxAttempts(): number {
    try {
      const stored = localStorage.getItem('agent-track-settings');
      if (stored) {
        const settings = JSON.parse(stored);
        if (typeof settings.maxReconnectAttempts === 'number') return settings.maxReconnectAttempts;
      }
    } catch { /* ignore */ }
    return 10;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('WebSocket already connected');
      return;
    }

    this.setState(ConnectionState.CONNECTING);

    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.setState(ConnectionState.ERROR);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.clearTimers();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setState(ConnectionState.DISCONNECTED);
  }

  /**
   * Send a message to the server
   */
  private send(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  /**
   * Subscribe to board updates
   */
  subscribeToBoard(boardId: string): void {
    this.subscribedBoards.add(boardId);
    this.send({ type: 'subscribe', boardId });
  }

  /**
   * Unsubscribe from board updates
   */
  unsubscribeFromBoard(boardId: string): void {
    this.subscribedBoards.delete(boardId);
    this.send({ type: 'unsubscribe', boardId });
  }

  /**
   * Register a message handler
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  /**
   * Register a state change handler
   */
  onStateChange(handler: StateChangeHandler): () => void {
    this.stateChangeHandlers.add(handler);
    // Return unsubscribe function
    return () => {
      this.stateChangeHandlers.delete(handler);
    };
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.setState(ConnectionState.CONNECTED);
      this.reconnectAttempts = 0;

      // Resubscribe to boards
      this.subscribedBoards.forEach((boardId) => {
        this.send({ type: 'subscribe', boardId });
      });

      // Start heartbeat
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        this.notifyMessageHandlers(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.reason);
      this.clearTimers();

      if (!event.wasClean) {
        this.setState(ConnectionState.DISCONNECTED);
        this.scheduleReconnect();
      } else {
        this.setState(ConnectionState.DISCONNECTED);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.setState(ConnectionState.ERROR);
    };
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.setState(ConnectionState.ERROR);
      return;
    }

    this.reconnectAttempts++;
    this.setState(ConnectionState.RECONNECTING);

    const delay = Math.min(
      this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1),
      30000
    );

    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'heartbeat' });
    }, this.heartbeatInterval);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Update connection state and notify handlers
   */
  private setState(state: ConnectionState): void {
    if (this.state === state) return;

    this.state = state;
    this.stateChangeHandlers.forEach((handler) => {
      try {
        handler(state);
      } catch (error) {
        console.error('State change handler error:', error);
      }
    });
  }

  /**
   * Notify all message handlers
   */
  private notifyMessageHandlers(message: ServerMessage): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error('Message handler error:', error);
      }
    });
  }
}

/**
 * Singleton WebSocket client instance
 */
export const wsClient = new WebSocketClient();
