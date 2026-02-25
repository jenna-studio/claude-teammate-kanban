/**
 * Alert Store - Manages system alert notifications using Zustand
 */
import { create } from 'zustand';
import type { SystemAlert } from '@/types';

const MAX_ALERTS = 50;

interface AlertStore {
  alerts: SystemAlert[];
  unreadCount: number;
  dropdownOpen: boolean;

  addAlert: (alert: Omit<SystemAlert, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (alertId: string) => void;
  markAllAsRead: () => void;
  clearAlerts: () => void;
  openDropdown: () => void;
  closeDropdown: () => void;
  toggleDropdown: () => void;
}

let alertIdCounter = 0;

export const useAlertStore = create<AlertStore>((set) => ({
  alerts: [],
  unreadCount: 0,
  dropdownOpen: false,

  addAlert: (alertData) => {
    const newAlert: SystemAlert = {
      ...alertData,
      id: `alert-${Date.now()}-${++alertIdCounter}`,
      timestamp: new Date(),
      read: false,
    };

    set((state) => {
      const updatedAlerts = [newAlert, ...state.alerts].slice(0, MAX_ALERTS);
      return {
        alerts: updatedAlerts,
        unreadCount: updatedAlerts.filter((a) => !a.read).length,
      };
    });
  },

  markAsRead: (alertId) => {
    set((state) => {
      const updatedAlerts = state.alerts.map((a) =>
        a.id === alertId ? { ...a, read: true } : a
      );
      return {
        alerts: updatedAlerts,
        unreadCount: updatedAlerts.filter((a) => !a.read).length,
      };
    });
  },

  markAllAsRead: () => {
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, read: true })),
      unreadCount: 0,
    }));
  },

  clearAlerts: () => {
    set({ alerts: [], unreadCount: 0 });
  },

  openDropdown: () => {
    set({ dropdownOpen: true });
  },

  closeDropdown: () => {
    set({ dropdownOpen: false });
  },

  toggleDropdown: () => {
    set((state) => ({ dropdownOpen: !state.dropdownOpen }));
  },
}));
