/**
 * Color utility functions for task priorities, agent status, etc.
 */
import type { TaskImportance, TaskStatus, AgentStatus } from '@/types';

/**
 * Get color classes for task importance
 */
export function getImportanceColor(importance: TaskImportance): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const colors = {
    critical: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-300',
      dot: 'bg-red-500',
    },
    high: {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      border: 'border-orange-300',
      dot: 'bg-orange-500',
    },
    medium: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      border: 'border-yellow-300',
      dot: 'bg-yellow-500',
    },
    low: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-300',
      dot: 'bg-blue-500',
    },
  };

  return colors[importance];
}

/**
 * Get color classes for task status
 */
export function getStatusColor(status: TaskStatus): {
  bg: string;
  text: string;
  border: string;
} {
  const colors = {
    todo: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-300',
    },
    claimed: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-300',
    },
    in_progress: {
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      border: 'border-purple-300',
    },
    review: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      border: 'border-yellow-300',
    },
    done: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-300',
    },
  };

  return colors[status];
}

/**
 * Get color classes for agent status
 */
export function getAgentStatusColor(status: AgentStatus): {
  bg: string;
  text: string;
  dot: string;
} {
  const colors = {
    active: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      dot: 'bg-green-500',
    },
    idle: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      dot: 'bg-yellow-500',
    },
    offline: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      dot: 'bg-gray-500',
    },
  };

  return colors[status];
}

/**
 * Get progress bar color based on percentage
 */
export function getProgressColor(progress: number): string {
  if (progress < 25) return 'bg-red-500';
  if (progress < 50) return 'bg-orange-500';
  if (progress < 75) return 'bg-yellow-500';
  return 'bg-green-500';
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
