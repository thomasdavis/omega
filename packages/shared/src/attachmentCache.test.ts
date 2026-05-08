import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractAttachmentId,
  setCachedAttachment,
  getCachedAttachment,
  clearAttachmentCache,
  getAttachmentCacheStats,
  type CachedAttachment,
} from './attachmentCache.js';

vi.spyOn(console, 'log').mockImplementation(() => {});

beforeEach(() => {
  clearAttachmentCache();
});

function makeCachedAttachment(overrides: Partial<CachedAttachment> = {}): CachedAttachment {
  return {
    buffer: Buffer.from('test-data'),
    mimeType: 'image/png',
    filename: 'test.png',
    size: 9,
    url: 'https://cdn.discordapp.com/attachments/111/222/test.png',
    id: '222',
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('extractAttachmentId', () => {
  it('extracts attachment ID from a valid Discord CDN URL', () => {
    const url = 'https://cdn.discordapp.com/attachments/123456/789012/image.png';
    expect(extractAttachmentId(url)).toBe('789012');
  });

  it('extracts attachment ID from URL with query parameters', () => {
    const url = 'https://cdn.discordapp.com/attachments/123456/789012/image.png?ex=abc&is=def&hm=ghi';
    expect(extractAttachmentId(url)).toBe('789012');
  });

  it('returns null for non-attachment Discord URLs', () => {
    const url = 'https://cdn.discordapp.com/avatars/123456/avatar.png';
    expect(extractAttachmentId(url)).toBeNull();
  });

  it('returns null for non-Discord URLs', () => {
    expect(extractAttachmentId('https://example.com/file.png')).toBeNull();
  });

  it('returns null for invalid URLs', () => {
    expect(extractAttachmentId('not-a-url')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractAttachmentId('')).toBeNull();
  });

  it('returns null for attachment path with too few segments', () => {
    const url = 'https://cdn.discordapp.com/attachments/123456';
    expect(extractAttachmentId(url)).toBeNull();
  });
});

describe('setCachedAttachment and getCachedAttachment', () => {
  it('stores and retrieves an attachment by ID', () => {
    const cached = makeCachedAttachment();

    setCachedAttachment('222', cached);
    const result = getCachedAttachment('222');

    expect(result).not.toBeNull();
    expect(result!.filename).toBe('test.png');
    expect(result!.mimeType).toBe('image/png');
    expect(result!.size).toBe(9);
    expect(result!.buffer.toString()).toBe('test-data');
  });

  it('returns null for a non-existent ID', () => {
    expect(getCachedAttachment('nonexistent')).toBeNull();
  });

  it('overwrites existing entry with same ID', () => {
    const first = makeCachedAttachment({ filename: 'first.png' });
    const second = makeCachedAttachment({ filename: 'second.png' });

    setCachedAttachment('222', first);
    setCachedAttachment('222', second);

    const result = getCachedAttachment('222');
    expect(result!.filename).toBe('second.png');
  });

  it('stores multiple attachments independently', () => {
    setCachedAttachment('aaa', makeCachedAttachment({ id: 'aaa', filename: 'a.png' }));
    setCachedAttachment('bbb', makeCachedAttachment({ id: 'bbb', filename: 'b.png' }));

    expect(getCachedAttachment('aaa')!.filename).toBe('a.png');
    expect(getCachedAttachment('bbb')!.filename).toBe('b.png');
  });
});

describe('cache TTL expiry', () => {
  it('returns null for an expired entry', () => {
    const elevenMinutesAgo = Date.now() - 11 * 60 * 1000;
    const cached = makeCachedAttachment({ timestamp: elevenMinutesAgo });

    setCachedAttachment('expired', cached);

    expect(getCachedAttachment('expired')).toBeNull();
  });

  it('returns entry that is not yet expired', () => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const cached = makeCachedAttachment({ timestamp: fiveMinutesAgo });

    setCachedAttachment('valid', cached);

    expect(getCachedAttachment('valid')).not.toBeNull();
  });

  it('returns entry right at the TTL boundary', () => {
    const exactlyTenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const cached = makeCachedAttachment({ timestamp: exactlyTenMinutesAgo });

    setCachedAttachment('boundary', cached);

    // At exactly 10 minutes, Date.now() - timestamp === CACHE_TTL_MS, so NOT > TTL
    expect(getCachedAttachment('boundary')).not.toBeNull();
  });

  it('deletes expired entry from cache on access', () => {
    const elevenMinutesAgo = Date.now() - 11 * 60 * 1000;
    setCachedAttachment('expired', makeCachedAttachment({ timestamp: elevenMinutesAgo }));

    getCachedAttachment('expired');

    const stats = getAttachmentCacheStats();
    expect(stats.count).toBe(0);
  });
});

describe('clearAttachmentCache', () => {
  it('removes all entries from the cache', () => {
    setCachedAttachment('a', makeCachedAttachment({ id: 'a' }));
    setCachedAttachment('b', makeCachedAttachment({ id: 'b' }));
    setCachedAttachment('c', makeCachedAttachment({ id: 'c' }));

    clearAttachmentCache();

    expect(getAttachmentCacheStats().count).toBe(0);
    expect(getCachedAttachment('a')).toBeNull();
    expect(getCachedAttachment('b')).toBeNull();
    expect(getCachedAttachment('c')).toBeNull();
  });

  it('is safe to call on an already empty cache', () => {
    expect(() => clearAttachmentCache()).not.toThrow();
    expect(getAttachmentCacheStats().count).toBe(0);
  });
});

describe('getAttachmentCacheStats', () => {
  it('returns zero stats for an empty cache', () => {
    const stats = getAttachmentCacheStats();

    expect(stats.count).toBe(0);
    expect(stats.totalSize).toBe(0);
    expect(stats.urls).toEqual([]);
  });

  it('returns correct stats after adding entries', () => {
    setCachedAttachment('x', makeCachedAttachment({
      id: 'x',
      size: 100,
      url: 'https://cdn.discordapp.com/attachments/1/x/a.png',
    }));
    setCachedAttachment('y', makeCachedAttachment({
      id: 'y',
      size: 250,
      url: 'https://cdn.discordapp.com/attachments/1/y/b.png',
    }));

    const stats = getAttachmentCacheStats();

    expect(stats.count).toBe(2);
    expect(stats.totalSize).toBe(350);
    expect(stats.urls).toHaveLength(2);
    expect(stats.urls).toContain('x');
    expect(stats.urls).toContain('y');
  });

  it('reflects cache state after clearing', () => {
    setCachedAttachment('z', makeCachedAttachment({ id: 'z' }));
    clearAttachmentCache();

    const stats = getAttachmentCacheStats();
    expect(stats.count).toBe(0);
    expect(stats.totalSize).toBe(0);
  });
});
