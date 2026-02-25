/**
 * useAgents Hook
 * Manages agent data and operations
 */
import { useCallback } from 'react';
import { useAgentStore } from '@/stores/agentStore';
import { apiClient } from '@/services/api';

/**
 * Hook for managing agents
 */
export function useAgents() {
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
   * Fetch all agents
   */
  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const fetchedAgents = await apiClient.getAgents();
      setAgents(fetchedAgents);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch agents';
      setError(errorMessage);
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoading(false);
    }
  }, [setAgents, setLoading, setError]);

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
