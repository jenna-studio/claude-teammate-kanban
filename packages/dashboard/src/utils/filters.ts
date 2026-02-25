/**
 * Filter utility functions for tasks
 */
import type { AgentTask, FilterState } from '@/types';

/**
 * Apply all filters to a list of tasks
 */
export function filterTasks(
  tasks: AgentTask[],
  filters: FilterState
): AgentTask[] {
  return tasks.filter((task) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower) ||
        task.agentName.toLowerCase().includes(searchLower) ||
        task.tags?.some((tag) => tag.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;
    }

    // Agent filter
    if (filters.agentIds.length > 0) {
      if (!filters.agentIds.includes(task.agentId)) return false;
    }

    // Importance filter
    if (filters.importance.length > 0) {
      if (!filters.importance.includes(task.importance)) return false;
    }

    // Tags filter
    if (filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some((filterTag) =>
        task.tags?.includes(filterTag)
      );
      if (!hasMatchingTag) return false;
    }

    // Show completed filter
    if (!filters.showCompleted && task.status === 'done') {
      return false;
    }

    return true;
  });
}

/**
 * Get all unique tags from tasks
 */
export function getAllTags(tasks: AgentTask[]): string[] {
  const tagsSet = new Set<string>();

  tasks.forEach((task) => {
    task.tags?.forEach((tag) => tagsSet.add(tag));
  });

  return Array.from(tagsSet).sort();
}

/**
 * Get all unique agent IDs from tasks
 */
export function getAllAgentIds(tasks: AgentTask[]): string[] {
  const agentIds = new Set<string>();

  tasks.forEach((task) => {
    agentIds.add(task.agentId);
  });

  return Array.from(agentIds);
}

/**
 * Sort tasks by a specific field
 */
export function sortTasks(
  tasks: AgentTask[],
  sortBy: 'createdAt' | 'updatedAt' | 'importance' | 'progress',
  order: 'asc' | 'desc' = 'desc'
): AgentTask[] {
  const sorted = [...tasks];

  sorted.sort((a, b) => {
    let aValue: number | string | Date;
    let bValue: number | string | Date;

    switch (sortBy) {
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case 'updatedAt':
        aValue = new Date(a.updatedAt).getTime();
        bValue = new Date(b.updatedAt).getTime();
        break;
      case 'importance':
        const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        aValue = importanceOrder[a.importance];
        bValue = importanceOrder[b.importance];
        break;
      case 'progress':
        aValue = a.progress ?? 0;
        bValue = b.progress ?? 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}

/**
 * Group tasks by status
 */
export function groupTasksByStatus(
  tasks: AgentTask[]
): Record<string, AgentTask[]> {
  return tasks.reduce(
    (groups, task) => {
      const status = task.status;
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(task);
      return groups;
    },
    {} as Record<string, AgentTask[]>
  );
}

/**
 * Group tasks by agent
 */
export function groupTasksByAgent(
  tasks: AgentTask[]
): Record<string, AgentTask[]> {
  return tasks.reduce(
    (groups, task) => {
      const agentId = task.agentId;
      if (!groups[agentId]) {
        groups[agentId] = [];
      }
      groups[agentId].push(task);
      return groups;
    },
    {} as Record<string, AgentTask[]>
  );
}
