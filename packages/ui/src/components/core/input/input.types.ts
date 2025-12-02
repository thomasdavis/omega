import type { InputVariants } from './input.variants.js';

export type InputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size'
> &
  InputVariants;

export type { InputVariants };
