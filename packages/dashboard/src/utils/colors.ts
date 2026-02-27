/**
 * Color utility functions for task priorities, agent status, etc.
 */
import type { TaskImportance, TaskStatus, AgentStatus, AlertSeverity, BoardColumn } from '@/types';

/**
 * Map a board column to its corresponding task status key.
 * Handles both legacy status-string IDs (e.g. 'todo') and UUID IDs
 * by falling back to a normalised column name lookup.
 */
const STATUS_KEYS: TaskStatus[] = ['todo', 'claimed', 'in_progress', 'review', 'done'];

const NAME_TO_STATUS: Record<string, TaskStatus> = {
  'todo': 'todo',
  'claimed': 'claimed',
  'in progress': 'in_progress',
  'in_progress': 'in_progress',
  'review': 'review',
  'done': 'done',
};

export function columnToStatus(column: BoardColumn): TaskStatus {
  // If column.id is already a valid status key, use it directly
  if ((STATUS_KEYS as string[]).includes(column.id)) {
    return column.id as TaskStatus;
  }
  // Otherwise map from column name
  return NAME_TO_STATUS[column.name.toLowerCase()] || column.id as TaskStatus;
}

/**
 * Get color classes for task importance — cotton candy palette
 */
export function getImportanceColor(importance: TaskImportance): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const colors = {
    critical: {
      bg: 'bg-pink-100',
      text: 'text-pink-700',
      border: 'border-pink-300',
      dot: 'bg-[#FF7BA5]',
    },
    high: {
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      border: 'border-purple-300',
      dot: 'bg-[#9B6ED8]',
    },
    medium: {
      bg: 'bg-sky-100',
      text: 'text-sky-700',
      border: 'border-sky-300',
      dot: 'bg-[#52C4E8]',
    },
    low: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      border: 'border-amber-300',
      dot: 'bg-[#FFD966]',
    },
  };

  return colors[importance];
}

/**
 * Get color classes for task status — cotton candy palette
 */
export function getStatusColor(status: TaskStatus): {
  bg: string;
  text: string;
  border: string;
} {
  const colors = {
    todo: {
      bg: 'bg-pink-100',
      text: 'text-pink-700',
      border: 'border-pink-200',
    },
    claimed: {
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      border: 'border-purple-200',
    },
    in_progress: {
      bg: 'bg-sky-100',
      text: 'text-sky-700',
      border: 'border-sky-200',
    },
    review: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      border: 'border-amber-200',
    },
    done: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
    },
  };

  return colors[status];
}

/**
 * Get color classes for agent status — cotton candy palette
 */
export function getAgentStatusColor(status: AgentStatus): {
  bg: string;
  text: string;
  dot: string;
} {
  const colors = {
    active: {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      dot: 'bg-[#5DD9A0]',
    },
    idle: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-400',
      dot: 'bg-[#FFD966]',
    },
    offline: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-600 dark:text-purple-400',
      dot: 'bg-purple-400',
    },
  };

  return colors[status];
}

/**
 * Get progress bar color based on percentage — cotton candy gradient
 */
export function getProgressColor(progress: number): string {
  if (progress < 25) return 'bg-[#FF7BA5]';
  if (progress < 50) return 'bg-[#9B6ED8]';
  if (progress < 75) return 'bg-[#52C4E8]';
  return 'bg-[#5DD9A0]';
}

/**
 * Get color classes for alert severity — cotton candy palette
 */
export function getAlertSeverityColor(severity: AlertSeverity): {
  bg: string;
  text: string;
  border: string;
  icon: string;
} {
  const colors = {
    error: {
      bg: 'bg-pink-50 dark:bg-pink-900/20',
      text: 'text-pink-700 dark:text-pink-400',
      border: 'border-pink-200 dark:border-pink-800',
      icon: 'text-[#FF7BA5] dark:text-pink-400',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
      icon: 'text-[#FFD966] dark:text-amber-400',
    },
    info: {
      bg: 'bg-sky-50 dark:bg-sky-900/20',
      text: 'text-sky-700 dark:text-sky-400',
      border: 'border-sky-200 dark:border-sky-800',
      icon: 'text-[#52C4E8] dark:text-sky-400',
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
      icon: 'text-[#5DD9A0] dark:text-emerald-400',
    },
  };

  return colors[severity];
}

/**
 * Generate a consistent color from a string (for agent avatars, tags, etc.)
 */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
