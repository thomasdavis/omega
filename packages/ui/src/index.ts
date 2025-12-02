/**
 * @repo/ui - Omega Design System
 *
 * Geist-inspired component library for Omega AI
 */

// Utilities
export { cn } from './lib/cn.js';

// Core Components
export { Button } from './components/core/button/index.js';
export { Input } from './components/core/input/index.js';
export { Label } from './components/core/label/index.js';

export type { ButtonProps, ButtonVariants } from './components/core/button/index.js';
export type { InputProps, InputVariants } from './components/core/input/index.js';
export type { LabelProps } from './components/core/label/index.js';

// Typography
export { Text } from './components/typography/text/index.js';
export { Heading } from './components/typography/heading/index.js';

export type {
  TextProps,
  TextVariants,
} from './components/typography/text/index.js';
export type {
  HeadingProps,
  HeadingVariants,
} from './components/typography/heading/index.js';

// Feedback
export { Badge } from './components/feedback/badge/index.js';
export type {
  BadgeProps,
  BadgeVariants,
} from './components/feedback/badge/index.js';

// Data Display
export {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from './components/data-display/card/index.js';
export type { CardProps } from './components/data-display/card/index.js';

// Page Components
export { PageHeader } from './components/page/page-header/index.js';
export { StatCard } from './components/page/stat-card/index.js';

export type { PageHeaderProps } from './components/page/page-header/index.js';
export type { StatCardProps } from './components/page/stat-card/index.js';

// Navigation
export { Pagination } from './components/navigation/pagination/index.js';
export type { PaginationProps } from './components/navigation/pagination/index.js';

// Design Tokens (for advanced usage)
export { tokens } from './styles/tokens.js';
export type { Tokens } from './styles/tokens.js';
