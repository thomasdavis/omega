/**
 * Storage Utility - Centralized persistent storage path management
 * Ensures consistent use of Railway volume (/data) across all tools
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Determine if we're running in production with Railway volume
 */
export function isProductionWithVolume(): boolean {
  return process.env.NODE_ENV === 'production' && existsSync('/data');
}

/**
 * Get the artifacts directory path
 * Uses /data/artifacts in production with Railway volume, otherwise local path
 */
export function getArtifactsDir(localFallback?: string): string {
  if (isProductionWithVolume()) {
    const dir = '/data/artifacts';
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  // Default local fallback path
  const fallback = localFallback || join(process.cwd(), 'apps/bot/artifacts');
  if (!existsSync(fallback)) {
    mkdirSync(fallback, { recursive: true });
  }
  return fallback;
}

/**
 * Get the uploads directory path
 * Uses /data/uploads in production with Railway volume, otherwise local path
 */
export function getUploadsDir(localFallback?: string): string {
  if (isProductionWithVolume()) {
    const dir = '/data/uploads';
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  // Default local fallback path
  const fallback = localFallback || join(process.cwd(), 'apps/bot/public/uploads');
  if (!existsSync(fallback)) {
    mkdirSync(fallback, { recursive: true });
  }
  return fallback;
}

/**
 * Get a custom data directory path
 * Uses /data/{name} in production with Railway volume, otherwise local path
 */
export function getDataDir(name: string, localFallback?: string): string {
  if (isProductionWithVolume()) {
    const dir = `/data/${name}`;
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  // Default local fallback path
  const fallback = localFallback || join(process.cwd(), `apps/bot/data/${name}`);
  if (!existsSync(fallback)) {
    mkdirSync(fallback, { recursive: true });
  }
  return fallback;
}

/**
 * Initialize all storage directories
 * Call this on application startup to ensure directories exist
 */
export function initializeStorage(): void {
  console.log('📁 Initializing storage directories...');

  const artifactsDir = getArtifactsDir();
  const uploadsDir = getUploadsDir();

  console.log(`   Artifacts: ${artifactsDir}`);
  console.log(`   Uploads: ${uploadsDir}`);

  if (isProductionWithVolume()) {
    console.log('✅ Using Railway persistent volume at /data');
  } else {
    console.log('⚠️  Using local storage (ephemeral)');
  }
}
