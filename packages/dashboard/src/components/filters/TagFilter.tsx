/**
 * TagFilter Component
 * Displays and manages tag filtering for tasks
 */
import React, { useMemo } from 'react';
import { X, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useTaskStore } from '@/stores/taskStore';
import { useUIStore } from '@/stores/uiStore';
import { getAllTags } from '@/utils/filters';
import { cn } from '@/utils/cn';

export interface TagFilterProps {
  className?: string;
}

/**
 * TagFilter allows users to filter tasks by tags
 */
export const TagFilter: React.FC<TagFilterProps> = ({ className }) => {
  const { tasks } = useTaskStore();
  const { filters, setTagsFilter } = useUIStore();

  // Get all available tags from all tasks
  const availableTags = useMemo(() => getAllTags(tasks), [tasks]);

  const selectedTags = filters.tags || [];
  const hasFilters = selectedTags.length > 0;

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setTagsFilter(selectedTags.filter((t) => t !== tag));
    } else {
      setTagsFilter([...selectedTags, tag]);
    }
  };

  const handleClearTags = () => {
    setTagsFilter([]);
  };

  if (availableTags.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Tag Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-2',
              hasFilters && 'border-primary bg-primary/10'
            )}
          >
            <Tag className="h-4 w-4" />
            <span>
              Tags {hasFilters && `(${selectedTags.length})`}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Filter by Tags</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {availableTags.length === 0 ? (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              No tags available
            </div>
          ) : (
            <>
              {availableTags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag}
                  checked={selectedTags.includes(tag)}
                  onCheckedChange={() => handleToggleTag(tag)}
                >
                  {tag}
                </DropdownMenuCheckboxItem>
              ))}

              {hasFilters && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearTags}
                      className="w-full justify-start text-xs"
                    >
                      Clear all filters
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Selected Tags Display */}
      {hasFilters && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {tag}
              <button
                onClick={() => handleToggleTag(tag)}
                className="ml-1 hover:bg-destructive/20 rounded-sm p-0.5"
                aria-label={`Remove ${tag} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearTags}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};

TagFilter.displayName = 'TagFilter';
