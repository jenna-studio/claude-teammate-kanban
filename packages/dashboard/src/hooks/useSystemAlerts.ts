/**
 * useSystemAlerts Hook
 * Monitors connection events and generates system alerts
 */
import { useEffect, useRef } from 'react';
import { wsClient, ConnectionState } from '@/services/websocket';
import { onApiError } from '@/services/api';
import { useAlertStore } from '@/stores/alertStore';

export function useSystemAlerts(): void {
  const addAlert = useAlertStore((s) => s.addAlert);
  const prevStateRef = useRef<ConnectionState>(wsClient.getState());

  // WebSocket connection state alerts
  useEffect(() => {
    const unsubscribe = wsClient.onStateChange((state: ConnectionState) => {
      const prevState = prevStateRef.current;
      prevStateRef.current = state;

      if (prevState === state) return;

      switch (state) {
        case ConnectionState.CONNECTED:
          // Only alert on restoration, not initial connect
          if (
            prevState === ConnectionState.RECONNECTING ||
            prevState === ConnectionState.DISCONNECTED ||
            prevState === ConnectionState.ERROR
          ) {
            addAlert({
              severity: 'success',
              source: 'websocket',
              title: 'Connection Restored',
              message: 'Real-time connection to the server has been re-established.',
            });
          }
          break;

        case ConnectionState.DISCONNECTED:
          if (prevState === ConnectionState.CONNECTED) {
            addAlert({
              severity: 'error',
              source: 'websocket',
              title: 'Connection Lost',
              message: 'Lost connection to the real-time server.',
            });
          }
          break;

        case ConnectionState.RECONNECTING:
          addAlert({
            severity: 'warning',
            source: 'websocket',
            title: 'Reconnecting',
            message: 'Attempting to reconnect to the server...',
          });
          break;

        case ConnectionState.ERROR:
          addAlert({
            severity: 'error',
            source: 'websocket',
            title: 'Connection Error',
            message: 'A WebSocket connection error occurred.',
          });
          break;
      }
    });

    return unsubscribe;
  }, [addAlert]);

  // API error alerts
  useEffect(() => {
    const unsubscribe = onApiError((error: Error, endpoint: string) => {
      addAlert({
        severity: 'error',
        source: 'api',
        title: 'API Error',
        message: `${endpoint}: ${error.message}`,
      });
    });

    return unsubscribe;
  }, [addAlert]);
}
