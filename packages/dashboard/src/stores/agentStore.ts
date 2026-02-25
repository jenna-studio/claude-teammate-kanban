/**
 * Agent Store - Manages agent state using Zustand
 */
import { create } from 'zustand';
import type { Agent, AgentStatus } from '@/types';

interface AgentStore {
  /** All agents */
  agents: Agent[];

  /** Loading state */
  loading: boolean;

  /** Error state */
  error: string | null;

  // Actions
  /** Set all agents */
  setAgents: (agents: Agent[]) => void;

  /** Add an agent */
  addAgent: (agent: Agent) => void;

  /** Update an agent */
  updateAgent: (agent: Agent) => void;

  /** Remove an agent */
  removeAgent: (agentId: string) => void;

  /** Update agent status */
  updateAgentStatus: (agentId: string, status: AgentStatus) => void;

  /** Get agent by ID */
  getAgent: (agentId: string) => Agent | undefined;

  /** Get active agents */
  getActiveAgents: () => Agent[];

  /** Get agents by board */
  getAgentsByBoard: (boardId: string) => Agent[];

  /** Update agent heartbeat */
  updateHeartbeat: (agentId: string) => void;

  /** Set loading state */
  setLoading: (loading: boolean) => void;

  /** Set error state */
  setError: (error: string | null) => void;
}

/**
 * Agent store managing AI agent state and monitoring
 */
export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],
  loading: false,
  error: null,

  setAgents: (agents) => {
    set({ agents, error: null });
  },

  addAgent: (agent) => {
    set((state) => ({
      agents: [...state.agents, agent],
      error: null,
    }));
  },

  updateAgent: (updatedAgent) => {
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === updatedAgent.id ? updatedAgent : agent
      ),
      error: null,
    }));
  },

  removeAgent: (agentId) => {
    set((state) => ({
      agents: state.agents.filter((agent) => agent.id !== agentId),
      error: null,
    }));
  },

  updateAgentStatus: (agentId, status) => {
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === agentId
          ? { ...agent, status, lastHeartbeat: new Date() }
          : agent
      ),
      error: null,
    }));
  },

  getAgent: (agentId) => {
    return get().agents.find((agent) => agent.id === agentId);
  },

  getActiveAgents: () => {
    return get().agents.filter((agent) => agent.status === 'active');
  },

  getAgentsByBoard: (_boardId) => {
    // Note: This would need board information in agent data
    // For now, return all agents
    return get().agents;
  },

  updateHeartbeat: (agentId) => {
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === agentId
          ? { ...agent, lastHeartbeat: new Date() }
          : agent
      ),
    }));
  },

  setLoading: (loading) => {
    set({ loading });
  },

  setError: (error) => {
    set({ error });
  },
}));
