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
  private reconnectInterval: number = 2000;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = Infinity;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval: number = 15000; // 15 seconds (well within 60s server timeout)

  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private messageHandlers: Set<MessageHandler> = new Set();
  private stateChangeHandlers: Set<StateChangeHandler> = new Set();

  private subscribedBoards: Set<string> = new Set();
  private intentionalDisconnect: boolean = false;
  private visibilityHandler: (() => void) | null = null;

  /**
   * Initialize WebSocket client
   * @param url WebSocket server URL
   */
  constructor(url?: string) {
    this.url = url || WebSocketClient.getStoredWsUrl();

    // Reconnect when tab becomes visible again (browsers throttle background timers)
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible' && this.state !== ConnectionState.CONNECTED && !this.intentionalDisconnect) {
        console.log('[WebSocket] Tab became visible, reconnecting...');
        this.reconnectAttempts = 0;
        this.clearTimers();
        this.connect();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
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



  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('WebSocket already connected');
      return;
    }

    this.intentionalDisconnect = false;
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
    this.intentionalDisconnect = true;
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
      console.log('WebSocket disconnected:', event.reason || '(no reason)');
      this.clearTimers();
      this.setState(ConnectionState.DISCONNECTED);

      // Always reconnect unless the user explicitly called disconnect()
      if (!this.intentionalDisconnect) {
        this.scheduleReconnect();
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
    if (this.intentionalDisconnect) return;

    this.reconnectAttempts++;
    this.setState(ConnectionState.RECONNECTING);

    // Exponential backoff: 2s, 3s, 4.5s, ... capped at 15s
    const delay = Math.min(
      this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1),
      15000
    );

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

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
