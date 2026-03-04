/**
 * App Component
 * Root application component with routing and error boundary
 */
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { BoardView } from '@/routes/BoardView';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useBoard } from '@/hooks/useBoard';
import { useSettingsStore } from '@/stores/settingsStore';

/**
 * Component to handle query parameter redirects
 */
const QueryParamRedirect: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const boardId = searchParams.get('board');

  if (boardId) {
    return <Navigate to={`/board/${boardId}`} replace />;
  }

  return <RootRedirect />;
};

/**
 * Component to handle root redirect
 */
const RootRedirect: React.FC = () => {
  const { boards } = useBoard(null);

  const lastViewedBoardId = localStorage.getItem('agent-track-last-board');
  const newestBoard = boards[boards.length - 1];
  const defaultBoardId =
    (lastViewedBoardId && boards.some((b) => b.id === lastViewedBoardId) ? lastViewedBoardId : null)
    || newestBoard?.id
    || 'main-board';

  return <Navigate to={`/board/${defaultBoardId}`} replace />;
};

/**
 * Main application component
 */
const App: React.FC = () => {
  const { fetchBoards } = useBoard(null);
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

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<QueryParamRedirect />} />
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
