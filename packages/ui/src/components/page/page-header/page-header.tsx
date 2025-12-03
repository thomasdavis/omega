import React from 'react';
import { cn } from '../../../lib/cn.js';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Page title
   */
  title: string;
  /**
   * Page description (optional)
   */
  description?: string;
  /**
   * Actions to display on the right side (optional)
   */
  actions?: React.ReactNode;
}

/**
 * PageHeader Component
 *
 * Consistent page header used across all pages.
 * Eliminates the repeated header pattern found in messages, todos, artifacts, etc.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Messages"
 *   description="View and manage your messages"
 * />
 *
 * <PageHeader
 *   title="Todos"
 *   description="Track your tasks"
 *   actions={<Button>Add Task</Button>}
 * />
 * ```
 */
export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, description, actions, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm',
          className
        )}
        {...props}
      >
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-5xl font-light text-white tracking-tight">
                {title}
              </h1>
              {description && (
                <p className="mt-3 text-zinc-400 font-light max-w-2xl">
                  {description}
                </p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      </div>
    );
  }
);

PageHeader.displayName = 'PageHeader';
