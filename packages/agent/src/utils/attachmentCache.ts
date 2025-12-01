/**
 * Attachment Cache
 * Stores Discord attachment buffers in memory for immediate tool access
 * Prevents issues with expired CDN URLs
 */

export interface CachedAttachment {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  size: number;
  url: string;
  id: string;
  timestamp: number;
}

// In-memory cache with TTL - keyed by attachment ID (not URL, as URLs change)
const attachmentCache = new Map<string, CachedAttachment>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Extract attachment ID from Discord CDN URL
 * Discord URLs are like: https://cdn.discordapp.com/attachments/{channel_id}/{attachment_id}/{filename}?...
 */
export function extractAttachmentId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    // Path format: /attachments/{channel_id}/{attachment_id}/{filename}
    if (pathParts[1] === 'attachments' && pathParts.length >= 4) {
      return pathParts[3]; // attachment_id
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Download and cache a Discord attachment
 * Uses bot token for authentication to access potentially expired URLs
 * NOTE: This function is deprecated - use messageHandler's REST API fetching instead
 */
export async function cacheAttachment(url: string, filename: string): Promise<void> {
  try {
    // Extract attachment ID from URL
    const id = extractAttachmentId(url);
    if (!id) {
      console.error(`❌ Failed to extract attachment ID from URL: ${url}`);
      return;
    }

    // Try with Discord bot token for authentication if it's a Discord CDN URL
    const headers: Record<string, string> = {};
    if (url.includes('cdn.discordapp.com') && process.env.DISCORD_BOT_TOKEN) {
      headers['Authorization'] = `Bot ${process.env.DISCORD_BOT_TOKEN}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error(`❌ Failed to cache attachment ${filename}: ${response.status} ${response.statusText}`);
      console.error(`   URL: ${url.substring(0, 100)}...`);
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const mimeType = response.headers.get('content-type') || 'application/octet-stream';

    attachmentCache.set(id, {
      buffer,
      mimeType,
      filename,
      size: buffer.length,
      url,
      id,
      timestamp: Date.now(),
    });

    console.log(`   ✅ Cached attachment: ${filename} (${(buffer.length / 1024).toFixed(2)} KB) [ID: ${id}]`);

    // Clean old entries
    cleanExpiredCache();
  } catch (error) {
    console.error(`❌ Error caching attachment ${filename}:`, error);
  }
}

/**
 * Manually set a cached attachment (for durable URL downloads)
 * Uses attachment ID as key (stable across Discord, unlike URLs which have changing query params)
 */
export function setCachedAttachment(id: string, cached: CachedAttachment): void {
  attachmentCache.set(id, cached);
  console.log(`   ✅ Cached attachment: ${cached.filename} (${(cached.size / 1024).toFixed(2)} KB) [ID: ${id}]`);
}

/**
 * Get a cached attachment by ID
 * ID is extracted from Discord attachment URL or provided directly
 */
export function getCachedAttachment(id: string): CachedAttachment | null {
  const cached = attachmentCache.get(id);

  if (!cached) {
    return null;
  }

  // Check if expired
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    attachmentCache.delete(id);
    return null;
  }

  return cached;
}

/**
 * Clean expired cache entries
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  let deletedCount = 0;

  for (const [url, cached] of attachmentCache.entries()) {
    if (now - cached.timestamp > CACHE_TTL_MS) {
      attachmentCache.delete(url);
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    console.log(`   🧹 Cleaned ${deletedCount} expired attachment(s) from cache`);
  }
}

/**
 * Clear all cached attachments
 */
export function clearAttachmentCache(): void {
  const count = attachmentCache.size;
  attachmentCache.clear();
  console.log(`   🧹 Cleared ${count} attachment(s) from cache`);
}

/**
 * Get cache stats
 */
export function getAttachmentCacheStats(): {
  count: number;
  totalSize: number;
  urls: string[];
} {
  let totalSize = 0;
  const urls: string[] = [];

  for (const [url, cached] of attachmentCache.entries()) {
    totalSize += cached.size;
    urls.push(url);
  }

  return {
    count: attachmentCache.size,
    totalSize,
    urls,
  };
}
