/**
 * Header Component
 * Top navigation and controls
 */
import React from 'react';
import { Menu, Settings, RefreshCw, Github, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDropdown } from '@/components/common/AlertDropdown';
import { useUIStore } from '@/stores/uiStore';
import { useBoardStore } from '@/stores/boardStore';
import { cn } from '@/utils/cn';

/**
 * Extract a display-friendly project name from a GitHub repo URL or directory path
 */
function getProjectName(board: { repository?: string; projectPath?: string } | undefined): {
  name: string | null;
  source: 'github' | 'directory' | null;
} {
  if (!board) return { name: null, source: null };

  if (board.repository) {
    // Extract "org/repo" from GitHub URLs like https://github.com/org/repo or git@github.com:org/repo.git
    const httpsMatch = board.repository.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/);
    if (httpsMatch) return { name: httpsMatch[1], source: 'github' };

    const sshMatch = board.repository.match(/github\.com:([^/]+\/[^/]+?)(?:\.git)?$/);
    if (sshMatch) return { name: sshMatch[1], source: 'github' };

    // Generic repo URL — use last path segment
    const lastSegment = board.repository.split('/').filter(Boolean).pop()?.replace(/\.git$/, '');
    if (lastSegment) return { name: lastSegment, source: 'github' };
  }

  if (board.projectPath) {
    // Use the last directory name from the path
    const dirName = board.projectPath.split('/').filter(Boolean).pop();
    if (dirName) return { name: dirName, source: 'directory' };
  }

  return { name: null, source: null };
}

export interface HeaderProps {
  className?: string;
}

/**
 * Header displays app navigation and controls
 */
export const Header: React.FC<HeaderProps> = ({ className }) => {
  const { toggleSidebar, openSettingsModal } = useUIStore();
  const { getCurrentBoard } = useBoardStore();
  const currentBoard = getCurrentBoard();
  const project = getProjectName(currentBoard);

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
      <div className="flex items-center gap-3">
        {project.name && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm">
            {project.source === 'github' ? (
              <Github className="h-3.5 w-3.5 text-white/80" />
            ) : (
              <FolderOpen className="h-3.5 w-3.5 text-white/80" />
            )}
            <span className="text-sm font-medium text-white/90">{project.name}</span>
          </div>
        )}
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
