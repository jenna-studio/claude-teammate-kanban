/**
 * KanbanColumn Component
 * Represents a single column in the kanban board
 */
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { TaskCard } from './TaskCard';
import type { BoardColumn, AgentTask } from '@/types';
import { cn } from '@/utils/cn';

export interface KanbanColumnProps {
  column: BoardColumn;
  tasks: AgentTask[];
  onTaskClick?: (task: AgentTask) => void;
}

/**
 * KanbanColumn displays a droppable column with tasks
 * Features:
 * - Drop zone for tasks
 * - WIP limit warnings
 * - Task count
 * - Scrollable task list
 */
export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  onTaskClick,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', column },
  });

  const wipLimitReached = column.wipLimit && tasks.length >= column.wipLimit;
  const wipLimitWarning = column.wipLimit && tasks.length >= column.wipLimit * 0.8;

  const columnColors: Record<string, { header: string; accent: string }> = {
      todo: { header: "#F7D1DE", accent: "#FF599E" },
      claimed: { header: "#EFD9FD", accent: "#9B6ED8" },
      in_progress: { header: "#CDF4FE", accent: "#00B9E9" },
      review: { header: "#FFFBD0", accent: "#F7BD00" },
      done: { header: "#D3FDE4", accent: "#00C148" },
  };

  const palette = columnColors[column.id] || { header: '#9B6ED820', accent: '#9B6ED8' };

  return (
    <div
      className={cn(
        'flex flex-col min-w-[280px] flex-1 rounded-xl',
        'backdrop-blur-sm',
        isOver && 'ring-2 ring-primary shadow-lg',
        wipLimitReached && 'ring-2 ring-destructive'
      )}
      style={{
        boxShadow: `0 2px 12px ${palette.accent}18`,
        backgroundColor: `${palette.header}30`,
        border: `1px solid ${palette.accent}25`,
        '--column-accent': palette.accent,
      } as React.CSSProperties}
    >
      {/* Column Header */}
      <div
        className={cn(
          'p-4 rounded-t-xl',
          wipLimitReached && 'bg-red-50'
        )}
        style={{
          backgroundColor: wipLimitReached ? undefined : palette.header,
          borderBottom: `2px solid ${palette.accent}`,
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{column.name}</h3>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-medium px-2 py-0.5 rounded-full',
                wipLimitReached && 'text-destructive font-semibold'
              )}
              style={{
                backgroundColor: `${palette.accent}25`,
                color: wipLimitReached ? undefined : palette.accent,
              }}
            >
              {tasks.length}
              {column.wipLimit && ` / ${column.wipLimit}`}
            </span>
          </div>
        </div>
        {wipLimitReached && (
          <p className="text-xs text-destructive mt-1 font-medium">
            WIP limit reached!
          </p>
        )}
        {wipLimitWarning && !wipLimitReached && (
          <p className="text-xs mt-1" style={{ color: palette.accent }}>
            Approaching WIP limit
          </p>
        )}
      </div>

      {/* Tasks Container - Droppable Area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 overflow-y-auto p-4 space-y-3 column-scrollbar',
          'min-h-[200px] rounded-b-xl',
          isOver && 'bg-primary/5'
        )}
        role="list"
        aria-label={`${column.name} tasks`}
      >
        {tasks.length === 0 && (
          <div
            className="text-center text-muted-foreground py-8"
            role="status"
          >
            <p className="text-sm">No tasks</p>
            {isOver && (
              <p className="text-xs mt-2">Drop task here</p>
            )}
          </div>
        )}

        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={onTaskClick} />
        ))}
      </div>
    </div>
  );
};

KanbanColumn.displayName = 'KanbanColumn';
