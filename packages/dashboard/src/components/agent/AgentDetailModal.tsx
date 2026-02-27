/**
 * AgentDetailModal Component
 * Displays detailed information about an agent
 */
import React, { useEffect, useState } from 'react';
import { Clock, Zap, Activity } from 'lucide-react';
import { AgentIcon } from '@/components/icons/AgentIcon';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAgentStore } from '@/stores/agentStore';
import { useBoardStore } from '@/stores/boardStore';
import { useUIStore } from '@/stores/uiStore';
import { useTaskStore } from '@/stores/taskStore';
import { apiClient } from '@/services/api';
import { formatRelativeTime, formatDurationSeconds } from '@/utils/date';
import { getAgentStatusColor, getStatusColor } from '@/utils/colors';
import { cn } from '@/utils/cn';
import type { AgentTask } from '@/types';

interface AgentStatistics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  inProgressTasks: number;
  averageDuration: number;
  totalTokensUsed: number;
}

export const AgentDetailModal: React.FC = () => {
  const { getAgent } = useAgentStore();
  const { currentBoardId } = useBoardStore();
  const { agentModalOpen, closeAgentModal, selectedAgentId } = useUIStore();
  const { selectTask } = useTaskStore();
  const { openTaskModal } = useUIStore();

  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([]);
  const [statistics, setStatistics] = useState<AgentStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
  const [showAllTasks, setShowAllTasks] = useState(false);

  const agent = selectedAgentId ? getAgent(selectedAgentId) : undefined;

  useEffect(() => {
    if (agentModalOpen && selectedAgentId) {
      setLoading(true);
      Promise.all([
        apiClient.getAgentTasks(selectedAgentId, currentBoardId || undefined),
        apiClient.getAgentStatistics(selectedAgentId),
      ])
        .then(([tasks, stats]) => {
          setAgentTasks(tasks);
          setStatistics(stats);
        })
        .catch((err) => {
          console.error('Failed to fetch agent details:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [agentModalOpen, selectedAgentId]);

  if (!agent) return null;

  const statusColors = getAgentStatusColor(agent.status);

  const statusAccents: Record<string, string> = {
    active: '#5DD9A0',
    idle: '#FFD966',
    offline: '#9B6ED8',
  };
  const overlayAccent = statusAccents[agent.status] || '#9B6ED8';

  const handleTaskClick = (task: AgentTask) => {
    closeAgentModal();
    selectTask(task.id);
    openTaskModal();
  };

  return (
    <Dialog open={agentModalOpen} onOpenChange={closeAgentModal}>
      <DialogContent
        className="max-w-4xl w-[calc(100vw-3rem)] max-h-[90vh] overflow-y-auto overflow-x-hidden p-12"
        overlayStyle={{ backgroundColor: `${overlayAccent}18`, backdropFilter: 'blur(8px)' }}
      >
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="flex items-center justify-center w-14 h-14 rounded-full"
                style={{ background: 'linear-gradient(135deg, #FF7BA530, #9B6ED830)' }}
              >
                <AgentIcon agentName={agent.name} size={28} color="#9B6ED8" />
              </div>
              <div>
                <DialogTitle className="text-2xl mb-1">{agent.name}</DialogTitle>
                <DialogDescription className="capitalize">
                  {agent.type.replace(/-/g, ' ')}
                </DialogDescription>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge className={cn('text-sm px-3 py-1', statusColors.bg, statusColors.text)}>
                <div className={cn('w-2.5 h-2.5 rounded-full mr-2', statusColors.dot)} />
                {agent.status}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
            <span className="text-sm text-muted-foreground">Loading details...</span>
          </div>
        )}

        <div className="space-y-6 mt-6 min-w-0">
          {/* Agent Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <h4 className="font-semibold text-sm">Status</h4>
              </div>
              <p className="text-sm capitalize">{agent.status}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Last seen {formatRelativeTime(agent.lastHeartbeat)}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <h4 className="font-semibold text-sm">Concurrency</h4>
              </div>
              <p className="text-sm">Max {agent.maxConcurrentTasks} concurrent tasks</p>
              {agent.currentSessionId && (
                <p className="text-xs text-muted-foreground mt-1 font-mono truncate" title={agent.currentSessionId}>
                  Session: {agent.currentSessionId}
                </p>
              )}
            </div>
          </div>

          {/* Capabilities */}
          {agent.capabilities && agent.capabilities.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Capabilities</h4>
              <div className="flex flex-wrap gap-2">
                {agent.capabilities.map((cap) => (
                  <Badge
                    key={cap}
                    variant="secondary"
                    className="text-xs"
                    style={{ background: 'linear-gradient(135deg, #FF7BA530, #9B6ED830, #52C4E830)' }}
                  >
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Statistics */}
          {statistics && (
            <div>
              <h4 className="font-semibold mb-3">Statistics</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg p-3" style={{ backgroundColor: '#52C4E825' }}>
                  <p className="text-xs text-muted-foreground">Total Tasks</p>
                  <p className="text-xl font-bold" style={{ color: '#52C4E8' }}>
                    {statistics.totalTasks}
                  </p>
                </div>
                <div className="rounded-lg p-3" style={{ backgroundColor: '#5DD9A025' }}>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-xl font-bold" style={{ color: '#5DD9A0' }}>
                    {statistics.completedTasks}
                  </p>
                </div>
                <div className="rounded-lg p-3" style={{ backgroundColor: '#9B6ED825' }}>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                  <p className="text-xl font-bold" style={{ color: '#9B6ED8' }}>
                    {statistics.inProgressTasks}
                  </p>
                </div>
                <div className="rounded-lg p-3" style={{ backgroundColor: '#FF7BA525' }}>
                  <p className="text-xs text-muted-foreground">Failed</p>
                  <p className="text-xl font-bold" style={{ color: '#FF7BA5' }}>
                    {statistics.failedTasks}
                  </p>
                </div>
                <div className="rounded-lg p-3" style={{ backgroundColor: '#FFD96625' }}>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                  <p className="text-xl font-bold" style={{ color: '#b8860b' }}>
                    {statistics.totalTasks > 0
                      ? Math.round(((statistics.completedTasks - statistics.failedTasks) / Math.max(statistics.completedTasks, 1)) * 100)
                      : 100}%
                  </p>
                </div>
                <div className="rounded-lg p-3" style={{ backgroundColor: '#52C4E825' }}>
                  <p className="text-xs text-muted-foreground">Avg Duration</p>
                  <p className="text-xl font-bold" style={{ color: '#52C4E8' }}>
                    {statistics.averageDuration > 0
                      ? formatDurationSeconds(statistics.averageDuration)
                      : '—'}
                  </p>
                </div>
              </div>
              {statistics.totalTokensUsed > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Total tokens used: {statistics.totalTokensUsed.toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Recent Tasks */}
          {agentTasks.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">
                Recent Tasks ({agentTasks.length})
              </h4>
              <div className="space-y-2">
                {(showAllTasks ? agentTasks : agentTasks.slice(0, 10)).map((task) => {
                  const taskStatusColors = getStatusColor(task.status);
                  return (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer min-w-0"
                      onClick={() => handleTaskClick(task)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleTaskClick(task);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium break-words">{task.title}</p>
                          {task.currentAction && (
                            <p className="text-xs text-muted-foreground italic break-words mt-0.5">
                              {task.currentAction}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                          <span
                            className="text-[10px] font-mono text-muted-foreground/60 cursor-pointer hover:text-muted-foreground transition-colors"
                            style={{ color: copiedTaskId === task.id ? '#ff69b4' : undefined }}
                            title={`Click to copy: ${task.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(task.id);
                              setCopiedTaskId(task.id);
                              setTimeout(() => setCopiedTaskId(null), 1500);
                            }}
                          >
                            {copiedTaskId === task.id ? 'Copied!' : `#${task.id.replace(/-/g, '').slice(-8)}`}
                          </span>
                          <Badge className={cn('text-xs', taskStatusColors.bg, taskStatusColors.text)}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                          {task.progress !== undefined && (
                            <div className="w-16">
                              <Progress value={task.progress} className="h-1" />
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatRelativeTime(task.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {agentTasks.length > 10 && (
                  <p
                    className="text-xs text-muted-foreground text-center py-1 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => setShowAllTasks(!showAllTasks)}
                  >
                    {showAllTasks ? 'Show less' : `+${agentTasks.length - 10} more tasks`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Empty state for tasks */}
          {!loading && agentTasks.length === 0 && (
            <div className="text-center py-6">
              <Clock className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No tasks recorded for this agent</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

AgentDetailModal.displayName = 'AgentDetailModal';
