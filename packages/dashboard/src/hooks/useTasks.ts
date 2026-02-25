/**
 * useTasks Hook
 * Manages task data and operations
 */
import { useCallback } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { useUIStore } from '@/stores/uiStore';
import { apiClient } from '@/services/api';
import { filterTasks } from '@/utils/filters';
import type { AgentTask, TaskStatus } from '@/types';

/**
 * Hook for managing tasks with filtering support
 */
export function useTasks(boardId: string | null) {
  const {
    tasks,
    selectedTaskId,
    loading,
    error,
    setTasks,
    addTask,
    updateTask: updateTaskStore,
    removeTask,
    moveTask: moveTaskStore,
    selectTask,
    getTask,
    getTasksByBoard,
    getTasksByStatus,
    setLoading,
    setError,
  } = useTaskStore();

  const { filters } = useUIStore();

  /**
   * Fetch tasks for a board
   */
  const fetchTasks = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);

      try {
        const fetchedTasks = await apiClient.getTasks(id);
        setTasks(fetchedTasks);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch tasks';
        setError(errorMessage);
        console.error('Failed to fetch tasks:', err);
      } finally {
        setLoading(false);
      }
    },
    [setTasks, setLoading, setError]
  );

  /**
   * Create a new task
   */
  const createTask = useCallback(
    async (task: Partial<AgentTask>) => {
      setError(null);

      try {
        const newTask = await apiClient.createTask(task);
        addTask(newTask);
        return newTask;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create task';
        setError(errorMessage);
        console.error('Failed to create task:', err);
        throw err;
      }
    },
    [addTask, setError]
  );

  /**
   * Update a task
   */
  const updateTask = useCallback(
    async (taskId: string, updates: Partial<AgentTask>) => {
      setError(null);

      try {
        const updatedTask = await apiClient.updateTask(taskId, updates);
        updateTaskStore(updatedTask);
        return updatedTask;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update task';
        setError(errorMessage);
        console.error('Failed to update task:', err);
        throw err;
      }
    },
    [updateTaskStore, setError]
  );

  /**
   * Delete a task
   */
  const deleteTask = useCallback(
    async (taskId: string) => {
      setError(null);

      try {
        await apiClient.deleteTask(taskId);
        removeTask(taskId);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete task';
        setError(errorMessage);
        console.error('Failed to delete task:', err);
        throw err;
      }
    },
    [removeTask, setError]
  );

  /**
   * Move task to different status
   */
  const moveTask = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      setError(null);

      try {
        // Optimistically update UI
        moveTaskStore(taskId, newStatus);

        // Update backend
        await apiClient.updateTask(taskId, { status: newStatus });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to move task';
        setError(errorMessage);
        console.error('Failed to move task:', err);

        // Revert optimistic update by refetching
        if (boardId) {
          await fetchTasks(boardId);
        }
      }
    },
    [moveTaskStore, boardId, fetchTasks, setError]
  );

  // Get board tasks
  const boardTasks = boardId ? getTasksByBoard(boardId) : tasks;

  // Apply filters
  const filteredTasks = filterTasks(boardTasks, filters);

  // Get selected task
  const selectedTask = selectedTaskId ? getTask(selectedTaskId) : null;

  return {
    tasks: filteredTasks,
    allTasks: boardTasks,
    selectedTask,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    selectTask,
    getTasksByStatus,
  };
}
