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

  return (
    <div
      className={cn(
        'flex flex-col w-80 flex-shrink-0 rounded-lg',
        'bg-muted/30',
        isOver && 'ring-2 ring-primary',
        wipLimitReached && 'ring-2 ring-destructive'
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          'p-4 border-b',
          'bg-muted/50 rounded-t-lg',
          wipLimitWarning && 'bg-yellow-50',
          wipLimitReached && 'bg-red-50'
        )}
        style={{
          backgroundColor: column.color
            ? `${column.color}20`
            : undefined,
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{column.name}</h3>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm text-muted-foreground',
                wipLimitWarning && 'text-yellow-700 font-medium',
                wipLimitReached && 'text-destructive font-semibold'
              )}
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
          <p className="text-xs text-yellow-700 mt-1">
            Approaching WIP limit
          </p>
        )}
      </div>

      {/* Tasks Container - Droppable Area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 overflow-y-auto p-4 space-y-3',
          'min-h-[200px]',
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
