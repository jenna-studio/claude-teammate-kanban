import type { AgentTask } from '@agent-track/shared';
import { formatDistanceToNow } from 'date-fns';

interface TaskCardProps {
  task: AgentTask;
}

const importanceColors = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
};

export function TaskCard({ task }: TaskCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer">
      {/* Header: Title + Priority */}
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm flex-1 pr-2">{task.title}</h4>
        <div
          className={`w-3 h-3 rounded-full flex-shrink-0 ${importanceColors[task.importance]}`}
          title={`${task.importance} priority`}
        />
      </div>

      {/* Current Action */}
      {task.currentAction && (
        <p className="text-xs text-gray-600 mb-2 italic">
          {task.currentAction}
        </p>
      )}

      {/* Progress Bar */}
      {task.progress !== undefined && task.progress > 0 && (
        <div className="mb-3">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{task.progress}%</p>
        </div>
      )}

      {/* Agent Info */}
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
          />
        </svg>
        <span className="text-xs text-gray-600">{task.agentName}</span>
      </div>

      {/* Files Modified */}
      {task.files && task.files.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span className="text-xs text-gray-600">
            {task.files.length} file{task.files.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Timestamp */}
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-xs text-gray-500">
          {task.startedAt
            ? `Started ${formatDistanceToNow(task.startedAt, { addSuffix: true })}`
            : `Created ${formatDistanceToNow(task.createdAt, { addSuffix: true })}`}
        </span>
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.map(tag => (
            <span
              key={tag}
              className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Lines Changed */}
      {task.linesChanged && (
        <div className="text-xs text-gray-600">
          <span className="text-green-600">+{task.linesChanged.added}</span>
          {' / '}
          <span className="text-red-600">-{task.linesChanged.removed}</span>
        </div>
      )}

      {/* Error Message */}
      {task.errorMessage && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {task.errorMessage}
        </div>
      )}
    </div>
  );
}
