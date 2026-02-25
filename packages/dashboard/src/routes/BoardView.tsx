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
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-2">
          <p className="text-sm text-yellow-800">
            {connectionState === 'RECONNECTING'
              ? 'Reconnecting to server...'
              : 'Not connected to real-time server'}
          </p>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Kanban Board */}
        <main className="flex-1 overflow-hidden">
          <KanbanBoard boardId={boardId} />
        </main>

        {/* Agent Sidebar */}
        {sidebarOpen && (
          <aside
            className={cn(
              'w-80 border-l bg-background overflow-y-auto',
              'flex flex-col'
            )}
          >
            <div className="p-4 border-b">
              <h2 className="font-semibold text-lg">Active Agents</h2>
              <p className="text-sm text-muted-foreground">
                Monitoring agent activity
              </p>
            </div>
            <div className="flex-1 p-4">
              <AgentList showOnlyActive />
            </div>
          </aside>
        )}
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal />
    </div>
  );
};

BoardView.displayName = 'BoardView';
