import React from 'react';
import { cn } from '../../../lib/cn.js';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Label for the stat
   */
  label: string;
  /**
   * The stat value to display
   */
  value: string | number;
  /**
   * Optional icon element
   */
  icon?: React.ReactNode;
  /**
   * Optional trend indicator (positive/negative percentage)
   */
  trend?: string;
  /**
   * Whether trend is positive (green) or negative (red)
   */
  trendDirection?: 'up' | 'down';
}

/**
 * StatCard Component
 *
 * Displays a statistic with label, value, and optional icon.
 * Used heavily in messages and todos pages (7+ instances).
 *
 * @example
 * ```tsx
 * <StatCard
 *   label="Total Messages"
 *   value="1,234"
 *   icon={<MessageIcon />}
 * />
 *
 * <StatCard
 *   label="Active Tasks"
 *   value={42}
 *   trend="+12%"
 *   trendDirection="up"
 * />
 * ```
 */
export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    { className, label, value, icon, trend, trendDirection, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-zinc-900 border border-zinc-800 hover:border-zinc-700',
          'transition-all duration-300 p-6',
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
              {label}
            </p>
            <p className="text-3xl font-light text-white">{value}</p>
            {trend && (
              <p
                className={cn(
                  'mt-2 text-sm font-medium',
                  trendDirection === 'up' && 'text-green-400',
                  trendDirection === 'down' && 'text-red-400',
                  !trendDirection && 'text-zinc-400'
                )}
              >
                {trend}
              </p>
            )}
          </div>
          {icon && (
            <div className="w-12 h-12 bg-teal-500/20 flex items-center justify-center text-teal-400">
              {icon}
            </div>
          )}
        </div>
      </div>
    );
  }
);

StatCard.displayName = 'StatCard';
