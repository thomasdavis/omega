import { cva, type VariantProps } from 'class-variance-authority';

export const inputVariants = cva(
  [
    'w-full transition-all duration-300 outline-none',
    'bg-zinc-800 text-white placeholder:text-zinc-500',
    'border border-zinc-700',
    'focus:border-teal-500 focus:ring-1 focus:ring-teal-500',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ],
  {
    variants: {
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-5 text-lg',
      },
      variant: {
        default: '',
        error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  }
);

export type InputVariants = VariantProps<typeof inputVariants>;
