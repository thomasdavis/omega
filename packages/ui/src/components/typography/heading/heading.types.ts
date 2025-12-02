import type { HeadingVariants } from './heading.variants.js';

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    HeadingVariants {
  /**
   * Override the semantic level - useful when you need a different visual size
   * than the semantic heading level
   */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}
