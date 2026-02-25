/**
 * useWebSocket Hook
 * Manages WebSocket connection and message handling
 */
import { useEffect, useRef, useState } from 'react';
import { wsClient, ConnectionState } from '@/services/websocket';
import { useTaskStore } from '@/stores/taskStore';
import { useAgentStore } from '@/stores/agentStore';
import type { ServerMessage } from '@/types';

/**
 * Hook for managing WebSocket connection to a specific board
 */
export function useWebSocket(boardId: string | null) {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED
  );

  const { addTask, updateTask, removeTask } = useTaskStore();
  const { updateAgent } = useAgentStore();

  // Track if we're already subscribed to prevent duplicate subscriptions
  const subscribedRef = useRef(false);

  useEffect(() => {
    // Connect to WebSocket server
    wsClient.connect();

    // Subscribe to state changes
    const unsubscribeState = wsClient.onStateChange((state) => {
      setConnectionState(state);
    });

    // Subscribe to messages
    const unsubscribeMessages = wsClient.onMessage((message: ServerMessage) => {
      handleMessage(message);
    });

    // Subscribe to board if provided
    if (boardId && !subscribedRef.current) {
      wsClient.subscribeToBoard(boardId);
      subscribedRef.current = true;
    }

    return () => {
      // Unsubscribe from board
      if (boardId && subscribedRef.current) {
        wsClient.unsubscribeFromBoard(boardId);
        subscribedRef.current = false;
      }

      // Cleanup subscriptions
      unsubscribeState();
      unsubscribeMessages();

      // Disconnect if no other components are using it
      // wsClient.disconnect();
    };
  }, [boardId]);

  /**
   * Handle incoming WebSocket messages
   */
  function handleMessage(message: ServerMessage) {
    switch (message.type) {
      case 'task_created':
        addTask(message.task);
        break;

      case 'task_updated':
        updateTask(message.task);
        break;

      case 'task_moved':
        // The task_updated message should handle this
        break;

      case 'task_deleted':
        removeTask(message.taskId);
        break;

      case 'agent_status_changed':
        updateAgent(message.agent);
        break;

      case 'activity_logged':
        // Could be handled by a separate activity log store
        console.log('Activity logged:', message.log);
        break;

      case 'comment_added':
        // Could be handled by a comment store or trigger a refetch
        console.log('Comment added:', message.comment);
        break;

      default:
        console.warn('Unknown message type:', message);
    }
  }

  return {
    connected: connectionState === ConnectionState.CONNECTED,
    connectionState,
    reconnecting: connectionState === ConnectionState.RECONNECTING,
  };
}
