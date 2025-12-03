import type { ButtonVariants } from './button.variants.js';

export type ButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'size'
> &
  ButtonVariants & {
    /**
     * If true, the button will be rendered as a child element within a span wrapper
     * This is useful for form submissions where the button should not submit
     */
    asChild?: boolean;
  };

export type { ButtonVariants };
