/**
 * CodeDiffViewer Component
 * Renders code changes in a unified diff format
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileCode, FilePlus, FileX, FileEdit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CodeChange } from '@/types';
import { cn } from '@/utils/cn';

interface CodeDiffViewerProps {
  codeChanges: CodeChange[];
}

const changeTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  added: { label: 'Added', icon: FilePlus, color: 'text-emerald-700', bg: 'bg-emerald-100' },
  modified: { label: 'Modified', icon: FileEdit, color: 'text-sky-700', bg: 'bg-sky-100' },
  deleted: { label: 'Deleted', icon: FileX, color: 'text-pink-700', bg: 'bg-pink-100' },
  renamed: { label: 'Renamed', icon: FileCode, color: 'text-purple-700', bg: 'bg-purple-100' },
};

const DiffBlock: React.FC<{ change: CodeChange }> = ({ change }) => {
  const [expanded, setExpanded] = useState(true);
  const config = changeTypeConfig[change.changeType] || changeTypeConfig.modified;
  const Icon = config.icon;
  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  const diffLines = change.diff ? change.diff.split('\n') : [];

  // For added/deleted files, extract clean content lines (strip diff metadata and prefixes)
  const isFullFile = change.changeType === 'added' || change.changeType === 'deleted';
  const contentLines = isFullFile
    ? diffLines
        .filter((line) => !line.startsWith('+++') && !line.startsWith('---') && !line.startsWith('@@'))
        .map((line) => {
          if (line.startsWith('+') || line.startsWith('-')) return line.slice(1);
          return line;
        })
    : [];

  return (
    <div className="border rounded-lg overflow-hidden bg-white/60">
      {/* File Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50/50 transition-colors text-left"
      >
        <ChevronIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <Icon className={cn('w-4 h-4 flex-shrink-0', config.color)} />
        <span className="text-sm font-mono flex-1 truncate">{change.filePath}</span>
        {change.oldPath && (
          <span className="text-xs text-muted-foreground">
            from {change.oldPath}
          </span>
        )}
        <Badge variant="secondary" className={cn('text-xs', config.bg, config.color)}>
          {config.label}
        </Badge>
        {(change.linesAdded !== undefined || change.linesDeleted !== undefined) && (
          <span className="text-xs flex gap-2 ml-2">
            {change.linesAdded !== undefined && change.linesAdded > 0 && (
              <span className="text-emerald-600">+{change.linesAdded}</span>
            )}
            {change.linesDeleted !== undefined && change.linesDeleted > 0 && (
              <span className="text-pink-500">-{change.linesDeleted}</span>
            )}
          </span>
        )}
      </button>

      {/* Clean File Content (for added/deleted files) */}
      {expanded && isFullFile && contentLines.length > 0 && (
        <div className="border-t overflow-x-auto">
          <div
            className="px-3 py-2 text-xs font-medium"
            style={{
              backgroundColor: change.changeType === 'added' ? '#ecfdf5' : '#fdf2f8',
              color: change.changeType === 'added' ? '#065f46' : '#9d174d',
            }}
          >
            {change.changeType === 'added' ? 'File content' : 'Deleted content'}
          </div>
          <pre className="text-xs leading-5">
            {contentLines.map((line, i) => (
              <div
                key={i}
                className={cn(
                  'px-3 py-0',
                  change.changeType === 'added' ? 'bg-emerald-50 text-emerald-800' : 'bg-pink-50 text-pink-800'
                )}
              >
                <span className="text-muted-foreground/50 select-none inline-block w-8 text-right mr-3">
                  {i + 1}
                </span>
                {line}
              </div>
            ))}
          </pre>
        </div>
      )}

      {/* Diff Content (for modified/renamed files) */}
      {expanded && !isFullFile && diffLines.length > 0 && (
        <div className="border-t overflow-x-auto">
          <pre className="text-xs leading-5">
            {diffLines.map((line, i) => {
              let lineClass = 'px-3 py-0';
              let prefix = ' ';

              if (line.startsWith('+++') || line.startsWith('---')) {
                lineClass = 'px-3 py-0 bg-gray-100 text-muted-foreground';
                prefix = '';
              } else if (line.startsWith('@@')) {
                lineClass = 'px-3 py-0 bg-purple-50 text-purple-600';
                prefix = '';
              } else if (line.startsWith('+')) {
                lineClass = 'px-3 py-0 bg-emerald-50 text-emerald-800';
                prefix = '';
              } else if (line.startsWith('-')) {
                lineClass = 'px-3 py-0 bg-pink-50 text-pink-800';
                prefix = '';
              }

              return (
                <div key={i} className={lineClass}>
                  <span className="text-muted-foreground/50 select-none inline-block w-8 text-right mr-3">
                    {i + 1}
                  </span>
                  {prefix}{line}
                </div>
              );
            })}
          </pre>
        </div>
      )}

      {expanded && diffLines.length === 0 && (
        <div className="border-t px-3 py-4 text-sm text-muted-foreground text-center">
          No diff content available
        </div>
      )}
    </div>
  );
};

export const CodeDiffViewer: React.FC<CodeDiffViewerProps> = ({ codeChanges }) => {
  if (!codeChanges || codeChanges.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No code changes available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {codeChanges.map((change, index) => (
        <DiffBlock key={`${change.filePath}-${index}`} change={change} />
      ))}
    </div>
  );
};

CodeDiffViewer.displayName = 'CodeDiffViewer';
