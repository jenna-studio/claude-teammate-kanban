/**
 * TaskDetailModal Component
 * Displays detailed information about a task including code changes and comments
 */
import React, { useEffect } from 'react';
import { FileCode, Clock, AlertCircle, CheckCircle, GitCommit, MessageSquare } from 'lucide-react';
import { ClaudeIcon } from '@/components/icons/ClaudeIcon';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CodeDiffViewer } from './CodeDiffViewer';
import { useTaskStore } from '@/stores/taskStore';
import { useUIStore } from '@/stores/uiStore';
import { formatDateTime, formatDurationSeconds } from '@/utils/date';
import { getImportanceColor, getStatusColor } from '@/utils/colors';
import { cn } from '@/utils/cn';

/**
 * TaskDetailModal shows comprehensive task information
 */
export const TaskDetailModal: React.FC = () => {
  const { selectedTaskId, getTask, fetchTaskDetails, taskDetailLoading, taskComments } = useTaskStore();
  const { taskModalOpen, closeTaskModal } = useUIStore();

  const task = selectedTaskId ? getTask(selectedTaskId) : null;

  // Fetch full task details (with code changes + comments) when modal opens
  useEffect(() => {
    if (taskModalOpen && selectedTaskId) {
      fetchTaskDetails(selectedTaskId);
    }
  }, [taskModalOpen, selectedTaskId, fetchTaskDetails]);

  if (!task) return null;

  const importanceColors = getImportanceColor(task.importance);
  const statusColors = getStatusColor(task.status);

  const columnAccents: Record<string, string> = {
    todo: '#FF599E',
    claimed: '#9B6ED8',
    in_progress: '#00B9E9',
    review: '#F7BD00',
    done: '#00C148',
  };
  const overlayAccent = columnAccents[task.status] || '#9B6ED8';

  return (
    <Dialog open={taskModalOpen} onOpenChange={closeTaskModal}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto p-12"
        overlayStyle={{ backgroundColor: `${overlayAccent}18`, backdropFilter: 'blur(8px)' }}
      >
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{task.title}</DialogTitle>
              <DialogDescription>
                Task ID: {task.id}
              </DialogDescription>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge className={cn(importanceColors.bg, importanceColors.text)}>
                {task.importance}
              </Badge>
              <Badge className={cn(statusColors.bg, statusColors.text)}>
                {task.status}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Loading indicator for detail fetch */}
        {taskDetailLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
            <span className="text-sm text-muted-foreground">Loading details...</span>
          </div>
        )}

        <div className="space-y-6 mt-6">
          {/* Description */}
          {task.description && (
            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Progress */}
          {task.progress !== undefined && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Progress</h4>
                <span className="text-sm text-muted-foreground">
                  {task.progress}%
                </span>
              </div>
              <Progress value={task.progress} />
              {task.currentAction && (
                <p className="text-sm text-muted-foreground mt-2 italic">
                  {task.currentAction}
                </p>
              )}
            </div>
          )}

          {/* Agent Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ClaudeIcon size={16} color="#9B6ED8" />
                <h4 className="font-semibold text-sm">Agent</h4>
              </div>
              <p className="text-sm">{task.agentName}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {task.agentType.replace('-', ' ')}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h4 className="font-semibold text-sm">Timeline</h4>
              </div>
              <p className="text-xs">
                Created: {formatDateTime(task.createdAt)}
              </p>
              {task.startedAt && (
                <p className="text-xs">
                  Started: {formatDateTime(task.startedAt)}
                </p>
              )}
              {task.completedAt && (
                <p className="text-xs">
                  Completed: {formatDateTime(task.completedAt)}
                </p>
              )}
              <p className="text-xs">
                Updated: {formatDateTime(task.updatedAt)}
              </p>
            </div>
          </div>

          {/* Commit Hash */}
          {task.commitHash && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <GitCommit className="w-4 h-4 text-muted-foreground" />
                <h4 className="font-semibold">Commit</h4>
              </div>
              <code className="text-sm font-mono bg-muted px-3 py-1.5 rounded">
                {task.commitHash}
              </code>
            </div>
          )}

          {/* Files Modified */}
          {task.files && task.files.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileCode className="w-4 h-4 text-muted-foreground" />
                <h4 className="font-semibold">Files Modified</h4>
              </div>
              <div className="space-y-1">
                {task.files.map((file) => (
                  <div
                    key={file}
                    className="text-sm font-mono bg-muted p-2 rounded"
                  >
                    {file}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diff Summary + Lines Changed */}
          {(task.diffSummary || task.linesChanged) && (
            <div>
              <h4 className="font-semibold mb-2">Change Summary</h4>
              <div className="flex gap-4 text-sm flex-wrap">
                {task.diffSummary && (
                  <div className="flex items-center gap-1">
                    <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-semibold">{task.diffSummary.filesChanged}</span>
                    <span className="text-muted-foreground">file{task.diffSummary.filesChanged !== 1 ? 's' : ''} changed</span>
                  </div>
                )}
                {task.diffSummary ? (
                  <>
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-500 font-semibold">
                        +{task.diffSummary.insertions}
                      </span>
                      <span className="text-muted-foreground">additions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-pink-500 font-semibold">
                        -{task.diffSummary.deletions}
                      </span>
                      <span className="text-muted-foreground">deletions</span>
                    </div>
                  </>
                ) : task.linesChanged && (
                  <>
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-500 font-semibold">
                        +{task.linesChanged.added}
                      </span>
                      <span className="text-muted-foreground">additions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-pink-500 font-semibold">
                        -{task.linesChanged.removed}
                      </span>
                      <span className="text-muted-foreground">deletions</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Code Changes (Diff Viewer) */}
          {task.codeChanges && task.codeChanges.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Code Changes</h4>
              <CodeDiffViewer codeChanges={task.codeChanges} />
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            {task.tokensUsed && (
              <div>
                <p className="text-xs text-muted-foreground">Tokens Used</p>
                <p className="font-semibold">{task.tokensUsed.toLocaleString()}</p>
              </div>
            )}
            {task.estimatedDuration && (
              <div>
                <p className="text-xs text-muted-foreground">Est. Duration</p>
                <p className="font-semibold">
                  {formatDurationSeconds(task.estimatedDuration)}
                </p>
              </div>
            )}
            {task.actualDuration && (
              <div>
                <p className="text-xs text-muted-foreground">Actual Duration</p>
                <p className="font-semibold">
                  {formatDurationSeconds(task.actualDuration)}
                </p>
              </div>
            )}
          </div>

          {/* Comments */}
          {taskComments && taskComments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <h4 className="font-semibold">Comments ({taskComments.length})</h4>
              </div>
              <div className="space-y-3">
                {taskComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-lg p-3"
                    style={comment.authorType === 'agent'
                      ? { background: 'linear-gradient(135deg, #FF7BA515, #9B6ED820, #52C4E815)' }
                      : { backgroundColor: 'hsl(var(--muted) / 0.5)' }
                    }
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {comment.authorType === 'agent' ? (
                        <ClaudeIcon size={14} color="#9B6ED8" />
                      ) : (
                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{comment.author}</span>
                      <Badge variant="secondary" className="text-xs">
                        {comment.authorType}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDateTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-5">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blocked By */}
          {task.blockedBy && task.blockedBy.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-yellow-700" />
                <h4 className="font-semibold text-yellow-700">Blocked</h4>
              </div>
              <p className="text-sm text-yellow-700">
                This task is blocked by {task.blockedBy.length} other task(s)
              </p>
            </div>
          )}

          {/* Error Message */}
          {task.errorMessage && (
            <div className="bg-destructive/10 border border-destructive/20 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <h4 className="font-semibold text-destructive">Error</h4>
              </div>
              <p className="text-sm text-destructive">{task.errorMessage}</p>
              {task.retryCount && task.retryCount > 0 && (
                <p className="text-xs text-destructive mt-2">
                  Retry attempts: {task.retryCount}
                </p>
              )}
            </div>
          )}

          {/* Success Message */}
          {task.status === 'done' && !task.errorMessage && (
            <div className="rounded-lg p-4" style={{ backgroundColor: '#5DD9A015', border: '1px solid #5DD9A040' }}>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: '#3DC7BF' }} />
                <p className="text-sm font-medium" style={{ color: '#2a9d8f' }}>
                  Task completed successfully
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

TaskDetailModal.displayName = 'TaskDetailModal';
