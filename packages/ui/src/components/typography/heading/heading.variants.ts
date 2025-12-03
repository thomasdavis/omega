import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Heading component variants
 */
export const headingVariants = cva('font-light tracking-tight', {
  variants: {
    level: {
      h1: 'text-5xl',
      h2: 'text-4xl',
      h3: 'text-3xl',
      h4: 'text-2xl',
      h5: 'text-xl',
      h6: 'text-lg',
    },
    color: {
      primary: 'text-white',
      secondary: 'text-zinc-400',
      accent: 'text-teal-400',
    },
  },
  defaultVariants: {
    level: 'h2',
    color: 'primary',
  },
});

export type HeadingVariants = VariantProps<typeof headingVariants>;
