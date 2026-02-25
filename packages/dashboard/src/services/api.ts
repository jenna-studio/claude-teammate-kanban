/**
 * REST API Client
 * Handles all HTTP communication with the API server
 */
import type {
  Board,
  BoardResponse,
  AgentTask,
  Agent,
  Comment,
  ActivityLog,
} from '@/types';

/**
 * Base API configuration
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: response.statusText,
      }));
      throw new Error(error.error?.message || error.error || `API Error: ${response.status}`);
    }

    const json = await response.json();
    // API wraps responses in { success, data } — unwrap it
    return json.data !== undefined ? json.data : json;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * API Client class with all endpoint methods
 */
class APIClient {
  /**
   * Fetch all boards
   */
  async getBoards(): Promise<Board[]> {
    return fetchAPI<Board[]>('/api/boards');
  }

  /**
   * Fetch a specific board with all related data
   */
  async getBoard(boardId: string): Promise<BoardResponse> {
    return fetchAPI<BoardResponse>(`/api/boards/${boardId}`);
  }

  /**
   * Create a new board
   */
  async createBoard(board: Partial<Board>): Promise<Board> {
    return fetchAPI<Board>('/api/boards', {
      method: 'POST',
      body: JSON.stringify(board),
    });
  }

  /**
   * Update an existing board
   */
  async updateBoard(boardId: string, updates: Partial<Board>): Promise<Board> {
    return fetchAPI<Board>(`/api/boards/${boardId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a board
   */
  async deleteBoard(boardId: string): Promise<void> {
    return fetchAPI<void>(`/api/boards/${boardId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Fetch a specific task
   */
  async getTask(taskId: string): Promise<AgentTask> {
    return fetchAPI<AgentTask>(`/api/tasks/${taskId}`);
  }

  /**
   * Fetch all tasks for a board
   */
  async getTasks(boardId: string): Promise<AgentTask[]> {
    return fetchAPI<AgentTask[]>(`/api/tasks?boardId=${boardId}`);
  }

  /**
   * Create a new task
   */
  async createTask(task: Partial<AgentTask>): Promise<AgentTask> {
    return fetchAPI<AgentTask>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  /**
   * Update a task
   */
  async updateTask(
    taskId: string,
    updates: Partial<AgentTask>
  ): Promise<AgentTask> {
    return fetchAPI<AgentTask>(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<void> {
    return fetchAPI<void>(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Fetch all agents
   */
  async getAgents(): Promise<Agent[]> {
    return fetchAPI<Agent[]>('/api/agents');
  }

  /**
   * Fetch a specific agent
   */
  async getAgent(agentId: string): Promise<Agent> {
    return fetchAPI<Agent>(`/api/agents/${agentId}`);
  }

  /**
   * Fetch comments for a task
   */
  async getComments(taskId: string): Promise<Comment[]> {
    return fetchAPI<Comment[]>(`/api/tasks/${taskId}/comments`);
  }

  /**
   * Add a comment to a task
   */
  async addComment(
    taskId: string,
    comment: Partial<Comment>
  ): Promise<Comment> {
    return fetchAPI<Comment>(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify(comment),
    });
  }

  /**
   * Update a comment
   */
  async updateComment(
    commentId: string,
    updates: Partial<Comment>
  ): Promise<Comment> {
    return fetchAPI<Comment>(`/api/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<void> {
    return fetchAPI<void>(`/api/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Fetch activity logs for a board
   */
  async getActivityLogs(
    boardId: string,
    limit?: number
  ): Promise<ActivityLog[]> {
    const query = limit ? `?limit=${limit}` : '';
    return fetchAPI<ActivityLog[]>(
      `/api/boards/${boardId}/activity${query}`
    );
  }

  /**
   * Fetch activity logs for a task
   */
  async getTaskActivityLogs(taskId: string): Promise<ActivityLog[]> {
    return fetchAPI<ActivityLog[]>(`/api/tasks/${taskId}/activity`);
  }
}

/**
 * Singleton API client instance
 */
export const apiClient = new APIClient();

/**
 * Export API client class for testing
 */
export { APIClient };
