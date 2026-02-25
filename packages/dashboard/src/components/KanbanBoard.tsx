import type { BoardColumn, AgentTask, Agent } from '@agent-track/shared';
import { TaskCard } from './TaskCard';

interface KanbanBoardProps {
  columns: BoardColumn[];
  tasks: AgentTask[];
  agents: Agent[];
}

export function KanbanBoard({ columns, tasks }: KanbanBoardProps) {
  // Group tasks by status
  const tasksByStatus = tasks.reduce((acc, task) => {
    if (!acc[task.status]) {
      acc[task.status] = [];
    }
    acc[task.status].push(task);
    return acc;
  }, {} as Record<string, AgentTask[]>);

  return (
    <div className="flex gap-6 p-6 h-full overflow-x-auto">
      {columns.map(column => {
        const columnTasks = tasksByStatus[column.id] || [];

        return (
          <div key={column.id} className="flex-shrink-0 w-80 flex flex-col">
            {/* Column Header */}
            <div
              className="p-4 rounded-t-lg border-b-2"
              style={{
                backgroundColor: column.color ? `${column.color}20` : '#f3f4f6',
                borderColor: column.color || '#d1d5db',
              }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{column.name}</h3>
                <span className="text-sm text-gray-600">
                  {columnTasks.length}
                  {column.wipLimit && ` / ${column.wipLimit}`}
                </span>
              </div>
              {column.wipLimit && columnTasks.length >= column.wipLimit && (
                <p className="text-xs text-red-600 mt-1">WIP limit reached!</p>
              )}
            </div>

            {/* Tasks */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-3 rounded-b-lg">
              {columnTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}

              {columnTasks.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  No tasks
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
