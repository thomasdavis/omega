import type { TextVariants } from './text.variants.js';

export interface TextProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    TextVariants {
  /**
   * HTML element to render as
   * @default 'p'
   */
  as?: 'p' | 'span' | 'div' | 'label';
}
