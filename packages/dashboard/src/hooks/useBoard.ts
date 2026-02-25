/**
 * useBoard Hook
 * Manages board data and operations
 */
import { useEffect, useCallback } from 'react';
import { useBoardStore } from '@/stores/boardStore';
import { apiClient } from '@/services/api';
import type { Board, BoardColumn } from '@/types';

/**
 * Hook for managing board data and operations
 */
export function useBoard(boardId: string | null) {
  const {
    boards,
    statistics,
    loading,
    error,
    setBoards,
    setCurrentBoard,
    getCurrentBoard,
    getBoard,
    updateBoard: updateBoardStore,
    updateColumns,
    setStatistics,
    setLoading,
    setError,
  } = useBoardStore();

  // Set current board when boardId changes
  useEffect(() => {
    if (boardId) {
      setCurrentBoard(boardId);
    }
  }, [boardId, setCurrentBoard]);

  /**
   * Fetch all boards
   */
  const fetchBoards = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const boards = await apiClient.getBoards();
      setBoards(boards);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch boards';
      setError(errorMessage);
      console.error('Failed to fetch boards:', err);
    } finally {
      setLoading(false);
    }
  }, [setBoards, setLoading, setError]);

  /**
   * Fetch a specific board with all data
   */
  const fetchBoard = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.getBoard(id);
        updateBoardStore(response.board);
        updateColumns(id, response.columns);
        setStatistics(response.statistics);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch board';
        setError(errorMessage);
        console.error('Failed to fetch board:', err);
      } finally {
        setLoading(false);
      }
    },
    [updateBoardStore, updateColumns, setStatistics, setLoading, setError]
  );

  /**
   * Create a new board
   */
  const createBoard = useCallback(
    async (board: Partial<Board>) => {
      setLoading(true);
      setError(null);

      try {
        const newBoard = await apiClient.createBoard(board);
        // Refetch boards to get the updated list
        await fetchBoards();
        return newBoard;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create board';
        setError(errorMessage);
        console.error('Failed to create board:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchBoards, setLoading, setError]
  );

  /**
   * Update board columns
   */
  const updateBoardColumns = useCallback(
    async (id: string, columns: BoardColumn[]) => {
      setError(null);

      try {
        updateColumns(id, columns);
        // Optionally save to backend
        // await apiClient.updateBoard(id, { columns });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update columns';
        setError(errorMessage);
        console.error('Failed to update columns:', err);
      }
    },
    [updateColumns, setError]
  );

  const currentBoard = boardId ? getBoard(boardId) : getCurrentBoard();
  const columns = currentBoard?.columns || [];

  return {
    boards,
    currentBoard,
    columns,
    statistics,
    loading,
    error,
    fetchBoards,
    fetchBoard,
    createBoard,
    updateBoardColumns,
  };
}
