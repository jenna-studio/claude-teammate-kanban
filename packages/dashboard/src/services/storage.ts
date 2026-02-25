/**
 * Local Storage Service
 * Handles persistent client-side storage
 */

const STORAGE_PREFIX = 'agent_track_';

/**
 * Storage keys
 */
export const StorageKeys = {
  THEME: `${STORAGE_PREFIX}theme`,
  SIDEBAR_STATE: `${STORAGE_PREFIX}sidebar_state`,
  VIEW_MODE: `${STORAGE_PREFIX}view_mode`,
  LAST_BOARD: `${STORAGE_PREFIX}last_board`,
  FILTERS: `${STORAGE_PREFIX}filters`,
} as const;

/**
 * Get item from localStorage with JSON parsing
 */
export function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error('Failed to get item from localStorage:', error);
    return defaultValue;
  }
}

/**
 * Set item in localStorage with JSON stringification
 */
export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to set item in localStorage:', error);
  }
}

/**
 * Remove item from localStorage
 */
export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove item from localStorage:', error);
  }
}

/**
 * Clear all items from localStorage with our prefix
 */
export function clearAll(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

/**
 * Check if localStorage is available
 */
export function isAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}
