/**
 * Board Store - Manages board state using Zustand
 */
import { create } from 'zustand';
import type { Board, BoardColumn, BoardStatistics } from '@/types';
import { useTaskStore } from './taskStore';
import { useAgentStore } from './agentStore';

interface BoardStore {
  /** All boards */
  boards: Board[];

  /** Currently active board */
  currentBoardId: string | null;

  /** Board statistics */
  statistics: BoardStatistics | null;

  /** Loading state */
  loading: boolean;

  /** Error state */
  error: string | null;

  // Actions
  /** Set all boards */
  setBoards: (boards: Board[]) => void;

  /** Add a board */
  addBoard: (board: Board) => void;

  /** Update a board */
  updateBoard: (board: Board) => void;

  /** Remove a board */
  removeBoard: (boardId: string) => void;

  /** Set current active board */
  setCurrentBoard: (boardId: string) => void;

  /** Get current board */
  getCurrentBoard: () => Board | undefined;

  /** Get board by ID */
  getBoard: (boardId: string) => Board | undefined;

  /** Update board columns */
  updateColumns: (boardId: string, columns: BoardColumn[]) => void;

  /** Set board statistics */
  setStatistics: (statistics: BoardStatistics) => void;

  /** Set loading state */
  setLoading: (loading: boolean) => void;

  /** Set error state */
  setError: (error: string | null) => void;
}

/**
 * Board store managing workspace configuration and state
 */
export const useBoardStore = create<BoardStore>((set, get) => ({
  boards: [],
  currentBoardId: null,
  statistics: null,
  loading: false,
  error: null,

  setBoards: (boards) => {
    set({ boards, error: null });
  },

  addBoard: (board) => {
    set((state) => ({
      boards: [...state.boards, board],
      error: null,
    }));
  },

  updateBoard: (updatedBoard) => {
    set((state) => ({
      boards: state.boards.map((board) =>
        board.id === updatedBoard.id ? updatedBoard : board
      ),
      error: null,
    }));
  },

  removeBoard: (boardId) => {
    set((state) => ({
      boards: state.boards.filter((board) => board.id !== boardId),
      currentBoardId: state.currentBoardId === boardId ? null : state.currentBoardId,
      error: null,
    }));
  },

  setCurrentBoard: (boardId) => {
    // Clear all tasks and agents when switching boards
    useTaskStore.getState().clearTasks();
    useAgentStore.getState().clearAgents();

    set({ currentBoardId: boardId });
  },

  getCurrentBoard: () => {
    const { boards, currentBoardId } = get();
    return boards.find((board) => board.id === currentBoardId);
  },

  getBoard: (boardId) => {
    return get().boards.find((board) => board.id === boardId);
  },

  updateColumns: (boardId, columns) => {
    set((state) => ({
      boards: state.boards.map((board) =>
        board.id === boardId ? { ...board, columns } : board
      ),
      error: null,
    }));
  },

  setStatistics: (statistics) => {
    set({ statistics });
  },

  setLoading: (loading) => {
    set({ loading });
  },

  setError: (error) => {
    set({ error });
  },
}));
