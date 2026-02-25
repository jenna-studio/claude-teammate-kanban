# Code Diff Viewing Feature

## Overview

When a user clicks on any task card in the kanban board, a detailed modal opens showing **all code changes** made by the agent for that task, including:

- Files modified
- Line-by-line diff view (added/removed/changed lines)
- Syntax highlighting
- File tree view
- Ability to expand/collapse files

## Data Model Extension

### Updated AgentTask Type

```typescript
interface AgentTask {
  // ... existing fields ...

  // Code Changes
  codeChanges?: CodeChange[];
  commitHash?: string;              // Git commit hash if integrated
  diffSummary?: {
    filesChanged: number;
    insertions: number;
    deletions: number;
  };
}

interface CodeChange {
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted' | 'renamed';
  oldPath?: string;                 // For renamed files
  diff: string;                     // Unified diff format
  language?: string;                // For syntax highlighting
  hunks: DiffHunk[];                // Parsed diff hunks
}

interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

interface DiffLine {
  type: 'context' | 'addition' | 'deletion';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}
```

### Database Schema Addition

```sql
CREATE TABLE code_changes (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,

    file_path TEXT NOT NULL,
    change_type TEXT NOT NULL,
    old_path TEXT,

    diff TEXT NOT NULL,              -- Unified diff format
    language TEXT,

    lines_added INTEGER DEFAULT 0,
    lines_deleted INTEGER DEFAULT 0,

    created_at INTEGER NOT NULL,

    FOREIGN KEY (task_id) REFERENCES agent_tasks(id) ON DELETE CASCADE
);

CREATE INDEX idx_code_changes_task ON code_changes(task_id);
CREATE INDEX idx_code_changes_file ON code_changes(file_path);
```

## MCP Tool Extension

### `update_task_progress` with Code Diffs

```typescript
{
  name: 'update_task_progress',
  description: 'Update task progress with code changes',
  inputSchema: z.object({
    taskId: z.string(),
    progress: z.number().min(0).max(100).optional(),
    currentAction: z.string().optional(),

    // Code changes
    codeChanges: z.array(z.object({
      filePath: z.string(),
      changeType: z.enum(['added', 'modified', 'deleted', 'renamed']),
      oldPath: z.string().optional(),
      diff: z.string(),                    // Unified diff format
      language: z.string().optional(),
    })).optional(),
  }),
}

// Example: Agent reports code changes
await mcp.callTool('update_task_progress', {
  taskId: 'task-123',
  progress: 60,
  currentAction: 'Refactoring authentication module',
  codeChanges: [
    {
      filePath: 'src/auth/login.ts',
      changeType: 'added',
      language: 'typescript',
      diff: `@@ -0,0 +1,25 @@
+import { User } from './types';
+
+export async function login(email: string, password: string): Promise<User> {
+  // Validate credentials
+  if (!email || !password) {
+    throw new Error('Email and password required');
+  }
+
+  // Check user exists
+  const user = await db.users.findByEmail(email);
+  if (!user) {
+    throw new Error('Invalid credentials');
+  }
+
+  // Verify password
+  const valid = await bcrypt.compare(password, user.passwordHash);
+  if (!valid) {
+    throw new Error('Invalid credentials');
+  }
+
+  // Create session
+  const session = await createSession(user.id);
+
+  return user;
+}`
    },
    {
      filePath: 'src/auth.ts',
      changeType: 'modified',
      language: 'typescript',
      diff: `@@ -10,30 +10,8 @@
 import { User } from './types';
+import { login } from './auth/login';
+import { logout } from './auth/logout';

-export async function login(email: string, password: string): Promise<User> {
-  // Old monolithic login code
-  if (!email || !password) {
-    throw new Error('Email and password required');
-  }
-
-  const user = await db.users.findByEmail(email);
-  if (!user) {
-    throw new Error('Invalid credentials');
-  }
-
-  const valid = await bcrypt.compare(password, user.passwordHash);
-  if (!valid) {
-    throw new Error('Invalid credentials');
-  }
-
-  const session = await createSession(user.id);
-  return user;
-}
+export { login, logout };`
    }
  ]
});
```

## Web Dashboard Components

### 1. Task Detail Modal with Diff Viewer

```tsx
// src/components/task/TaskDetailModal.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DiffViewer } from './DiffViewer';
import { TaskTimeline } from './TaskTimeline';
import { TaskComments } from './TaskComments';
import type { AgentTask } from '@/types';

interface Props {
  task: AgentTask;
  open: boolean;
  onClose: () => void;
}

export const TaskDetailModal: React.FC<Props> = ({ task, open, onClose }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="changes" className="flex-1">
          <TabsList>
            <TabsTrigger value="changes">
              Code Changes ({task.codeChanges?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="changes" className="h-full overflow-auto">
            {task.codeChanges && task.codeChanges.length > 0 ? (
              <DiffViewer changes={task.codeChanges} />
            ) : (
              <div className="text-center text-gray-400 py-8">
                No code changes yet
              </div>
            )}
          </TabsContent>

          <TabsContent value="timeline">
            <TaskTimeline taskId={task.id} />
          </TabsContent>

          <TabsContent value="comments">
            <TaskComments taskId={task.id} />
          </TabsContent>

          <TabsContent value="details">
            <TaskDetailsView task={task} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
```

### 2. Diff Viewer Component

```tsx
// src/components/task/DiffViewer.tsx
import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { File, FileCode, FilePlus, FileMinus, ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { CodeChange } from '@/types';

interface Props {
  changes: CodeChange[];
}

export const DiffViewer: React.FC<Props> = ({ changes }) => {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(
    new Set(changes.map((c) => c.filePath))
  );

  const toggleFile = (filePath: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const getFileIcon = (changeType: string) => {
    switch (changeType) {
      case 'added':
        return <FilePlus className="w-4 h-4 text-green-600" />;
      case 'deleted':
        return <FileMinus className="w-4 h-4 text-red-600" />;
      case 'modified':
        return <FileCode className="w-4 h-4 text-blue-600" />;
      default:
        return <File className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="p-4">
        <div className="flex gap-6 text-sm">
          <span>
            <strong>{changes.length}</strong> files changed
          </span>
          <span className="text-green-600">
            <strong>
              {changes.reduce((sum, c) => sum + (c.diff.match(/^\+/gm)?.length || 0), 0)}
            </strong>{' '}
            insertions
          </span>
          <span className="text-red-600">
            <strong>
              {changes.reduce((sum, c) => sum + (c.diff.match(/^-/gm)?.length || 0), 0)}
            </strong>{' '}
            deletions
          </span>
        </div>
      </Card>

      {/* File Changes */}
      {changes.map((change) => {
        const isExpanded = expandedFiles.has(change.filePath);

        return (
          <Card key={change.filePath} className="overflow-hidden">
            {/* File Header */}
            <div
              className="flex items-center gap-2 p-3 bg-gray-50 border-b cursor-pointer hover:bg-gray-100"
              onClick={() => toggleFile(change.filePath)}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              {getFileIcon(change.changeType)}
              <span className="font-mono text-sm flex-1">{change.filePath}</span>
              {change.oldPath && (
                <span className="text-xs text-gray-500">
                  renamed from {change.oldPath}
                </span>
              )}
            </div>

            {/* Diff Content */}
            {isExpanded && (
              <div className="overflow-x-auto">
                <UnifiedDiffView diff={change.diff} language={change.language} />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
```

### 3. Unified Diff View Component

```tsx
// src/components/task/UnifiedDiffView.tsx
import React from 'react';

interface Props {
  diff: string;
  language?: string;
}

export const UnifiedDiffView: React.FC<Props> = ({ diff, language }) => {
  const lines = diff.split('\n');

  const parseLine = (line: string, index: number) => {
    const type = line[0];
    const content = line.slice(1);

    if (type === '+') {
      return (
        <div key={index} className="flex bg-green-50 hover:bg-green-100">
          <span className="w-12 px-2 text-right text-gray-400 select-none">+</span>
          <span className="w-12 px-2 text-right text-gray-400 select-none bg-green-100">
            {/* new line number */}
          </span>
          <pre className="flex-1 px-2 text-green-800">
            <code>{content}</code>
          </pre>
        </div>
      );
    }

    if (type === '-') {
      return (
        <div key={index} className="flex bg-red-50 hover:bg-red-100">
          <span className="w-12 px-2 text-right text-gray-400 select-none bg-red-100">
            {/* old line number */}
          </span>
          <span className="w-12 px-2 text-right text-gray-400 select-none">-</span>
          <pre className="flex-1 px-2 text-red-800">
            <code>{content}</code>
          </pre>
        </div>
      );
    }

    if (type === '@') {
      // Hunk header
      return (
        <div key={index} className="flex bg-blue-50">
          <span className="w-24 px-2 text-right text-gray-400 select-none" />
          <pre className="flex-1 px-2 text-blue-600 font-semibold">
            <code>{line}</code>
          </pre>
        </div>
      );
    }

    // Context line
    return (
      <div key={index} className="flex hover:bg-gray-50">
        <span className="w-12 px-2 text-right text-gray-400 select-none">
          {/* old line number */}
        </span>
        <span className="w-12 px-2 text-right text-gray-400 select-none">
          {/* new line number */}
        </span>
        <pre className="flex-1 px-2 text-gray-700">
          <code>{content}</code>
        </pre>
      </div>
    );
  };

  return (
    <div className="font-mono text-sm border-t">
      {lines.map((line, index) => parseLine(line, index))}
    </div>
  );
};
```

### 4. Alternative: Side-by-Side Diff Viewer

For a richer experience, you can use the `react-diff-view` library:

```tsx
// src/components/task/SideBySideDiffViewer.tsx
import React from 'react';
import { Diff, Hunk, parseDiff } from 'react-diff-view';
import 'react-diff-view/style/index.css';
import { refractor } from 'refractor';
import typescript from 'refractor/lang/typescript';
import javascript from 'refractor/lang/javascript';
import python from 'refractor/lang/python';

refractor.register(typescript);
refractor.register(javascript);
refractor.register(python);

interface Props {
  diff: string;
  language?: string;
}

export const SideBySideDiffViewer: React.FC<Props> = ({ diff, language }) => {
  const files = parseDiff(diff);

  const tokenize = (hunks: any[]) => {
    if (!language) return undefined;

    try {
      const options = {
        refractor,
        language,
        oldSource: '',
        newSource: '',
      };
      return tokenizeHunks(hunks, options);
    } catch {
      return undefined;
    }
  };

  return (
    <div>
      {files.map((file, index) => {
        const tokens = tokenize(file.hunks);

        return (
          <Diff
            key={index}
            viewType="split"
            diffType={file.type}
            hunks={file.hunks}
            tokens={tokens}
          >
            {(hunks) =>
              hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)
            }
          </Diff>
        );
      })}
    </div>
  );
};
```

## How Agents Capture Code Changes

### Option 1: Git Integration

```typescript
// Agent uses git to capture changes
import { execSync } from 'child_process';

function captureCodeChanges(files: string[]): CodeChange[] {
  const changes: CodeChange[] = [];

  for (const file of files) {
    const diff = execSync(`git diff HEAD -- "${file}"`, { encoding: 'utf-8' });

    if (diff) {
      changes.push({
        filePath: file,
        changeType: determineChangeType(file),
        diff: diff,
        language: getLanguageFromPath(file),
      });
    }
  }

  return changes;
}

// Report to MCP
await mcp.callTool('update_task_progress', {
  taskId: 'task-123',
  progress: 80,
  codeChanges: captureCodeChanges(['src/auth/login.ts', 'src/auth.ts']),
});
```

### Option 2: In-Memory Diff

```typescript
// Agent tracks changes in memory before writing
import { diffLines } from 'diff';

class AgentFileTracker {
  private originalContent = new Map<string, string>();

  async readFile(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    this.originalContent.set(filePath, content);
    return content;
  }

  async writeFile(filePath: string, newContent: string): Promise<void> {
    await fs.writeFile(filePath, newContent);
  }

  generateDiff(filePath: string, newContent: string): string {
    const oldContent = this.originalContent.get(filePath) || '';
    const diff = diffLines(oldContent, newContent);

    return formatAsUnifiedDiff(diff, filePath);
  }

  async captureChanges(): Promise<CodeChange[]> {
    // Generate diffs for all modified files
    const changes: CodeChange[] = [];

    for (const [filePath, oldContent] of this.originalContent) {
      const newContent = await fs.readFile(filePath, 'utf-8');

      if (oldContent !== newContent) {
        changes.push({
          filePath,
          changeType: 'modified',
          diff: this.generateDiff(filePath, newContent),
          language: getLanguageFromPath(filePath),
        });
      }
    }

    return changes;
  }
}
```

## Task Card Enhancement

Update the `TaskCard` component to show code change indicators:

```tsx
// Inside TaskCard component
{task.codeChanges && task.codeChanges.length > 0 && (
  <div className="mt-2 pt-2 border-t">
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2">
        <FileCode className="w-3 h-3 text-gray-400" />
        <span className="text-gray-600">
          {task.codeChanges.length} file{task.codeChanges.length > 1 ? 's' : ''} changed
        </span>
      </div>
      <div className="flex gap-2">
        <span className="text-green-600">
          +{task.diffSummary?.insertions || 0}
        </span>
        <span className="text-red-600">
          -{task.diffSummary?.deletions || 0}
        </span>
      </div>
    </div>
  </div>
)}
```

### 5. Task Details Component

```tsx
// src/components/task/TaskDetailsView.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, FileCode, AlertCircle, Clock, Target } from 'lucide-react';
import { format } from 'date-fns';
import type { AgentTask } from '@/types';

interface Props {
  task: AgentTask;
}

export const TaskDetailsView: React.FC<Props> = ({ task }) => {
  const importanceColors = {
    critical: 'destructive',
    high: 'warning',
    medium: 'default',
    low: 'secondary',
  } as const;

  return (
    <div className="space-y-6 p-4">
      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Description</CardTitle>
        </CardHeader>
        <CardContent>
          {task.description ? (
            <div className="prose prose-sm max-w-none">
              {task.description}
            </div>
          ) : (
            <p className="text-gray-400 italic">No description provided</p>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Task Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Priority/Importance */}
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Priority</p>
              <Badge variant={importanceColors[task.importance]} className="mt-1">
                {task.importance.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Created Date */}
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Created</p>
              <p className="text-sm text-gray-600 mt-1">
                {format(task.createdAt, 'PPpp')}
              </p>
            </div>
          </div>

          {/* Updated Date */}
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Last Updated</p>
              <p className="text-sm text-gray-600 mt-1">
                {format(task.updatedAt, 'PPpp')}
              </p>
            </div>
          </div>

          {/* Claimed By */}
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Claimed By</p>
              <div className="mt-1">
                <p className="text-sm text-gray-600">{task.agentName}</p>
                <p className="text-xs text-gray-500">{task.agentType}</p>
                {task.claimedAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    Claimed {format(task.claimedAt, 'PPpp')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Files */}
          {task.files && task.files.length > 0 && (
            <div className="flex items-start gap-3">
              <FileCode className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Files Modified</p>
                <div className="mt-2 space-y-1">
                  {task.files.map((file, index) => (
                    <div
                      key={index}
                      className="text-sm font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded"
                    >
                      {file}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Status Timeline */}
          {task.startedAt && (
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Timeline</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Started:</span>
                    <span className="text-gray-800">
                      {format(task.startedAt, 'PPpp')}
                    </span>
                  </div>
                  {task.completedAt && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completed:</span>
                        <span className="text-gray-800">
                          {format(task.completedAt, 'PPpp')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="text-gray-800">
                          {task.actualDuration
                            ? `${Math.floor(task.actualDuration / 60)}m ${task.actualDuration % 60}s`
                            : 'N/A'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Blockers */}
          {task.blockedBy && task.blockedBy.length > 0 && (
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Blocked By</p>
                <div className="mt-2 space-y-1">
                  {task.blockedBy.map((blockerId) => (
                    <div
                      key={blockerId}
                      className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded"
                    >
                      Task: {blockerId}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      {(task.tokensUsed || task.linesChanged) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {task.linesChanged && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-700">Lines Changed:</span>
                <span className="text-sm">
                  <span className="text-green-600">+{task.linesChanged.added}</span>
                  {' / '}
                  <span className="text-red-600">-{task.linesChanged.removed}</span>
                </span>
              </div>
            )}
            {task.tokensUsed && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-700">Tokens Used:</span>
                <span className="text-sm text-gray-800">
                  {task.tokensUsed.toLocaleString()}
                </span>
              </div>
            )}
            {task.estimatedDuration && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-700">Estimated Duration:</span>
                <span className="text-sm text-gray-800">
                  {Math.floor(task.estimatedDuration / 60)}m {task.estimatedDuration % 60}s
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {task.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {task.errorMessage && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-lg text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 p-3 rounded text-sm text-red-700">
              {task.errorMessage}
            </div>
            {task.retryCount !== undefined && task.retryCount > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Retry attempts: {task.retryCount}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
```

## Summary

The code diff feature provides:

- ✅ **Unified diff format** storage in database
- ✅ **File-by-file diff viewing** with expand/collapse
- ✅ **Syntax highlighting** for better readability
- ✅ **Line-by-line changes** with context
- ✅ **Git integration** for automatic diff capture
- ✅ **Summary statistics** (insertions/deletions)
- ✅ **Side-by-side view** option
- ✅ **Modal interface** for detailed inspection
- ✅ **Real-time updates** as agent makes changes

When a user clicks any task card, they can see exactly what code changes the agent made, making the system fully transparent and auditable.
