/**
 * usePollingFallback Hook
 * Polls the REST API as a fallback when WebSocket is disconnected,
 * ensuring the dashboard always shows the latest board state.
 */
import { useEffect, useRef } from 'react';
import { ConnectionState, wsClient } from '@/services/websocket';
import { apiClient } from '@/services/api';
import { useTaskStore } from '@/stores/taskStore';
import { useAgentStore } from '@/stores/agentStore';
import { useBoardStore } from '@/stores/boardStore';

/** Polling interval when WebSocket is disconnected (ms) */
const DISCONNECTED_POLL_INTERVAL = 3000;

/** Slow polling interval when WebSocket is connected (background sync) */
const CONNECTED_POLL_INTERVAL = 30000;

/**
 * Polls tasks and agents via REST API as a fallback
 * when the WebSocket connection is unavailable.
 * Also does slow background sync when connected to catch any missed messages.
 *
 * NOTE: Only polls tasks and agents — not boards — to avoid overwriting
 * board data that includes columns (getBoards() returns boards without columns).
 */
export function usePollingFallback(boardId: string | null) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPollRef = useRef<number>(0);

  useEffect(() => {
    if (!boardId) return;

    const poll = async () => {
      const now = Date.now();
      // Debounce: skip if last poll was < 2s ago
      if (now - lastPollRef.current < 2000) return;
      lastPollRef.current = now;

      try {
        const [tasks, agents] = await Promise.all([
          apiClient.getTasks(boardId),
          apiClient.getBoardAgents(boardId),
        ]);

        useTaskStore.getState().setTasks(tasks);
        useAgentStore.getState().setAgents(agents);

        // Also refresh the current board's full data (including columns)
        // only when WebSocket is disconnected, to ensure columns stay loaded.
        const isDisconnected = wsClient.getState() !== ConnectionState.CONNECTED;
        if (isDisconnected) {
          const boardData = await apiClient.getBoard(boardId);
          const store = useBoardStore.getState();
          store.updateBoard({ ...boardData.board, columns: boardData.columns });
          store.updateColumns(boardId, boardData.columns);
        }
      } catch {
        // Silently fail — will retry on next interval
      }
    };

    const schedulePolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      const isConnected = wsClient.getState() === ConnectionState.CONNECTED;
      const interval = isConnected
        ? CONNECTED_POLL_INTERVAL
        : DISCONNECTED_POLL_INTERVAL;

      // Poll immediately when disconnected
      if (!isConnected) {
        poll();
      }

      intervalRef.current = setInterval(poll, interval);
    };

    // Re-schedule when connection state changes
    const unsubscribe = wsClient.onStateChange(() => {
      schedulePolling();
    });

    // Initial schedule
    schedulePolling();

    return () => {
      unsubscribe();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [boardId]);
}
