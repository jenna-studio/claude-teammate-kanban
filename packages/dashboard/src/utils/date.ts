/**
 * Date utility functions using date-fns
 */
import {
  formatDistanceToNow,
  format,
  formatDuration,
  intervalToDuration,
  isToday,
  isYesterday,
  parseISO,
} from 'date-fns';

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Format a date as human-readable string
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (isToday(dateObj)) {
    return `Today at ${format(dateObj, 'h:mm a')}`;
  }

  if (isYesterday(dateObj)) {
    return `Yesterday at ${format(dateObj, 'h:mm a')}`;
  }

  return format(dateObj, 'MMM d, yyyy at h:mm a');
}

/**
 * Format a date for display in the UI
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM d, yyyy h:mm a');
}

/**
 * Format a duration in seconds to human-readable string
 */
export function formatDurationSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Calculate duration between two dates
 */
export function calculateDuration(
  start: Date | string,
  end: Date | string
): string {
  const startDate = typeof start === 'string' ? parseISO(start) : start;
  const endDate = typeof end === 'string' ? parseISO(end) : end;

  const duration = intervalToDuration({ start: startDate, end: endDate });

  return formatDuration(duration, {
    format: ['days', 'hours', 'minutes'],
    zero: false,
    delimiter: ', ',
  });
}

/**
 * Get short date string (e.g., "Jan 15")
 */
export function formatShortDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM d');
}

/**
 * Get time string (e.g., "2:30 PM")
 */
export function formatTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'h:mm a');
}

/**
 * Check if a date is recent (within last 5 minutes)
 */
export function isRecent(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diff = now.getTime() - dateObj.getTime();
  return diff < 5 * 60 * 1000; // 5 minutes in milliseconds
}
