import type { TextVariants } from './text.variants.js';

export type TextProps = Omit<
  React.HTMLAttributes<HTMLParagraphElement>,
  'color'
> &
  TextVariants & {
    /**
     * HTML element to render as
     * @default 'p'
     */
    as?: 'p' | 'span' | 'div' | 'label';
  };

export type { TextVariants };
