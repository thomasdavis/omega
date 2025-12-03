import { cva, type VariantProps } from 'class-variance-authority';

export const badgeVariants = cva(
  'inline-flex items-center font-medium transition-all',
  {
    variants: {
      variant: {
        default: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
        primary: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
        success: 'bg-green-500/20 text-green-400 border border-green-500/30',
        warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
        error: 'bg-red-500/20 text-red-400 border border-red-500/30',
        info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs rounded-full',
        md: 'px-2.5 py-1 text-sm rounded-full',
        lg: 'px-3 py-1.5 text-base rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export type BadgeVariants = VariantProps<typeof badgeVariants>;
