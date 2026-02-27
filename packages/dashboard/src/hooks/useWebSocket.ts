/**
 * useWebSocket Hook
 * Manages WebSocket connection and message handling
 */
import { useEffect, useRef, useState } from 'react';
import { wsClient, ConnectionState } from '@/services/websocket';
import { useTaskStore } from '@/stores/taskStore';
import { useAgentStore } from '@/stores/agentStore';
import { useBoardStore } from '@/stores/boardStore';
import { useAlertStore } from '@/stores/alertStore';
import type { ServerMessage, Board } from '@/types';

/**
 * Play a short ascending chime (C5 → E5) using Web Audio API.
 */
function playCompletionSound(): void {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // First tone: C5
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.value = 523.25;
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Second tone: E5
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 659.25;
    gain2.gain.setValueAtTime(0.3, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.3);

    setTimeout(() => ctx.close(), 500);
  } catch {
    // Silently ignore if Web Audio API is unavailable
  }
}

/**
 * Hook for managing WebSocket connection to a specific board
 */
export function useWebSocket(boardId: string | null) {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED
  );

  const { addTask, updateTask, removeTask } = useTaskStore();
  const { updateAgent } = useAgentStore();
  const { addBoard } = useBoardStore();
  const { addAlert } = useAlertStore();

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

      case 'task_updated': {
        const existingTask = useTaskStore.getState().tasks.find(
          (t) => t.id === message.task.id
        );
        if (
          existingTask &&
          existingTask.status !== 'done' &&
          message.task.status === 'done'
        ) {
          playCompletionSound();
          addAlert({
            severity: 'success',
            source: 'system',
            title: 'Task Completed',
            message: `"${message.task.title}" completed by ${message.task.agentName || 'agent'}`,
          });
        }
        updateTask(message.task);
        break;
      }

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

      case 'board_created':
        // Add the new board to the store and navigate to it
        addBoard(message.board as Board);
        window.location.href = `/board/${(message.board as Board).id}`;
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
