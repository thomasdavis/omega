/**
 * Storage Utility - Centralized persistent storage path management
 * Ensures consistent use of Railway volume (/data) across all tools
 */

import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
 * Get the blog posts directory path
 * Uses /data/blog in production with Railway volume, otherwise local path
 */
export function getBlogDir(localFallback?: string): string {
  if (isProductionWithVolume()) {
    const dir = '/data/blog';
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  // Default local fallback path
  const fallback = localFallback || join(process.cwd(), 'content/blog');
  if (!existsSync(fallback)) {
    mkdirSync(fallback, { recursive: true });
  }
  return fallback;
}

/**
 * Get the public directory path (for static assets like TTS player)
 * This directory is part of the codebase, not persistent storage
 */
export function getPublicDir(): string {
  // Try multiple possible paths for production/dev
  const possiblePaths = [
    join(__dirname, '../public'),                     // Relative to dist/ (production after build)
    join(process.cwd(), 'apps/bot/public'),           // Monorepo structure (dev)
    join(process.cwd(), 'public'),                    // If running from apps/bot
    '/app/apps/bot/dist/public',                      // Absolute Railway path after build
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      console.log(`✅ Found public directory: ${path}`);
      return path;
    }
  }

  // Fallback to first path and log warning
  console.error('❌ Public directory not found! Tried paths:', possiblePaths);
  return possiblePaths[0];
}

/**
 * Initialize all storage directories
 * Call this on application startup to ensure directories exist
 */
export function initializeStorage(): void {
  console.log('📁 Initializing storage directories...');

  const artifactsDir = getArtifactsDir();
  const uploadsDir = getUploadsDir();
  const blogDir = getBlogDir();
  const publicDir = getPublicDir();

  console.log(`   Artifacts: ${artifactsDir}`);
  console.log(`   Uploads: ${uploadsDir}`);
  console.log(`   Blog: ${blogDir}`);
  console.log(`   Public: ${publicDir}`);

  if (isProductionWithVolume()) {
    console.log('✅ Using Railway persistent volume at /data');
  } else {
    console.log('⚠️  Using local storage (ephemeral)');
  }
}
