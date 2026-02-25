/**
 * BoardView Component
 * Main view containing the kanban board and agent sidebar
 */
import React from 'react';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { AgentList } from '@/components/agent/AgentList';
import { TaskDetailModal } from '@/components/task/TaskDetailModal';
import { Header } from '@/components/common/Header';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/utils/cn';

export interface BoardViewProps {
  boardId: string;
}

/**
 * BoardView is the main application view
 * Features:
 * - Kanban board with real-time updates
 * - Agent monitoring sidebar
 * - Task detail modal
 * - WebSocket connection management
 */
export const BoardView: React.FC<BoardViewProps> = ({ boardId }) => {
  const { sidebarOpen } = useUIStore();
  const { connected, connectionState } = useWebSocket(boardId);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <Header />

      {/* Connection Status Indicator */}
      {!connected && (
        <div className="border-b px-6 py-2" style={{ backgroundColor: '#FFD96620', borderColor: '#FFD96650' }}>
          <p className="text-sm" style={{ color: '#b8860b' }}>
            {connectionState === 'RECONNECTING'
              ? 'Reconnecting to server...'
              : 'Not connected to real-time server'}
          </p>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Agent Sidebar */}
        <aside
          className={cn(
            'border-r overflow-hidden flex flex-col',
            'transition-[width,opacity] duration-300 ease-in-out',
            sidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 border-r-0'
          )}
          style={{ backgroundColor: 'hsl(300 30% 98%)' }}
        >
          <div className="w-80 flex flex-col h-full flex-shrink-0">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-lg" style={{ color: '#9B6ED8' }}>Active Agents</h2>
              <p className="text-sm text-muted-foreground">
                Monitoring agent activity
              </p>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <AgentList showOnlyActive />
            </div>
          </div>
        </aside>

        {/* Kanban Board */}
        <main className="flex-1 overflow-hidden">
          <KanbanBoard boardId={boardId} />
        </main>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal />
    </div>
  );
};

BoardView.displayName = 'BoardView';
