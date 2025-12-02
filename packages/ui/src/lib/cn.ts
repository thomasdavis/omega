import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names intelligently using clsx and tailwind-merge.
 *
 * This utility combines multiple class names and resolves Tailwind CSS conflicts.
 * It ensures that later classes override earlier ones when they conflict.
 *
 * @param inputs - Class names, objects, or arrays to merge
 * @returns A single merged class string
 *
 * @example
 * ```tsx
 * cn('px-4 py-2', 'bg-blue-500', className)
 * cn('text-sm', active && 'font-bold', 'text-zinc-400')
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
