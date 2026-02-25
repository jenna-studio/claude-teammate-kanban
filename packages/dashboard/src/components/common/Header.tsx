/**
 * Header Component
 * Top navigation and controls
 */
import React from 'react';
import { Menu, Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/utils/cn';

export interface HeaderProps {
  className?: string;
}

/**
 * Header displays app navigation and controls
 */
export const Header: React.FC<HeaderProps> = ({ className }) => {
  const { toggleSidebar } = useUIStore();

  return (
    <header
      className={cn(
        'border-b bg-background',
        'flex items-center justify-between',
        'px-6 py-4',
        className
      )}
    >
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Agent Track Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Real-time AI agent activity monitoring
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

Header.displayName = 'Header';
