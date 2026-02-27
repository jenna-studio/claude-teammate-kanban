/**
 * useWebSocket Hook
 * Manages WebSocket connection and message handling
 */
import { useCallback, useEffect, useRef, useState } from 'react';
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
    () => wsClient.getState()
  );

  const { addTask, updateTask, removeTask } = useTaskStore();
  const { updateAgent } = useAgentStore();
  const { addBoard } = useBoardStore();
  const { addAlert } = useAlertStore();

  // Use refs so message handler always sees latest store functions
  // without causing effect re-runs
  const handlersRef = useRef({ addTask, updateTask, removeTask, updateAgent, addBoard, addAlert });
  handlersRef.current = { addTask, updateTask, removeTask, updateAgent, addBoard, addAlert };

  /**
   * Handle incoming WebSocket messages (stable via ref)
   */
  const handleMessage = useCallback((message: ServerMessage) => {
    const { addTask: _addTask, updateTask: _updateTask, removeTask: _removeTask, updateAgent: _updateAgent, addBoard: _addBoard, addAlert: _addAlert } = handlersRef.current;

    switch (message.type) {
      case 'task_created':
        _addTask(message.task);
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
          _addAlert({
            severity: 'success',
            source: 'system',
            title: 'Task Completed',
            message: `"${message.task.title}" completed by ${message.task.agentName || 'agent'}`,
          });
        }
        _updateTask(message.task);
        break;
      }

      case 'task_moved':
        break;

      case 'task_deleted':
        _removeTask(message.taskId);
        break;

      case 'agent_status_changed':
        _updateAgent(message.agent);
        break;

      case 'activity_logged':
        console.log('Activity logged:', message.log);
        break;

      case 'comment_added':
        console.log('Comment added:', message.comment);
        break;

      case 'board_created':
        _addBoard(message.board as Board);
        break;

      default:
        console.warn('Unknown message type:', message);
    }
  }, []);

  // Effect 1: Connect once on mount
  const connectedRef = useRef(false);
  useEffect(() => {
    if (connectedRef.current) return;
    connectedRef.current = true;
    wsClient.connect();
  }, []);

  // Effect 2: Subscribe to connection state changes (stable, no deps)
  useEffect(() => {
    const unsubscribe = wsClient.onStateChange((state) => {
      setConnectionState(state);
    });
    return () => unsubscribe();
  }, []);

  // Effect 3: Subscribe to messages (stable via useCallback)
  useEffect(() => {
    const unsubscribe = wsClient.onMessage(handleMessage);
    return () => unsubscribe();
  }, [handleMessage]);

  // Effect 4: Subscribe to board (only re-runs when boardId changes)
  const subscribedBoardRef = useRef<string | null>(null);
  useEffect(() => {
    if (!boardId) return;
    if (subscribedBoardRef.current === boardId) return;

    // Unsubscribe from previous board
    if (subscribedBoardRef.current) {
      wsClient.unsubscribeFromBoard(subscribedBoardRef.current);
    }

    wsClient.subscribeToBoard(boardId);
    subscribedBoardRef.current = boardId;

    return () => {
      if (subscribedBoardRef.current) {
        wsClient.unsubscribeFromBoard(subscribedBoardRef.current);
        subscribedBoardRef.current = null;
      }
    };
  }, [boardId]);

  return {
    connected: connectionState === ConnectionState.CONNECTED,
    connectionState,
    reconnecting: connectionState === ConnectionState.RECONNECTING,
  };
}
