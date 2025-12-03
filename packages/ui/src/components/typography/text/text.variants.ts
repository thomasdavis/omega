import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Text component variants
 */
export const textVariants = cva('', {
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    },
    weight: {
      light: 'font-light',
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
    },
    color: {
      primary: 'text-white',
      secondary: 'text-zinc-400',
      tertiary: 'text-zinc-500',
      muted: 'text-zinc-600',
      accent: 'text-teal-400',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
  },
  defaultVariants: {
    size: 'base',
    weight: 'normal',
    color: 'primary',
    align: 'left',
  },
});

export type TextVariants = VariantProps<typeof textVariants>;
