/**
 * App Component
 * Root application component with routing and error boundary
 */
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { BoardView } from '@/routes/BoardView';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useBoard } from '@/hooks/useBoard';
import { useSettingsStore } from '@/stores/settingsStore';

/**
 * Main application component
 */
const App: React.FC = () => {
  const { boards, fetchBoards } = useBoard(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const { theme } = useSettingsStore();

  // Initialize theme on app load
  useEffect(() => {
    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();

    // Listen for system theme changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  useEffect(() => {
    fetchBoards().finally(() => setInitialLoading(false));
  }, [fetchBoards]);

  if (initialLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading dashboard..." />
      </div>
    );
  }

  // Get the first board as default, or use a hardcoded ID
  const defaultBoardId = boards[0]?.id || 'main-board';

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to={`/board/${defaultBoardId}`} replace />} />
          <Route path="/board/:boardId" element={<BoardViewWrapper />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
};

/**
 * Wrapper component to extract boardId from route params
 */
const BoardViewWrapper: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();

  return <BoardView boardId={boardId || 'main-board'} />;
};

/**
 * 404 Not Found page
 */
const NotFound: React.FC = () => {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-muted-foreground mb-4">Page not found</p>
        <a
          href="/"
          className="text-primary hover:underline"
        >
          Go back home
        </a>
      </div>
    </div>
  );
};

export default App;
