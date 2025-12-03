import React from 'react';
import { cn } from '../../../lib/cn.js';

export interface PaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Current page number (1-indexed)
   */
  currentPage: number;
  /**
   * Total number of pages
   */
  totalPages: number;
  /**
   * Callback when page changes
   */
  onPageChange: (page: number) => void;
  /**
   * Number of page buttons to show around current page
   * @default 1
   */
  siblingCount?: number;
  /**
   * Show first/last page buttons
   * @default true
   */
  showFirstLast?: boolean;
}

/**
 * Pagination Component
 *
 * Provides page navigation with previous/next buttons and page numbers.
 * Used across list pages (messages, artifacts, blog, comics, documents).
 *
 * @example
 * ```tsx
 * <Pagination
 *   currentPage={3}
 *   totalPages={10}
 *   onPageChange={(page) => setCurrentPage(page)}
 * />
 *
 * <Pagination
 *   currentPage={5}
 *   totalPages={20}
 *   onPageChange={handlePageChange}
 *   siblingCount={2}
 *   showFirstLast={false}
 * />
 * ```
 */
export const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
  (
    {
      className,
      currentPage,
      totalPages,
      onPageChange,
      siblingCount = 1,
      showFirstLast = true,
      ...props
    },
    ref
  ) => {
    // Generate page numbers to display
    const getPageNumbers = (): (number | 'ellipsis')[] => {
      const pages: (number | 'ellipsis')[] = [];

      // Always show first page
      if (showFirstLast) {
        pages.push(1);
      }

      // Calculate range around current page
      const leftSibling = Math.max(currentPage - siblingCount, showFirstLast ? 2 : 1);
      const rightSibling = Math.min(
        currentPage + siblingCount,
        showFirstLast ? totalPages - 1 : totalPages
      );

      // Add left ellipsis
      if (leftSibling > (showFirstLast ? 2 : 1)) {
        pages.push('ellipsis');
      }

      // Add page numbers around current
      for (let i = leftSibling; i <= rightSibling; i++) {
        pages.push(i);
      }

      // Add right ellipsis
      if (rightSibling < (showFirstLast ? totalPages - 1 : totalPages)) {
        pages.push('ellipsis');
      }

      // Always show last page
      if (showFirstLast && totalPages > 1) {
        pages.push(totalPages);
      }

      return pages;
    };

    const pageNumbers = getPageNumbers();
    const canGoPrevious = currentPage > 1;
    const canGoNext = currentPage < totalPages;

    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-1', className)}
        {...props}
      >
        {/* Previous Button */}
        <button
          onClick={() => canGoPrevious && onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          className={cn(
            'h-9 px-3 text-sm font-medium transition-all duration-300',
            'border border-zinc-800 bg-zinc-900',
            'hover:bg-zinc-800 hover:border-zinc-700',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-zinc-900 disabled:hover:border-zinc-800',
            'text-zinc-300'
          )}
          aria-label="Previous page"
        >
          Previous
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => {
            if (page === 'ellipsis') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="flex h-9 w-9 items-center justify-center text-sm text-zinc-500"
                >
                  ...
                </span>
              );
            }

            const isActive = page === currentPage;

            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={cn(
                  'h-9 w-9 text-sm font-medium transition-all duration-300',
                  'border border-zinc-800',
                  isActive
                    ? 'bg-teal-500 border-teal-500 text-white'
                    : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700'
                )}
                aria-label={`Page ${page}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          onClick={() => canGoNext && onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className={cn(
            'h-9 px-3 text-sm font-medium transition-all duration-300',
            'border border-zinc-800 bg-zinc-900',
            'hover:bg-zinc-800 hover:border-zinc-700',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-zinc-900 disabled:hover:border-zinc-800',
            'text-zinc-300'
          )}
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    );
  }
);

Pagination.displayName = 'Pagination';
