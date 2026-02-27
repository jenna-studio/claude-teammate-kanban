/**
 * AgentList Component
 * Displays list of agents with filtering
 */
import React, { useEffect } from 'react';
import { AgentCard } from './AgentCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAgents } from '@/hooks/useAgents';
import { cn } from '@/utils/cn';

export interface AgentListProps {
  className?: string;
  showOnlyActive?: boolean;
  boardId?: string;
}

/**
 * AgentList displays agents scoped to a board (or all agents if no boardId)
 */
export const AgentList: React.FC<AgentListProps> = ({
  className,
  showOnlyActive = false,
  boardId,
}) => {
  const { agents, activeAgents, loading, error, fetchAgents } = useAgents(boardId);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const statusOrder: Record<string, number> = { active: 0, idle: 1, offline: 2 };
  const displayAgents = (showOnlyActive ? activeAgents : agents)
    .slice()
    .sort((a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3));

  if (loading) {
    return (
      <div className={cn('p-4', className)}>
        <LoadingSpinner message="Loading agents..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('p-4 text-center', className)}>
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  if (displayAgents.length === 0) {
    return (
      <div className={cn('p-4 text-center', className)}>
        <p className="text-muted-foreground text-sm">
          {showOnlyActive ? 'No active agents' : 'No agents available'}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {displayAgents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
};

AgentList.displayName = 'AgentList';
