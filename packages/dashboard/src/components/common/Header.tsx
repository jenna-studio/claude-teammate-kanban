/**
 * Header Component
 * Top navigation and controls
 */
import React from 'react';
import { Menu, Settings, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDropdown } from '@/components/common/AlertDropdown';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/utils/cn';

export interface HeaderProps {
  className?: string;
}

/**
 * Header displays app navigation and controls
 */
export const Header: React.FC<HeaderProps> = ({ className }) => {
  const { toggleSidebar, openSettingsModal } = useUIStore();

  return (
    <header
      className={cn(
        'border-b',
        'flex items-center justify-between',
        'px-6 py-4',
        className
      )}
      style={{
        background: 'linear-gradient(135deg, #FF7BA5 0%, #9B6ED8 50%, #52C4E8 100%)',
      }}
    >
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="text-white/90 hover:text-white hover:bg-white/20"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-white">Agent Track Dashboard</h1>
          <p className="text-sm text-white/75">
            Real-time AI agent activity monitoring
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Refresh"
          className="text-white/90 hover:text-white hover:bg-white/20"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
        <AlertDropdown />
        <Button variant="ghost" size="icon" aria-label="Settings" className="text-white/90 hover:text-white hover:bg-white/20" onClick={openSettingsModal}>
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

Header.displayName = 'Header';
