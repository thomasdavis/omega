import React from 'react';
import { cn } from '../../../lib/cn.js';
import { buttonVariants } from './button.variants.js';
import type { ButtonProps } from './button.types.js';

/**
 * Button Component
 *
 * A versatile button component with multiple variants and sizes.
 * Follows Geist design system patterns.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md">Click me</Button>
 * <Button variant="secondary" size="sm">Cancel</Button>
 * <Button variant="ghost">Ghost button</Button>
 * ```
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
