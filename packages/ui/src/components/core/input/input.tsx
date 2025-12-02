import React from 'react';
import { cn } from '../../../lib/cn.js';
import { inputVariants } from './input.variants.js';
import type { InputProps } from './input.types.js';

/**
 * Input Component
 *
 * Text input with consistent styling and validation states.
 *
 * @example
 * ```tsx
 * <Input placeholder="Enter text..." />
 * <Input type="email" variant="error" />
 * <Input size="sm" disabled />
 * ```
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, variant, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(inputVariants({ size, variant }), className)}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
