import type { HeadingVariants } from './heading.variants.js';

export type HeadingProps = Omit<
  React.HTMLAttributes<HTMLHeadingElement>,
  'color'
> &
  HeadingVariants & {
    /**
     * Override the semantic level - useful when you need a different visual size
     * than the semantic heading level
     */
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  };

export type { HeadingVariants };
