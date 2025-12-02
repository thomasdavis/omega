import React from 'react';
import { cn } from '../../../lib/cn.js';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether the card should have hover effects
   */
  hoverable?: boolean;
  /**
   * If provided, card will be wrapped in a link
   */
  href?: string;
}

/**
 * Card Component - Main container
 *
 * Composable card component with optional sub-components.
 * Used extensively across artifacts, blog, comics, documents pages.
 *
 * @example
 * ```tsx
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Title</CardTitle>
 *   </CardHeader>
 *   <CardContent>
 *     Content here
 *   </CardContent>
 * </Card>
 *
 * <Card hoverable href="/item/1">
 *   ...
 * </Card>
 * ```
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable, href, children, ...props }, ref) => {
    const baseClasses = cn(
      'bg-zinc-900 border border-zinc-800 overflow-hidden',
      hoverable && 'transition-all duration-300 hover:border-zinc-700',
      className
    );

    if (href) {
      return (
        <a
          href={href}
          className={cn(baseClasses, 'block')}
          ref={ref as any}
          {...(props as any)}
        >
          {children}
        </a>
      );
    }

    return (
      <div ref={ref} className={baseClasses} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/**
 * CardHeader - Top section of card
 */
export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-6 border-b border-zinc-800', className)}
    {...props}
  />
));

CardHeader.displayName = 'CardHeader';

/**
 * CardTitle - Title within card header
 */
export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-xl font-light text-white', className)}
    {...props}
  />
));

CardTitle.displayName = 'CardTitle';

/**
 * CardContent - Main content area
 */
export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6', className)} {...props} />
));

CardContent.displayName = 'CardContent';

/**
 * CardFooter - Bottom section of card
 */
export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-6 border-t border-zinc-800', className)}
    {...props}
  />
));

CardFooter.displayName = 'CardFooter';
