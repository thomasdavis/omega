import type { BadgeVariants } from './badge.variants.js';

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    BadgeVariants {}
