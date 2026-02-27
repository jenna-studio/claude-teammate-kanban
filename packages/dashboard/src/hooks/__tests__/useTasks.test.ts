/**
 * Tests for useTasks Hook
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTasks } from '../useTasks';
import { useTaskStore } from '@/stores/taskStore';
import { useUIStore } from '@/stores/uiStore';
import { apiClient } from '@/services/api';
import type { AgentTask, TaskStatus } from '@/types';

// Mock API client
vi.mock('@/services/api', () => ({
  apiClient: {
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    getTask: vi.fn(),
    getComments: vi.fn(),
  },
}));

const createMockTask = (id: string, status: TaskStatus = 'todo'): AgentTask => ({
  id,
  boardId: 'board-1',
  sessionId: 'session-1',
  agentId: 'agent-1',
  agentName: 'Test Agent',
  agentType: 'code-generator',
  title: `Task ${id}`,
  status,
  importance: 'medium',
  progress: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('useTasks Hook', () => {
  beforeEach(() => {
    // Reset stores
    useTaskStore.setState({
      tasks: [],
      selectedTaskId: null,
      loading: false,
      taskDetailLoading: false,
      taskComments: [],
      error: null,
    });

    useUIStore.setState({
      filters: {
        search: '',
        agentIds: [],
        tags: [],
        importance: [],
        showCompleted: true,
      },
    });

    vi.clearAllMocks();
  });

  describe('fetchTasks', () => {
    it('should fetch tasks for a board', async () => {
      const mockTasks = [createMockTask('task-1'), createMockTask('task-2')];
      vi.mocked(apiClient.getTasks).mockResolvedValue(mockTasks);

      const { result } = renderHook(() => useTasks('board-1'));

      await waitFor(async () => {
        await result.current.fetchTasks('board-1');
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(apiClient.getTasks).toHaveBeenCalledWith('board-1');
      expect(result.current.tasks).toHaveLength(2);
    });

    it('should set error state when fetch fails', async () => {
      vi.mocked(apiClient.getTasks).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useTasks('board-1'));

      await waitFor(async () => {
        await result.current.fetchTasks('board-1');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });
    });
  });

  describe('moveTask', () => {
    it('should optimistically update task status', async () => {
      const task = createMockTask('task-1', 'todo');
      useTaskStore.getState().setTasks([task]);

      vi.mocked(apiClient.updateTask).mockResolvedValue({
        ...task,
        status: 'in_progress',
      });

      const { result } = renderHook(() => useTasks('board-1'));

      await waitFor(async () => {
        await result.current.moveTask('task-1', 'in_progress');
      });

      // Should optimistically update immediately
      const updatedTask = useTaskStore.getState().getTask('task-1');
      expect(updatedTask?.status).toBe('in_progress');
      expect(apiClient.updateTask).toHaveBeenCalledWith('task-1', {
        status: 'in_progress',
      });
    });

    it('should refetch tasks on API error', async () => {
      const task = createMockTask('task-1', 'todo');
      useTaskStore.getState().setTasks([task]);

      vi.mocked(apiClient.updateTask).mockRejectedValue(
        new Error('Failed to update')
      );
      vi.mocked(apiClient.getTasks).mockResolvedValue([task]);

      const { result } = renderHook(() => useTasks('board-1'));

      // Call moveTask - it will fail and trigger refetch
      await result.current.moveTask('task-1', 'in_progress');

      // Should have attempted to refetch to revert optimistic update
      await waitFor(() => {
        expect(apiClient.getTasks).toHaveBeenCalledWith('board-1');
      });
    });
  });

  describe('createTask', () => {
    it('should create a new task', async () => {
      const newTask = createMockTask('task-1', 'todo');
      vi.mocked(apiClient.createTask).mockResolvedValue(newTask);

      const { result } = renderHook(() => useTasks('board-1'));

      await waitFor(async () => {
        const created = await result.current.createTask({
          title: 'Task 1',
          boardId: 'board-1',
        });
        expect(created.id).toBe('task-1');
      });

      expect(apiClient.createTask).toHaveBeenCalledWith({
        title: 'Task 1',
        boardId: 'board-1',
      });

      const tasks = useTaskStore.getState().tasks;
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('task-1');
    });
  });

  describe('updateTask', () => {
    it('should update task data', async () => {
      const task = createMockTask('task-1', 'in_progress');
      useTaskStore.getState().setTasks([task]);

      const updatedTask = { ...task, progress: 75 };
      vi.mocked(apiClient.updateTask).mockResolvedValue(updatedTask);

      const { result } = renderHook(() => useTasks('board-1'));

      await waitFor(async () => {
        await result.current.updateTask('task-1', { progress: 75 });
      });

      expect(apiClient.updateTask).toHaveBeenCalledWith('task-1', {
        progress: 75,
      });

      const updated = useTaskStore.getState().getTask('task-1');
      expect(updated?.progress).toBe(75);
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      const task = createMockTask('task-1', 'done');
      useTaskStore.getState().setTasks([task]);

      vi.mocked(apiClient.deleteTask).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTasks('board-1'));

      await waitFor(async () => {
        await result.current.deleteTask('task-1');
      });

      expect(apiClient.deleteTask).toHaveBeenCalledWith('task-1');

      const tasks = useTaskStore.getState().tasks;
      expect(tasks).toHaveLength(0);
    });
  });

  describe('filtering', () => {
    it('should filter completed tasks when showCompleted is false', () => {
      const task1 = createMockTask('task-1', 'todo');
      const task2 = createMockTask('task-2', 'in_progress');
      const task3 = createMockTask('task-3', 'done');

      useTaskStore.getState().setTasks([task1, task2, task3]);
      useUIStore.setState({
        filters: {
          search: '',
          agentIds: [],
          tags: [],
          importance: [],
          showCompleted: false,
        },
      });

      const { result } = renderHook(() => useTasks('board-1'));

      expect(result.current.tasks).toHaveLength(2);
      expect(result.current.tasks.every(t => t.status !== 'done')).toBe(true);
    });

    it('should filter tasks by search term', () => {
      const task1 = { ...createMockTask('task-1', 'todo'), title: 'Fix bug in API' };
      const task2 = { ...createMockTask('task-2', 'in_progress'), title: 'Add new feature' };

      useTaskStore.getState().setTasks([task1, task2]);
      useUIStore.setState({
        filters: {
          search: 'bug',
          agentIds: [],
          tags: [],
          importance: [],
          showCompleted: true,
        },
      });

      const { result } = renderHook(() => useTasks('board-1'));

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].title).toBe('Fix bug in API');
    });
  });
});
