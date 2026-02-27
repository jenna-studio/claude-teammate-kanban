/**
 * useAgents Hook
 * Manages agent data and operations
 */
import { useCallback } from 'react';
import { useAgentStore } from '@/stores/agentStore';
import { apiClient } from '@/services/api';

/**
 * Hook for managing agents
 * @param boardId - Optional board ID to scope agents to a specific board
 */
export function useAgents(boardId?: string) {
  const {
    agents,
    loading,
    error,
    setAgents,
    getAgent,
    getActiveAgents,
    setLoading,
    setError,
  } = useAgentStore();

  /**
   * Fetch agents — scoped to board when boardId is provided
   */
  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const fetchedAgents = boardId
        ? await apiClient.getBoardAgents(boardId)
        : await apiClient.getAgents();
      setAgents(fetchedAgents);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch agents';
      setError(errorMessage);
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoading(false);
    }
  }, [boardId, setAgents, setLoading, setError]);

  /**
   * Fetch a specific agent
   */
  const fetchAgent = useCallback(
    async (agentId: string) => {
      setLoading(true);
      setError(null);

      try {
        const agent = await apiClient.getAgent(agentId);
        return agent;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch agent';
        setError(errorMessage);
        console.error('Failed to fetch agent:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError]
  );

  const activeAgents = getActiveAgents();

  return {
    agents,
    activeAgents,
    loading,
    error,
    fetchAgents,
    fetchAgent,
    getAgent,
  };
}
