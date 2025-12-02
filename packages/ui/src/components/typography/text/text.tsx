import React from 'react';
import { cn } from '../../../lib/cn.js';
import { textVariants } from './text.variants.js';
import type { TextProps } from './text.types.js';

/**
 * Text Component
 *
 * Flexible text component with consistent typography styling.
 *
 * @example
 * ```tsx
 * <Text>Default paragraph text</Text>
 * <Text size="sm" color="secondary">Small secondary text</Text>
 * <Text as="span" weight="medium">Inline medium text</Text>
 * ```
 */
export const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  (
    { className, size, weight, color, align, as: Component = 'p', children, ...props },
    ref
  ) => {
    return (
      <Component
        ref={ref as any}
        className={cn(textVariants({ size, weight, color, align }), className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Text.displayName = 'Text';
