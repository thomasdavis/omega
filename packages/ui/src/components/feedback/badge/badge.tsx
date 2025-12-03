import React from 'react';
import { cn } from '../../../lib/cn.js';
import { badgeVariants } from './badge.variants.js';
import type { BadgeProps } from './badge.types.js';

/**
 * Badge Component
 *
 * Small labeled tag for statuses, categories, or counts.
 *
 * @example
 * ```tsx
 * <Badge>Default</Badge>
 * <Badge variant="primary">New</Badge>
 * <Badge variant="success" size="sm">Active</Badge>
 * ```
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
