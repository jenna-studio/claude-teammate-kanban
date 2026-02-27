/**
 * Settings Store - Manages connection settings with localStorage persistence
 */
import { create } from 'zustand';

const STORAGE_KEY = 'agent-track-settings';

interface ConnectionSettings {
  apiUrl: string;
  wsUrl: string;
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  theme: 'light' | 'dark' | 'system';
}

interface SettingsStore extends ConnectionSettings {
  updateSettings: (settings: Partial<ConnectionSettings>) => void;
  resetToDefaults: () => void;
  toggleTheme: () => void;
  isDarkMode: () => boolean;
}

const defaults: ConnectionSettings = {
  apiUrl: 'http://localhost:3000',
  wsUrl: 'ws://localhost:8080',
  autoReconnect: true,
  maxReconnectAttempts: 10,
  theme: 'system',
};

function loadSettings(): ConnectionSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaults, ...JSON.parse(stored) };
    }
  } catch {
    // ignore parse errors
  }
  return defaults;
}

function saveSettings(settings: ConnectionSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...loadSettings(),

  updateSettings: (partial) => {
    set(partial);
    const { updateSettings: _, resetToDefaults: __, toggleTheme: ___, isDarkMode: ____, ...current } = get();
    saveSettings(current);

    // Apply theme to document
    if (partial.theme !== undefined) {
      applyTheme(partial.theme);
    }
  },

  resetToDefaults: () => {
    set(defaults);
    saveSettings(defaults);
    applyTheme(defaults.theme);
  },

  toggleTheme: () => {
    const current = get().theme;
    const newTheme = current === 'dark' ? 'light' : 'dark';
    set({ theme: newTheme });
    const { updateSettings: _, resetToDefaults: __, toggleTheme: ___, isDarkMode: ____, ...settings } = get();
    saveSettings(settings);
    applyTheme(newTheme);
  },

  isDarkMode: () => {
    const theme = get().theme;
    if (theme === 'system') {
      return getSystemTheme() === 'dark';
    }
    return theme === 'dark';
  },
}));

function applyTheme(theme: 'light' | 'dark' | 'system'): void {
  const isDark = theme === 'dark' || (theme === 'system' && getSystemTheme() === 'dark');

  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

/** Read settings directly from localStorage (for use outside React) */
export function getStoredSettings(): ConnectionSettings {
  return loadSettings();
}
