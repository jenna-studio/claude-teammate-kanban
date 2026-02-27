/**
 * Tests for Task Store
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useTaskStore } from '../taskStore';
import type { AgentTask, TaskStatus } from '@/types';

// Mock task data
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

describe('TaskStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useTaskStore.setState({
      tasks: [],
      selectedTaskId: null,
      loading: false,
      taskDetailLoading: false,
      taskComments: [],
      error: null,
    });
  });

  describe('moveTask', () => {
    it('should move a task to a new status', () => {
      const task = createMockTask('task-1', 'todo');
      const { setTasks, moveTask, getTask } = useTaskStore.getState();

      setTasks([task]);
      moveTask('task-1', 'in_progress');

      const updatedTask = getTask('task-1');
      expect(updatedTask?.status).toBe('in_progress');
    });

    it('should update the updatedAt timestamp when moving a task', () => {
      const task = createMockTask('task-1', 'todo');
      const { setTasks, moveTask, getTask } = useTaskStore.getState();

      setTasks([task]);
      const originalTime = task.updatedAt;

      // Wait a tiny bit to ensure timestamp changes
      setTimeout(() => {
        moveTask('task-1', 'in_progress');

        const updatedTask = getTask('task-1');
        expect(updatedTask?.updatedAt).not.toEqual(originalTime);
      }, 10);
    });

    it('should only update the specified task', () => {
      const task1 = createMockTask('task-1', 'todo');
      const task2 = createMockTask('task-2', 'claimed');
      const { setTasks, moveTask, tasks } = useTaskStore.getState();

      setTasks([task1, task2]);
      moveTask('task-1', 'in_progress');

      const state = useTaskStore.getState();
      expect(state.tasks[0].status).toBe('in_progress');
      expect(state.tasks[1].status).toBe('claimed');
    });

    it('should not throw error when moving non-existent task', () => {
      const { moveTask } = useTaskStore.getState();

      expect(() => {
        moveTask('non-existent', 'done');
      }).not.toThrow();
    });
  });

  describe('updateTask', () => {
    it('should update a task with new data', () => {
      const task = createMockTask('task-1', 'todo');
      const { setTasks, updateTask, getTask } = useTaskStore.getState();

      setTasks([task]);

      const updatedData = { ...task, progress: 50, currentAction: 'Working on tests' };
      updateTask(updatedData);

      const result = getTask('task-1');
      expect(result?.progress).toBe(50);
      expect(result?.currentAction).toBe('Working on tests');
    });

    it('should preserve other tasks when updating one', () => {
      const task1 = createMockTask('task-1', 'todo');
      const task2 = createMockTask('task-2', 'claimed');
      const { setTasks, updateTask } = useTaskStore.getState();

      setTasks([task1, task2]);

      updateTask({ ...task1, progress: 75 });

      const state = useTaskStore.getState();
      expect(state.tasks).toHaveLength(2);
      expect(state.tasks[0].progress).toBe(75);
      expect(state.tasks[1].id).toBe('task-2');
    });
  });

  describe('addTask', () => {
    it('should add a new task to the store', () => {
      const task = createMockTask('task-1', 'todo');
      const { addTask, tasks } = useTaskStore.getState();

      addTask(task);

      const state = useTaskStore.getState();
      expect(state.tasks).toHaveLength(1);
      expect(state.tasks[0].id).toBe('task-1');
    });

    it('should append task to existing tasks', () => {
      const task1 = createMockTask('task-1', 'todo');
      const task2 = createMockTask('task-2', 'claimed');
      const { setTasks, addTask } = useTaskStore.getState();

      setTasks([task1]);
      addTask(task2);

      const state = useTaskStore.getState();
      expect(state.tasks).toHaveLength(2);
      expect(state.tasks[1].id).toBe('task-2');
    });
  });

  describe('removeTask', () => {
    it('should remove a task from the store', () => {
      const task1 = createMockTask('task-1', 'todo');
      const task2 = createMockTask('task-2', 'claimed');
      const { setTasks, removeTask } = useTaskStore.getState();

      setTasks([task1, task2]);
      removeTask('task-1');

      const state = useTaskStore.getState();
      expect(state.tasks).toHaveLength(1);
      expect(state.tasks[0].id).toBe('task-2');
    });

    it('should clear selectedTaskId if removed task was selected', () => {
      const task = createMockTask('task-1', 'todo');
      const { setTasks, selectTask, removeTask } = useTaskStore.getState();

      setTasks([task]);
      selectTask('task-1');
      removeTask('task-1');

      const state = useTaskStore.getState();
      expect(state.selectedTaskId).toBeNull();
    });

    it('should preserve selectedTaskId if different task was removed', () => {
      const task1 = createMockTask('task-1', 'todo');
      const task2 = createMockTask('task-2', 'claimed');
      const { setTasks, selectTask, removeTask } = useTaskStore.getState();

      setTasks([task1, task2]);
      selectTask('task-1');
      removeTask('task-2');

      const state = useTaskStore.getState();
      expect(state.selectedTaskId).toBe('task-1');
    });
  });

  describe('getTasksByStatus', () => {
    it('should filter tasks by status', () => {
      const task1 = createMockTask('task-1', 'todo');
      const task2 = createMockTask('task-2', 'in_progress');
      const task3 = createMockTask('task-3', 'in_progress');
      const { setTasks, getTasksByStatus } = useTaskStore.getState();

      setTasks([task1, task2, task3]);

      const inProgressTasks = getTasksByStatus('in_progress');
      expect(inProgressTasks).toHaveLength(2);
      expect(inProgressTasks.every(t => t.status === 'in_progress')).toBe(true);
    });
  });

  describe('getTasksByBoard', () => {
    it('should filter tasks by board ID', () => {
      const task1 = { ...createMockTask('task-1', 'todo'), boardId: 'board-1' };
      const task2 = { ...createMockTask('task-2', 'claimed'), boardId: 'board-2' };
      const task3 = { ...createMockTask('task-3', 'done'), boardId: 'board-1' };
      const { setTasks, getTasksByBoard } = useTaskStore.getState();

      setTasks([task1, task2, task3]);

      const board1Tasks = getTasksByBoard('board-1');
      expect(board1Tasks).toHaveLength(2);
      expect(board1Tasks.every(t => t.boardId === 'board-1')).toBe(true);
    });
  });

  describe('getTasksByAgent', () => {
    it('should filter tasks by agent ID', () => {
      const task1 = { ...createMockTask('task-1', 'todo'), agentId: 'agent-1' };
      const task2 = { ...createMockTask('task-2', 'claimed'), agentId: 'agent-2' };
      const task3 = { ...createMockTask('task-3', 'done'), agentId: 'agent-1' };
      const { setTasks, getTasksByAgent } = useTaskStore.getState();

      setTasks([task1, task2, task3]);

      const agent1Tasks = getTasksByAgent('agent-1');
      expect(agent1Tasks).toHaveLength(2);
      expect(agent1Tasks.every(t => t.agentId === 'agent-1')).toBe(true);
    });
  });

  describe('clearTasks', () => {
    it('should clear all tasks and reset state', () => {
      const task1 = createMockTask('task-1', 'todo');
      const task2 = createMockTask('task-2', 'claimed');
      const { setTasks, selectTask, setError, clearTasks } = useTaskStore.getState();

      setTasks([task1, task2]);
      selectTask('task-1');
      setError('Some error');

      clearTasks();

      const state = useTaskStore.getState();
      expect(state.tasks).toHaveLength(0);
      expect(state.selectedTaskId).toBeNull();
      expect(state.error).toBeNull();
      expect(state.taskComments).toHaveLength(0);
    });
  });
});
