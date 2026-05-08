import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync, mkdirSync } from 'fs';
import {
  isProductionWithVolume,
  getUploadsDir,
  getDataDir,
  getBlogDir,
  getContentIndexDir,
  getPublicDir,
  initializeStorage,
} from './storage.js';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

const mockedExistsSync = vi.mocked(existsSync);
const mockedMkdirSync = vi.mocked(mkdirSync);

beforeEach(() => {
  vi.resetAllMocks();
  delete process.env.NODE_ENV;
});

describe('isProductionWithVolume', () => {
  it('returns true when NODE_ENV is production and /data exists', () => {
    process.env.NODE_ENV = 'production';
    mockedExistsSync.mockImplementation((p) => p === '/data');

    expect(isProductionWithVolume()).toBe(true);
  });

  it('returns false when NODE_ENV is not production', () => {
    process.env.NODE_ENV = 'development';
    mockedExistsSync.mockReturnValue(true);

    expect(isProductionWithVolume()).toBe(false);
  });

  it('returns false when /data does not exist', () => {
    process.env.NODE_ENV = 'production';
    mockedExistsSync.mockReturnValue(false);

    expect(isProductionWithVolume()).toBe(false);
  });

  it('returns false when NODE_ENV is undefined', () => {
    mockedExistsSync.mockReturnValue(true);

    expect(isProductionWithVolume()).toBe(false);
  });
});

describe('getUploadsDir', () => {
  it('returns /data/uploads in production with volume', () => {
    process.env.NODE_ENV = 'production';
    mockedExistsSync.mockImplementation((p) => p === '/data');

    const result = getUploadsDir();

    expect(result).toBe('/data/uploads');
    expect(mockedMkdirSync).toHaveBeenCalledWith('/data/uploads', { recursive: true });
  });

  it('skips mkdir when /data/uploads already exists', () => {
    process.env.NODE_ENV = 'production';
    mockedExistsSync.mockReturnValue(true);

    const result = getUploadsDir();

    expect(result).toBe('/data/uploads');
    expect(mockedMkdirSync).not.toHaveBeenCalled();
  });

  it('returns default local fallback in non-production', () => {
    process.env.NODE_ENV = 'development';
    mockedExistsSync.mockReturnValue(false);

    const result = getUploadsDir();

    expect(result).toContain('apps/bot/public/uploads');
    expect(mockedMkdirSync).toHaveBeenCalledWith(expect.stringContaining('apps/bot/public/uploads'), { recursive: true });
  });

  it('uses custom local fallback when provided', () => {
    process.env.NODE_ENV = 'development';
    mockedExistsSync.mockReturnValue(false);

    const result = getUploadsDir('/custom/uploads');

    expect(result).toBe('/custom/uploads');
    expect(mockedMkdirSync).toHaveBeenCalledWith('/custom/uploads', { recursive: true });
  });

  it('skips mkdir when local fallback already exists', () => {
    process.env.NODE_ENV = 'development';
    mockedExistsSync.mockReturnValue(true);

    const result = getUploadsDir('/custom/uploads');

    expect(result).toBe('/custom/uploads');
    expect(mockedMkdirSync).not.toHaveBeenCalled();
  });
});

describe('getDataDir', () => {
  it('returns /data/{name} in production with volume', () => {
    process.env.NODE_ENV = 'production';
    mockedExistsSync.mockImplementation((p) => p === '/data');

    const result = getDataDir('cache');

    expect(result).toBe('/data/cache');
    expect(mockedMkdirSync).toHaveBeenCalledWith('/data/cache', { recursive: true });
  });

  it('returns default local fallback in non-production', () => {
    process.env.NODE_ENV = 'development';
    mockedExistsSync.mockReturnValue(false);

    const result = getDataDir('cache');

    expect(result).toContain('apps/bot/data/cache');
  });

  it('uses custom local fallback when provided', () => {
    process.env.NODE_ENV = 'development';
    mockedExistsSync.mockReturnValue(false);

    const result = getDataDir('cache', '/custom/cache');

    expect(result).toBe('/custom/cache');
  });
});

describe('getBlogDir', () => {
  it('returns /data/blog in production with volume', () => {
    process.env.NODE_ENV = 'production';
    mockedExistsSync.mockImplementation((p) => p === '/data');

    const result = getBlogDir();

    expect(result).toBe('/data/blog');
    expect(mockedMkdirSync).toHaveBeenCalledWith('/data/blog', { recursive: true });
  });

  it('returns default local fallback in non-production', () => {
    process.env.NODE_ENV = 'development';
    mockedExistsSync.mockReturnValue(false);

    const result = getBlogDir();

    expect(result).toContain('content/blog');
  });

  it('uses custom local fallback when provided', () => {
    process.env.NODE_ENV = 'development';
    mockedExistsSync.mockReturnValue(false);

    const result = getBlogDir('/custom/blog');

    expect(result).toBe('/custom/blog');
  });
});

describe('getContentIndexDir', () => {
  it('returns /data/content-index in production with volume', () => {
    process.env.NODE_ENV = 'production';
    mockedExistsSync.mockImplementation((p) => p === '/data');

    const result = getContentIndexDir();

    expect(result).toBe('/data/content-index');
    expect(mockedMkdirSync).toHaveBeenCalledWith('/data/content-index', { recursive: true });
  });

  it('returns default local fallback in non-production', () => {
    process.env.NODE_ENV = 'development';
    mockedExistsSync.mockReturnValue(false);

    const result = getContentIndexDir();

    expect(result).toContain('content/index');
  });

  it('uses custom local fallback when provided', () => {
    process.env.NODE_ENV = 'development';
    mockedExistsSync.mockReturnValue(false);

    const result = getContentIndexDir('/custom/index');

    expect(result).toBe('/custom/index');
  });
});

describe('getPublicDir', () => {
  it('returns the first existing path from candidates', () => {
    mockedExistsSync.mockImplementation((p) => {
      return typeof p === 'string' && p.includes('apps/bot/public');
    });

    const result = getPublicDir();

    expect(result).toContain('apps/bot/public');
  });

  it('returns fallback path when no candidate exists', () => {
    mockedExistsSync.mockReturnValue(false);

    const result = getPublicDir();

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('initializeStorage', () => {
  it('calls all directory getters and logs output', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedExistsSync.mockReturnValue(false);

    initializeStorage();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Initializing storage'));

    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('logs Railway volume message in production', () => {
    process.env.NODE_ENV = 'production';
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedExistsSync.mockReturnValue(true);

    initializeStorage();

    const logCalls = consoleSpy.mock.calls.map((c) => c[0]);
    expect(logCalls.some((msg: string) => msg.includes('Railway persistent volume'))).toBe(true);

    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('logs ephemeral storage message in non-production', () => {
    process.env.NODE_ENV = 'development';
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedExistsSync.mockReturnValue(false);

    initializeStorage();

    const logCalls = consoleSpy.mock.calls.map((c) => c[0]);
    expect(logCalls.some((msg: string) => msg.includes('ephemeral'))).toBe(true);

    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
