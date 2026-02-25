/**
 * LoadingSpinner Component
 * Displays a loading indicator
 */
import React from 'react';
import { cn } from '@/utils/cn';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  message?: string;
}

/**
 * LoadingSpinner shows a spinning animation
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  message,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-b-2 border-primary',
          sizeClasses[size]
        )}
        role="status"
        aria-label="Loading"
      />
      {message && (
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
};

LoadingSpinner.displayName = 'LoadingSpinner';
