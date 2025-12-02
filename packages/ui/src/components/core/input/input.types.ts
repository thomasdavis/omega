import type { InputVariants } from './input.variants.js';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    InputVariants {}
