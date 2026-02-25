/**
 * AgentCard Component
 * Displays individual agent information
 */
import React from 'react';
import { Activity } from 'lucide-react';
import { ClaudeIcon } from '@/components/icons/ClaudeIcon';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Agent } from '@/types';
import { formatRelativeTime } from '@/utils/date';
import { getAgentStatusColor } from '@/utils/colors';
import { cn } from '@/utils/cn';

export interface AgentCardProps {
  agent: Agent;
  className?: string;
}

/**
 * AgentCard displays agent status and statistics
 */
export const AgentCard: React.FC<AgentCardProps> = ({ agent, className }) => {
  const statusColors = getAgentStatusColor(agent.status);

  return (
    <Card
      className={cn('hover:shadow-md transition-all hover:-translate-y-0.5 backdrop-blur-sm border-white/60', className)}
      style={{ background: 'linear-gradient(135deg, #FF7BA512, #9B6ED812, #52C4E812)' }}
    >
      <CardContent className="p-4">
        {/* Agent Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full"
            style={{ background: 'linear-gradient(135deg, #FF7BA530, #9B6ED830)' }}
          >
            <ClaudeIcon size={20} color="#9B6ED8" />
          </div>

          {/* Agent Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm truncate">{agent.name}</h4>
              <div
                className={cn('w-2 h-2 rounded-full', statusColors.dot)}
                title={agent.status}
                aria-label={`Status: ${agent.status}`}
              />
            </div>
            <p className="text-xs text-muted-foreground capitalize">
              {agent.type.replace('-', ' ')}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <Badge
          variant="secondary"
          className={cn('mb-3', statusColors.bg, statusColors.text)}
        >
          <Activity className="w-3 h-3 mr-1" />
          {agent.status}
        </Badge>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Tasks</p>
            <p className="font-semibold">{agent.tasksInProgress} active</p>
          </div>
          <div>
            <p className="text-muted-foreground">Completed</p>
            <p className="font-semibold">{agent.tasksCompleted}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Success Rate</p>
            <p className="font-semibold">{agent.successRate.toFixed(0)}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Avg Duration</p>
            <p className="font-semibold">
              {Math.round(agent.averageTaskDuration / 60)}m
            </p>
          </div>
        </div>

        {/* Last Heartbeat */}
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            Last seen {formatRelativeTime(agent.lastHeartbeat)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

AgentCard.displayName = 'AgentCard';
