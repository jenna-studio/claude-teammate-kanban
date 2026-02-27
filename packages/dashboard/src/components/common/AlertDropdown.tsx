/**
 * AlertDropdown Component
 * Notification dropdown panel for system alerts
 */
import React, { useRef, useEffect } from 'react';
import {
  Bell,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Trash2,
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAlertStore } from '@/stores/alertStore';
import { getAlertSeverityColor } from '@/utils/colors';
import { formatRelativeTime } from '@/utils/date';
import { cn } from '@/utils/cn';
import type { SystemAlert, AlertSeverity } from '@/types';

function getSeverityIcon(severity: AlertSeverity) {
  switch (severity) {
    case 'error':
      return AlertCircle;
    case 'warning':
      return AlertTriangle;
    case 'info':
      return Info;
    case 'success':
      return CheckCircle2;
  }
}

const AlertItem: React.FC<{
  alert: SystemAlert;
  onMarkAsRead: (id: string) => void;
}> = ({ alert, onMarkAsRead }) => {
  const colors = getAlertSeverityColor(alert.severity);
  const SeverityIcon = getSeverityIcon(alert.severity);

  return (
    <div
      className={cn(
        'px-4 py-3 border-b border-border/50 transition-colors cursor-pointer',
        'hover:bg-muted/50',
        !alert.read && colors.bg
      )}
      onClick={() => onMarkAsRead(alert.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onMarkAsRead(alert.id);
        }
      }}
    >
      <div className="flex items-start gap-3">
        <SeverityIcon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', colors.icon)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={cn(
              'text-sm font-medium truncate',
              !alert.read ? colors.text : 'text-foreground'
            )}>
              {alert.title}
            </p>
            {!alert.read && (
              <span className="h-2 w-2 rounded-full bg-[#FF7BA5] dark:bg-pink-400 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {alert.message}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {formatRelativeTime(alert.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
};

AlertItem.displayName = 'AlertItem';

export const AlertDropdown: React.FC = () => {
  const {
    alerts,
    unreadCount,
    dropdownOpen,
    toggleDropdown,
    closeDropdown,
    markAsRead,
    markAllAsRead,
    clearAlerts,
  } = useAlertStore();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeDropdown();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [dropdownOpen, closeDropdown]);

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
        className="text-white/90 hover:text-white hover:bg-white/20 relative"
        onClick={toggleDropdown}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
            style={{ backgroundColor: '#FF7BA5' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {dropdownOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute right-0 top-full mt-2 w-96 max-h-[28rem]',
            'bg-background border border-border rounded-lg shadow-lg',
            'flex flex-col overflow-hidden z-50',
            'animate-in fade-in-0 slide-in-from-top-2 duration-200'
          )}
          role="region"
          aria-label="System alerts"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold" style={{ color: '#9B6ED8' }}>
                System Alerts
              </h3>
              {unreadCount > 0 && (
                <Badge
                  className="text-[10px] px-1.5 py-0 text-white border-0"
                  style={{ backgroundColor: '#FF7BA5' }}
                >
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {alerts.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={markAllAsRead}
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={clearAlerts}
                    title="Clear all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Alert List */}
          <div className="flex-1 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No alerts yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Connection events will appear here
                </p>
              </div>
            ) : (
              alerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onMarkAsRead={markAsRead}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

AlertDropdown.displayName = 'AlertDropdown';
