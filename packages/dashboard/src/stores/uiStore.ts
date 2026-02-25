/**
 * UI Store - Manages UI state (filters, modals, sidebar, etc.) using Zustand
 */
import { create } from 'zustand';
import type { FilterState, TaskImportance } from '@/types';

interface UIStore {
  /** Sidebar visibility */
  sidebarOpen: boolean;

  /** Task detail modal visibility */
  taskModalOpen: boolean;

  /** Settings modal visibility */
  settingsModalOpen: boolean;

  /** Filter state */
  filters: FilterState;

  /** View mode */
  viewMode: 'kanban' | 'list' | 'timeline';

  /** Theme */
  theme: 'light' | 'dark' | 'system';

  // Actions
  /** Toggle sidebar */
  toggleSidebar: () => void;

  /** Set sidebar state */
  setSidebarOpen: (open: boolean) => void;

  /** Open task modal */
  openTaskModal: () => void;

  /** Close task modal */
  closeTaskModal: () => void;

  /** Open settings modal */
  openSettingsModal: () => void;

  /** Close settings modal */
  closeSettingsModal: () => void;

  /** Set search filter */
  setSearchFilter: (search: string) => void;

  /** Set agent filter */
  setAgentFilter: (agentIds: string[]) => void;

  /** Set importance filter */
  setImportanceFilter: (importance: TaskImportance[]) => void;

  /** Set tags filter */
  setTagsFilter: (tags: string[]) => void;

  /** Toggle show completed */
  toggleShowCompleted: () => void;

  /** Clear all filters */
  clearFilters: () => void;

  /** Set view mode */
  setViewMode: (mode: 'kanban' | 'list' | 'timeline') => void;

  /** Set theme */
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

const defaultFilters: FilterState = {
  search: '',
  agentIds: [],
  importance: [],
  tags: [],
  showCompleted: true,
};

/**
 * UI store managing application UI state and preferences
 */
export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  taskModalOpen: false,
  settingsModalOpen: false,
  filters: defaultFilters,
  viewMode: 'kanban',
  theme: 'system',

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setSidebarOpen: (open) => {
    set({ sidebarOpen: open });
  },

  openTaskModal: () => {
    set({ taskModalOpen: true });
  },

  closeTaskModal: () => {
    set({ taskModalOpen: false });
  },

  openSettingsModal: () => {
    set({ settingsModalOpen: true });
  },

  closeSettingsModal: () => {
    set({ settingsModalOpen: false });
  },

  setSearchFilter: (search) => {
    set((state) => ({
      filters: { ...state.filters, search },
    }));
  },

  setAgentFilter: (agentIds) => {
    set((state) => ({
      filters: { ...state.filters, agentIds },
    }));
  },

  setImportanceFilter: (importance) => {
    set((state) => ({
      filters: { ...state.filters, importance },
    }));
  },

  setTagsFilter: (tags) => {
    set((state) => ({
      filters: { ...state.filters, tags },
    }));
  },

  toggleShowCompleted: () => {
    set((state) => ({
      filters: { ...state.filters, showCompleted: !state.filters.showCompleted },
    }));
  },

  clearFilters: () => {
    set({ filters: defaultFilters });
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  setTheme: (theme) => {
    set({ theme });
  },
}));
