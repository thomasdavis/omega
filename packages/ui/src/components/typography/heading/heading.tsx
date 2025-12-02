import React from 'react';
import { cn } from '../../../lib/cn.js';
import { headingVariants } from './heading.variants.js';
import type { HeadingProps } from './heading.types.js';

/**
 * Heading Component
 *
 * Semantic heading component with consistent typography.
 * Uses the `level` prop for visual styling and `as` for semantic HTML.
 *
 * @example
 * ```tsx
 * <Heading level="h1">Page Title</Heading>
 * <Heading level="h2" color="secondary">Section Title</Heading>
 * <Heading level="h3" as="h2">Visually h3, semantically h2</Heading>
 * ```
 */
export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, level = 'h2', color, as, children, ...props }, ref) => {
    const Component = as || level;

    return (
      <Component
        ref={ref as any}
        className={cn(headingVariants({ level, color }), className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Heading.displayName = 'Heading';
