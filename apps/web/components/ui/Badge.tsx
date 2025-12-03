import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'accent';
  className?: string;
}

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    default: 'px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-sm text-zinc-300 font-light',
    accent: 'px-3 py-1 bg-teal-500/20 border border-teal-500/50 rounded-full text-sm text-teal-400 font-light'
  };

  return <span className={`${variants[variant]} ${className}`}>{children}</span>;
}
