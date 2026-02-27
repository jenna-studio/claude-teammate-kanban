/**
 * Integration Tests for WebSocket Task Movement
 * Tests the real-time task update flow from WebSocket to UI
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useTaskStore } from '@/stores/taskStore';
import type { AgentTask, ServerMessage } from '@/types';

describe('WebSocket Task Movement Integration', () => {
  beforeEach(() => {
    // Reset task store
    useTaskStore.setState({
      tasks: [],
      selectedTaskId: null,
      loading: false,
      taskDetailLoading: false,
      taskComments: [],
      error: null,
    });
  });

  describe('Task Store Updates', () => {
    it('should update task status when receiving task_updated event', () => {
      // Set up initial task
      const initialTask: AgentTask = {
        id: 'task-1',
        boardId: 'board-1',
        sessionId: 'session-1',
        agentId: 'agent-1',
        agentName: 'Test Agent',
        agentType: 'code-generator',
        title: 'Test Task',
        status: 'todo',
        importance: 'medium',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      useTaskStore.getState().setTasks([initialTask]);

      // Simulate WebSocket task_updated message handling
      const updatedTask: AgentTask = {
        ...initialTask,
        status: 'in_progress',
        progress: 50,
      };

      useTaskStore.getState().updateTask(updatedTask);

      // Verify task was updated
      const task = useTaskStore.getState().getTask('task-1');
      expect(task?.status).toBe('in_progress');
      expect(task?.progress).toBe(50);
    });

    it('should add new task when receiving task_created event', () => {
      const newTask: AgentTask = {
        id: 'task-2',
        boardId: 'board-1',
        sessionId: 'session-1',
        agentId: 'agent-1',
        agentName: 'Test Agent',
        agentType: 'code-generator',
        title: 'New Task',
        status: 'claimed',
        importance: 'high',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Simulate WebSocket task_created message handling
      useTaskStore.getState().addTask(newTask);

      // Verify task was added
      const tasks = useTaskStore.getState().tasks;
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('task-2');
      expect(tasks[0].status).toBe('claimed');
    });

    it('should handle multiple concurrent task updates', () => {
      // Set up initial tasks
      const task1: AgentTask = {
        id: 'task-1',
        boardId: 'board-1',
        sessionId: 'session-1',
        agentId: 'agent-1',
        agentName: 'Agent 1',
        agentType: 'code-generator',
        title: 'Task 1',
        status: 'todo',
        importance: 'medium',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const task2: AgentTask = {
        id: 'task-2',
        boardId: 'board-1',
        sessionId: 'session-2',
        agentId: 'agent-2',
        agentName: 'Agent 2',
        agentType: 'tester',
        title: 'Task 2',
        status: 'claimed',
        importance: 'high',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      useTaskStore.getState().setTasks([task1, task2]);

      // Simulate concurrent updates
      useTaskStore.getState().updateTask({ ...task1, status: 'in_progress', progress: 30 });
      useTaskStore.getState().updateTask({ ...task2, status: 'in_progress', progress: 50 });
      useTaskStore.getState().updateTask({ ...task1, status: 'in_progress', progress: 75 });

      // Verify both tasks were updated correctly
      const updatedTask1 = useTaskStore.getState().getTask('task-1');
      const updatedTask2 = useTaskStore.getState().getTask('task-2');

      expect(updatedTask1?.status).toBe('in_progress');
      expect(updatedTask1?.progress).toBe(75);
      expect(updatedTask2?.status).toBe('in_progress');
      expect(updatedTask2?.progress).toBe(50);
    });

    it('should maintain task data integrity during rapid updates', () => {
      const task: AgentTask = {
        id: 'task-1',
        boardId: 'board-1',
        sessionId: 'session-1',
        agentId: 'agent-1',
        agentName: 'Test Agent',
        agentType: 'code-generator',
        title: 'Test Task',
        description: 'Original description',
        status: 'todo',
        importance: 'medium',
        progress: 0,
        tags: ['backend', 'api'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      useTaskStore.getState().setTasks([task]);

      // Rapid sequential updates
      useTaskStore.getState().updateTask({ ...task, progress: 25 });
      useTaskStore.getState().updateTask({ ...task, progress: 50, status: 'in_progress' });
      useTaskStore.getState().updateTask({
        ...task,
        progress: 75,
        status: 'in_progress',
        currentAction: 'Running tests',
      });

      const updatedTask = useTaskStore.getState().getTask('task-1');

      // Verify last update preserved all fields
      expect(updatedTask?.progress).toBe(75);
      expect(updatedTask?.status).toBe('in_progress');
      expect(updatedTask?.currentAction).toBe('Running tests');
      expect(updatedTask?.description).toBe('Original description');
      expect(updatedTask?.tags).toEqual(['backend', 'api']);
    });

    it('should move task between columns via moveTask', () => {
      const task: AgentTask = {
        id: 'task-1',
        boardId: 'board-1',
        sessionId: 'session-1',
        agentId: 'agent-1',
        agentName: 'Test Agent',
        agentType: 'code-generator',
        title: 'Test Task',
        status: 'todo',
        importance: 'medium',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      useTaskStore.getState().setTasks([task]);

      // Move task through different statuses
      useTaskStore.getState().moveTask('task-1', 'claimed');
      expect(useTaskStore.getState().getTask('task-1')?.status).toBe('claimed');

      useTaskStore.getState().moveTask('task-1', 'in_progress');
      expect(useTaskStore.getState().getTask('task-1')?.status).toBe('in_progress');

      useTaskStore.getState().moveTask('task-1', 'review');
      expect(useTaskStore.getState().getTask('task-1')?.status).toBe('review');

      useTaskStore.getState().moveTask('task-1', 'done');
      expect(useTaskStore.getState().getTask('task-1')?.status).toBe('done');
    });

    it('should handle task removal', () => {
      const task1: AgentTask = {
        id: 'task-1',
        boardId: 'board-1',
        sessionId: 'session-1',
        agentId: 'agent-1',
        agentName: 'Agent 1',
        agentType: 'code-generator',
        title: 'Task 1',
        status: 'done',
        importance: 'medium',
        progress: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const task2: AgentTask = {
        id: 'task-2',
        boardId: 'board-1',
        sessionId: 'session-2',
        agentId: 'agent-2',
        agentName: 'Agent 2',
        agentType: 'tester',
        title: 'Task 2',
        status: 'in_progress',
        importance: 'high',
        progress: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      useTaskStore.getState().setTasks([task1, task2]);

      // Remove task 1
      useTaskStore.getState().removeTask('task-1');

      const tasks = useTaskStore.getState().tasks;
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('task-2');
    });
  });
});
