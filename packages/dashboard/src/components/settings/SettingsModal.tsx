/**
 * SettingsModal - Connection settings configuration
 */
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RotateCcw, Save, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { cn } from '@/utils/cn';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export const SettingsModal: React.FC = () => {
  const { settingsModalOpen, closeSettingsModal } = useUIStore();
  const settings = useSettingsStore();

  const [apiUrl, setApiUrl] = useState(settings.apiUrl);
  const [wsUrl, setWsUrl] = useState(settings.wsUrl);
  const [autoReconnect, setAutoReconnect] = useState(settings.autoReconnect);
  const [maxAttempts, setMaxAttempts] = useState(settings.maxReconnectAttempts);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Sync local state when modal opens
  useEffect(() => {
    if (settingsModalOpen) {
      setApiUrl(settings.apiUrl);
      setWsUrl(settings.wsUrl);
      setAutoReconnect(settings.autoReconnect);
      setMaxAttempts(settings.maxReconnectAttempts);
      setTestStatus('idle');
      setTestMessage('');
    }
  }, [settingsModalOpen, settings.apiUrl, settings.wsUrl, settings.autoReconnect, settings.maxReconnectAttempts]);

  const hasChanges =
    apiUrl !== settings.apiUrl ||
    wsUrl !== settings.wsUrl ||
    autoReconnect !== settings.autoReconnect ||
    maxAttempts !== settings.maxReconnectAttempts;

  async function handleTestConnection() {
    setTestStatus('testing');
    setTestMessage('');
    try {
      const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        setTestStatus('success');
        setTestMessage('Connected successfully');
      } else {
        setTestStatus('error');
        setTestMessage(`Server returned ${res.status}`);
      }
    } catch {
      setTestStatus('error');
      setTestMessage('Cannot reach server');
    }
  }

  function handleSave() {
    settings.updateSettings({ apiUrl, wsUrl, autoReconnect, maxReconnectAttempts: maxAttempts });
    closeSettingsModal();
    window.location.reload();
  }

  function handleReset() {
    settings.resetToDefaults();
    setApiUrl('http://localhost:3000');
    setWsUrl('ws://localhost:8080');
    setAutoReconnect(true);
    setMaxAttempts(10);
    setTestStatus('idle');
    setTestMessage('');
  }

  return (
    <Dialog open={settingsModalOpen} onOpenChange={closeSettingsModal}>
      <DialogContent className="sm:max-w-md shadow-2xl">
        <DialogHeader>
          <DialogTitle style={{ color: '#9B6ED8' }}>Connection Settings</DialogTitle>
          <DialogDescription>Configure how the dashboard connects to the API server.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* API Server URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="api-url">
              API Server URL
            </label>
            <input
              id="api-url"
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              placeholder="http://localhost:3000"
            />
          </div>

          {/* WebSocket URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="ws-url">
              WebSocket URL
            </label>
            <input
              id="ws-url"
              type="url"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              placeholder="ws://localhost:8080"
            />
          </div>

          {/* Auto Reconnect */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground" htmlFor="auto-reconnect">
              Auto-reconnect
            </label>
            <button
              id="auto-reconnect"
              role="switch"
              aria-checked={autoReconnect}
              onClick={() => setAutoReconnect(!autoReconnect)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                autoReconnect ? 'bg-gradient-to-r from-pink-400 to-purple-400' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
                  autoReconnect ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Max Reconnect Attempts */}
          {autoReconnect && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="max-attempts">
                Max reconnect attempts
              </label>
              <input
                id="max-attempts"
                type="number"
                min={1}
                max={50}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
          )}

          {/* Test Connection */}
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className="w-full"
            >
              {testStatus === 'testing' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : testStatus === 'success' ? (
                <Wifi className="mr-2 h-4 w-4 text-emerald-500" />
              ) : testStatus === 'error' ? (
                <WifiOff className="mr-2 h-4 w-4 text-pink-500" />
              ) : (
                <Wifi className="mr-2 h-4 w-4" />
              )}
              Test Connection
            </Button>
            {testMessage && (
              <p className={cn(
                'text-xs text-center',
                testStatus === 'success' ? 'text-emerald-600' : 'text-pink-600'
              )}>
                {testMessage}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges}
            className="text-white"
            style={{
              background: hasChanges
                ? 'linear-gradient(135deg, #FF7BA5 0%, #9B6ED8 100%)'
                : undefined,
            }}
          >
            <Save className="mr-2 h-4 w-4" />
            Save & Reload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

SettingsModal.displayName = 'SettingsModal';
