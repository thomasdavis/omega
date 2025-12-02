import Link from 'next/link';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  href?: string;
  hover?: boolean;
}

export default function Card({ children, className = '', href, hover = true }: CardProps) {
  const baseStyles = 'bg-zinc-900 border border-zinc-800 overflow-hidden';
  const hoverStyles = hover ? 'hover:border-zinc-700 transition-all duration-300' : '';
  const combinedStyles = `${baseStyles} ${hoverStyles} ${className}`;

  if (href) {
    return (
      <Link href={href} className={`block ${combinedStyles}`}>
        {children}
      </Link>
    );
  }

  return <div className={combinedStyles}>{children}</div>;
}
