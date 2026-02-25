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
}

interface SettingsStore extends ConnectionSettings {
  updateSettings: (settings: Partial<ConnectionSettings>) => void;
  resetToDefaults: () => void;
}

const defaults: ConnectionSettings = {
  apiUrl: 'http://localhost:3000',
  wsUrl: 'ws://localhost:8080',
  autoReconnect: true,
  maxReconnectAttempts: 10,
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

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...loadSettings(),

  updateSettings: (partial) => {
    set(partial);
    const { updateSettings: _, resetToDefaults: __, ...current } = get();
    saveSettings(current);
  },

  resetToDefaults: () => {
    set(defaults);
    saveSettings(defaults);
  },
}));

/** Read settings directly from localStorage (for use outside React) */
export function getStoredSettings(): ConnectionSettings {
  return loadSettings();
}
