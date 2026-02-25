/**
 * Task Store - Manages all task state using Zustand
 */
import { create } from 'zustand';
import type { AgentTask, TaskStatus, Comment } from '@/types';
import { apiClient } from '@/services/api';

interface TaskStore {
  /** All tasks in the application */
  tasks: AgentTask[];

  /** Currently selected task for detail view */
  selectedTaskId: string | null;

  /** Loading state */
  loading: boolean;

  /** Task detail loading state */
  taskDetailLoading: boolean;

  /** Comments for the selected task */
  taskComments: Comment[];

  /** Error state */
  error: string | null;

  // Actions
  /** Set all tasks at once (initial load) */
  setTasks: (tasks: AgentTask[]) => void;

  /** Add a new task */
  addTask: (task: AgentTask) => void;

  /** Update an existing task */
  updateTask: (task: AgentTask) => void;

  /** Remove a task */
  removeTask: (taskId: string) => void;

  /** Move task to different status */
  moveTask: (taskId: string, newStatus: TaskStatus) => void;

  /** Select a task for detail view */
  selectTask: (taskId: string | null) => void;

  /** Get task by ID */
  getTask: (taskId: string) => AgentTask | undefined;

  /** Get tasks by board ID */
  getTasksByBoard: (boardId: string) => AgentTask[];

  /** Get tasks by status */
  getTasksByStatus: (status: TaskStatus) => AgentTask[];

  /** Get tasks by agent ID */
  getTasksByAgent: (agentId: string) => AgentTask[];

  /** Set loading state */
  setLoading: (loading: boolean) => void;

  /** Set error state */
  setError: (error: string | null) => void;

  /** Clear all tasks */
  clearTasks: () => void;

  /** Fetch full task details (with code changes + comments) */
  fetchTaskDetails: (taskId: string) => Promise<void>;
}

/**
 * Task store with comprehensive task management
 * Provides real-time task updates via WebSocket integration
 */
export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  selectedTaskId: null,
  loading: false,
  taskDetailLoading: false,
  taskComments: [],
  error: null,

  setTasks: (tasks) => {
    set({ tasks, error: null });
  },

  addTask: (task) => {
    set((state) => ({
      tasks: [...state.tasks, task],
      error: null,
    }));
  },

  updateTask: (updatedTask) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === updatedTask.id ? updatedTask : task
      ),
      error: null,
    }));
  },

  removeTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== taskId),
      selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId,
      error: null,
    }));
  },

  moveTask: (taskId, newStatus) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? { ...task, status: newStatus, updatedAt: new Date() }
          : task
      ),
      error: null,
    }));
  },

  selectTask: (taskId) => {
    set({ selectedTaskId: taskId });
  },

  getTask: (taskId) => {
    return get().tasks.find((task) => task.id === taskId);
  },

  getTasksByBoard: (boardId) => {
    return get().tasks.filter((task) => task.boardId === boardId);
  },

  getTasksByStatus: (status) => {
    return get().tasks.filter((task) => task.status === status);
  },

  getTasksByAgent: (agentId) => {
    return get().tasks.filter((task) => task.agentId === agentId);
  },

  setLoading: (loading) => {
    set({ loading });
  },

  setError: (error) => {
    set({ error });
  },

  clearTasks: () => {
    set({ tasks: [], selectedTaskId: null, error: null, taskComments: [] });
  },

  fetchTaskDetails: async (taskId) => {
    set({ taskDetailLoading: true });
    try {
      const [taskDetail, comments] = await Promise.all([
        apiClient.getTask(taskId),
        apiClient.getComments(taskId),
      ]);

      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, ...taskDetail } : t
        ),
        taskComments: comments,
        taskDetailLoading: false,
      }));
    } catch (err) {
      console.error('Failed to fetch task details:', err);
      set({ taskDetailLoading: false });
    }
  },
}));
