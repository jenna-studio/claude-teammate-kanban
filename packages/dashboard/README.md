# Agent Track Dashboard

A modern, real-time React dashboard for monitoring AI agent activities with a kanban board interface.

## Features

- **Real-time Updates**: WebSocket-based live synchronization
- **Kanban Board**: Drag-and-drop task management
- **Agent Monitoring**: Track active agents and their performance
- **Task Details**: Comprehensive task information with code diffs
- **Responsive Design**: Works on all screen sizes
- **Type-Safe**: Full TypeScript support
- **Modern Stack**: React 18, Vite, Zustand, Tailwind CSS

## Architecture

### Component Structure

```
src/
├── components/
│   ├── kanban/          # Kanban board components
│   │   ├── KanbanBoard.tsx
│   │   ├── KanbanColumn.tsx
│   │   └── TaskCard.tsx
│   ├── task/            # Task detail components
│   │   └── TaskDetailModal.tsx
│   ├── agent/           # Agent monitoring
│   │   ├── AgentList.tsx
│   │   └── AgentCard.tsx
│   ├── common/          # Shared components
│   │   ├── Header.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorBoundary.tsx
│   └── ui/              # Base UI components (shadcn/ui)
│       ├── button.tsx
│       ├── card.tsx
│       ├── badge.tsx
│       ├── dialog.tsx
│       └── progress.tsx
├── hooks/               # Custom React hooks
│   ├── useWebSocket.ts
│   ├── useBoard.ts
│   ├── useTasks.ts
│   └── useAgents.ts
├── stores/              # Zustand state stores
│   ├── taskStore.ts
│   ├── boardStore.ts
│   ├── agentStore.ts
│   └── uiStore.ts
├── services/            # API and WebSocket clients
│   ├── api.ts
│   ├── websocket.ts
│   └── storage.ts
├── utils/               # Utility functions
│   ├── date.ts
│   ├── colors.ts
│   ├── filters.ts
│   └── cn.ts
├── types/               # TypeScript type definitions
│   └── index.ts
└── routes/              # Route components
    └── BoardView.tsx
```

### Key Technologies

- **React 18**: Latest React with concurrent features
- **TypeScript**: Full type safety
- **Vite**: Fast build tool and dev server
- **Zustand**: Lightweight state management
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Beautiful, accessible UI components
- **@dnd-kit**: Modern drag-and-drop
- **date-fns**: Date formatting and manipulation
- **lucide-react**: Icon library
- **React Router**: Client-side routing

## Development

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### Environment Variables

Create a `.env` file in the dashboard directory:

```bash
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:8080
```

### Build

```bash
# Production build
npm run build

# Preview production build
npm run preview
```

## State Management

### Stores

#### TaskStore
Manages all task state including filtering and selection.

```typescript
const { tasks, addTask, updateTask, moveTask } = useTaskStore();
```

#### BoardStore
Manages board configuration and statistics.

```typescript
const { currentBoard, columns, statistics } = useBoardStore();
```

#### AgentStore
Tracks agent status and metrics.

```typescript
const { agents, activeAgents } = useAgentStore();
```

#### UIStore
Manages UI state like filters, modals, and sidebar.

```typescript
const { sidebarOpen, filters, toggleSidebar } = useUIStore();
```

## Custom Hooks

### useWebSocket
Manages WebSocket connection and real-time updates.

```typescript
const { connected, connectionState } = useWebSocket(boardId);
```

### useBoard
Handles board data fetching and operations.

```typescript
const { board, columns, fetchBoard } = useBoard(boardId);
```

### useTasks
Manages task CRUD operations with filtering.

```typescript
const { tasks, createTask, updateTask, moveTask } = useTasks(boardId);
```

### useAgents
Fetches and manages agent data.

```typescript
const { agents, fetchAgents } = useAgents();
```

## Component Guidelines

### Component Structure

All components follow these patterns:

1. **Props Interface**: TypeScript interface for props
2. **JSDoc Comments**: Documentation for complex logic
3. **Accessibility**: ARIA labels and roles
4. **Error Handling**: Proper error states
5. **Loading States**: Loading indicators
6. **Type Safety**: Full TypeScript coverage

### Example Component

```typescript
/**
 * TaskCard Component
 * Displays individual task information
 */
import React from 'react';
import { Card } from '@/components/ui/card';
import type { AgentTask } from '@/types';

export interface TaskCardProps {
  task: AgentTask;
  onClick?: (task: AgentTask) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  return (
    <Card onClick={() => onClick?.(task)}>
      {/* Component content */}
    </Card>
  );
};

TaskCard.displayName = 'TaskCard';
```

## Styling

### Tailwind CSS

The project uses Tailwind CSS with a custom configuration:

- CSS variables for theming
- Custom color palette
- Dark mode support
- Custom scrollbar styling

### Component Styling

```typescript
import { cn } from '@/utils/cn';

<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  className
)}>
```

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Troubleshooting

### Common Issues

1. **WebSocket not connecting**
   - Check VITE_WS_URL environment variable
   - Ensure WebSocket server is running
   - Check browser console for errors

2. **Tasks not updating**
   - Verify API server is running
   - Check network tab for failed requests
   - Ensure boardId is correct

3. **Build errors**
   - Clear node_modules and reinstall
   - Check TypeScript errors with `npm run type-check`
   - Verify all dependencies are installed

## Performance

### Optimizations

- React.memo for expensive components
- Zustand for efficient state updates
- Virtual scrolling for long lists (future)
- Code splitting with React.lazy (future)
- WebSocket message batching

## Accessibility

- Semantic HTML
- ARIA labels and roles
- Keyboard navigation
- Screen reader support
- Focus management

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

MIT
