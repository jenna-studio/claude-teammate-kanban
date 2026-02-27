/**
 * TaskCard Component
 * Displays individual task information in the kanban board
 */
import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Clock, AlertCircle, FileCode, FilePlus, FileEdit, FileX, FileType, GitCommit } from 'lucide-react';
import { AgentIcon } from '@/components/icons/AgentIcon';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import type { AgentTask } from '@/types';
import { formatRelativeTime } from '@/utils/date';
import { getImportanceColor } from '@/utils/colors';
import { cn } from '@/utils/cn';

export interface TaskCardProps {
  task: AgentTask;
  onClick?: (task: AgentTask) => void;
}

/**
 * TaskCard displays a single task in the kanban board
 * Features:
 * - Drag and drop support
 * - Priority indicator
 * - Progress bar
 * - Agent information
 * - File count
 * - Timestamps
 * - Error states
 */
export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const [copied, setCopied] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: { type: 'task', task },
    });

  const cardStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const importanceColors = getImportanceColor(task.importance);

  const handleClick = () => {
    if (onClick) {
      onClick(task);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={cardStyle}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={cn(
        'cursor-grab active:cursor-grabbing p-5 transition-all shadow-md',
        'hover:shadow-lg hover:-translate-y-0.5',
        'bg-white/80 backdrop-blur-sm border-white/60',
        isDragging && 'opacity-50 shadow-xl',
        'select-none'
      )}
      role="button"
      tabIndex={0}
      aria-label={`Task: ${task.title}`}
    >
      {/* Task ID + Importance Indicator */}
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <span
          className="text-[10px] font-mono text-muted-foreground/60 cursor-pointer hover:text-muted-foreground transition-colors"
          title={copied ? 'Copied!' : `Click to copy: ${task.id}`}
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(task.id);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? 'Copied!' : `#${task.id.replace(/-/g, '').slice(-8)}`}
        </span>
        <div
          className={cn('w-2 h-2 rounded-full flex-shrink-0', importanceColors.dot)}
          title={`${task.importance} priority`}
          aria-label={`${task.importance} priority`}
        />
      </div>

      {/* Title */}
      <h4 className="font-medium text-sm line-clamp-2 mb-2">
        {task.title}
      </h4>

      {/* Current Action (if in progress) */}
      {task.currentAction && (
        <p className="text-xs text-muted-foreground mb-2 italic line-clamp-1">
          {task.currentAction}
        </p>
      )}

      {/* Progress Bar */}
      <div className="mb-3" role="progressbar" aria-valuenow={task.progress ?? 0}>
        <Progress value={task.progress ?? 0} className="h-1" />
        <p className="text-xs text-muted-foreground mt-1">{task.progress ?? 0}%</p>
      </div>

      {/* Agent Info */}
      <div className="flex items-center gap-2 mb-2">
        <AgentIcon agentName={task.agentName} size={12} color="#9B6ED8" />
        <span className="text-xs text-muted-foreground truncate">
          {task.agentName}
        </span>
      </div>

      {/* Code Changes - Files Modified */}
      {task.codeChanges && task.codeChanges.length > 0 ? (
        <div className="mb-2 space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <FileCode className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
            <span className="text-xs font-medium text-muted-foreground">
              {task.codeChanges.length} file{task.codeChanges.length > 1 ? 's' : ''} modified
            </span>
          </div>
          <div className="space-y-0.5 pl-5">
            {task.codeChanges.slice(0, 3).map((change, idx) => {
              const fileName = change.filePath.split('/').pop() || change.filePath;
              const ChangeIcon =
                change.changeType === 'added' ? FilePlus :
                change.changeType === 'deleted' ? FileX :
                change.changeType === 'renamed' ? FileType :
                FileEdit;
              const iconColor =
                change.changeType === 'added' ? 'text-emerald-500' :
                change.changeType === 'deleted' ? 'text-pink-500' :
                change.changeType === 'renamed' ? 'text-blue-500' :
                'text-amber-500';

              return (
                <div key={idx} className="flex items-center gap-1.5 text-xs">
                  <ChangeIcon className={`w-2.5 h-2.5 flex-shrink-0 ${iconColor}`} aria-hidden="true" />
                  <span className="text-muted-foreground truncate font-mono" title={change.filePath}>
                    {fileName}
                  </span>
                  {change.linesAdded !== undefined && change.linesDeleted !== undefined && (
                    <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
                      <span className="text-emerald-500">+{change.linesAdded}</span>
                      {' '}
                      <span className="text-pink-500">-{change.linesDeleted}</span>
                    </span>
                  )}
                </div>
              );
            })}
            {task.codeChanges.length > 3 && (
              <div className="text-xs text-muted-foreground italic">
                +{task.codeChanges.length - 3} more file{task.codeChanges.length - 3 > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      ) : task.files && task.files.length > 0 ? (
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <FileCode className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
            <span className="text-xs font-medium text-muted-foreground">
              {task.files.length} file{task.files.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-0.5 pl-5">
            {task.files.slice(0, 3).map((file, idx) => {
              const fileName = file.split('/').pop() || file;
              return (
                <div key={idx} className="text-xs text-muted-foreground font-mono truncate" title={file}>
                  {fileName}
                </div>
              );
            })}
            {task.files.length > 3 && (
              <div className="text-xs text-muted-foreground italic">
                +{task.files.length - 3} more
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Timestamps */}
      <div className="flex items-center gap-2 mb-1">
        <Clock className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
        <span className="text-xs text-muted-foreground">
          {task.startedAt
            ? `Started ${formatRelativeTime(task.startedAt)}`
            : `Created ${formatRelativeTime(task.createdAt)}`}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-2 pl-5">
        <span className="text-xs text-muted-foreground">
          Updated {formatRelativeTime(task.updatedAt)}
        </span>
      </div>

      {/* Commit Hash + Diff Summary */}
      {(task.commitHash || task.diffSummary || task.linesChanged) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {task.commitHash && (
            <span className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted/60">
              <GitCommit className="w-2.5 h-2.5" aria-hidden="true" />
              {task.commitHash.slice(0, 7)}
            </span>
          )}
          {task.diffSummary ? (
            <span>
              <span className="text-emerald-500">+{task.diffSummary.insertions}</span>
              {' / '}
              <span className="text-pink-500">-{task.diffSummary.deletions}</span>
            </span>
          ) : task.linesChanged ? (
            <span>
              <span className="text-emerald-500">+{task.linesChanged.added}</span>
              {' / '}
              <span className="text-pink-500">-{task.linesChanged.removed}</span>
            </span>
          ) : null}
        </div>
      )}

      {/* Blocked Indicator */}
      {task.blockedBy && task.blockedBy.length > 0 && (
        <div className="flex items-center gap-1 mt-2 text-destructive">
          <AlertCircle className="w-3 h-3" aria-hidden="true" />
          <span className="text-xs">
            Blocked by {task.blockedBy.length} task(s)
          </span>
        </div>
      )}

      {/* Error Message */}
      {task.errorMessage && (
        <div
          className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive"
          role="alert"
        >
          {task.errorMessage}
        </div>
      )}
    </Card>
  );
};

TaskCard.displayName = 'TaskCard';
