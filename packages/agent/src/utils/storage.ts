/**
 * Storage utilities for agent package
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Check if running in production with persistent volume
 */
function isProductionWithVolume(): boolean {
  return process.env.NODE_ENV === 'production' && existsSync('/data');
}

/**
 * Get the comics directory path
 * Returns persistent volume path in production, local path otherwise
 */
export function getComicsDir(localFallback?: string): string {
  if (isProductionWithVolume()) {
    const dir = '/data/comics';
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  // Default local fallback path
  const fallback = localFallback || join(process.cwd(), 'apps/web/public/comics');
  if (!existsSync(fallback)) {
    mkdirSync(fallback, { recursive: true });
  }
  return fallback;
}

/**
 * Get the user images directory path
 * Returns persistent volume path in production, local path otherwise
 */
export function getUserImagesDir(localFallback?: string): string {
  if (isProductionWithVolume()) {
    const dir = '/data/user-images';
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  // Default local fallback path
  const fallback = localFallback || join(process.cwd(), 'apps/web/public/user-images');
  if (!existsSync(fallback)) {
    mkdirSync(fallback, { recursive: true });
  }
  return fallback;
}
