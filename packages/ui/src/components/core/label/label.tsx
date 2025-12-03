import React from 'react';
import { cn } from '../../../lib/cn.js';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /**
   * Whether the field is required (adds asterisk)
   */
  required?: boolean;
}

/**
 * Label Component
 *
 * Form label with consistent styling.
 *
 * @example
 * ```tsx
 * <Label htmlFor="email">Email</Label>
 * <Label required>Password</Label>
 * ```
 */
export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'block text-sm font-medium text-zinc-400 mb-2',
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
    );
  }
);

Label.displayName = 'Label';
