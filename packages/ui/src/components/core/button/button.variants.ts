import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Button variants using class-variance-authority
 * Inspired by Vercel Geist design system
 */
export const buttonVariants = cva(
  // Base styles - applied to all buttons
  [
    'inline-flex items-center justify-center',
    'font-medium transition-all duration-300',
    'outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
  ],
  {
    variants: {
      /**
       * Visual style variants
       */
      variant: {
        primary: [
          'bg-teal-500 hover:bg-teal-600 active:bg-teal-700',
          'text-white',
          'shadow-sm',
        ],
        secondary: [
          'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600',
          'text-white',
          'border border-zinc-700 hover:border-zinc-600',
        ],
        ghost: [
          'hover:bg-zinc-800 active:bg-zinc-700',
          'text-zinc-400 hover:text-white',
        ],
        danger: [
          'bg-red-500 hover:bg-red-600 active:bg-red-700',
          'text-white',
          'shadow-sm',
        ],
        outline: [
          'border border-zinc-700 hover:border-zinc-600',
          'text-zinc-400 hover:text-white hover:bg-zinc-800',
        ],
      },

      /**
       * Size variants
       */
      size: {
        sm: 'h-8 px-3 text-sm gap-1.5',
        md: 'h-10 px-4 text-base gap-2',
        lg: 'h-12 px-6 text-lg gap-2.5',
      },

      /**
       * Full width option
       */
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
    },

    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
