/**
 * Attachment Cache
 * Stores Discord attachment buffers in memory for immediate tool access
 * Prevents issues with expired CDN URLs
 */

interface CachedAttachment {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  size: number;
  url: string;
  timestamp: number;
}

// In-memory cache with TTL
const attachmentCache = new Map<string, CachedAttachment>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Download and cache a Discord attachment
 */
export async function cacheAttachment(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`❌ Failed to cache attachment ${filename}: ${response.status} ${response.statusText}`);
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const mimeType = response.headers.get('content-type') || 'application/octet-stream';

    attachmentCache.set(url, {
      buffer,
      mimeType,
      filename,
      size: buffer.length,
      url,
      timestamp: Date.now(),
    });

    console.log(`   ✅ Cached attachment: ${filename} (${(buffer.length / 1024).toFixed(2)} KB)`);

    // Clean old entries
    cleanExpiredCache();
  } catch (error) {
    console.error(`❌ Error caching attachment ${filename}:`, error);
  }
}

/**
 * Get a cached attachment by URL
 */
export function getCachedAttachment(url: string): CachedAttachment | null {
  const cached = attachmentCache.get(url);

  if (!cached) {
    return null;
  }

  // Check if expired
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    attachmentCache.delete(url);
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
