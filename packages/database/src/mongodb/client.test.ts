/**
 * MongoDB Client Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock mongodb module before imports
const mockConnect = vi.fn();
const mockClose = vi.fn();
const mockDb = vi.fn();
const mockListCollections = vi.fn();

vi.mock('mongodb', () => {
  return {
    MongoClient: vi.fn().mockImplementation(() => ({
      connect: mockConnect,
      close: mockClose,
      db: mockDb,
    })),
    Db: vi.fn(),
  };
});

// We need to re-import after each test to reset the singleton
// Use dynamic imports within tests

describe('MongoDB Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // Reset modules to clear singleton state
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMongoDatabase', () => {
    it('should create a new connection on first call', async () => {
      // Re-mock after resetModules
      vi.doMock('mongodb', () => ({
        MongoClient: vi.fn().mockImplementation(() => ({
          connect: vi.fn().mockResolvedValue(undefined),
          close: vi.fn(),
          db: vi.fn().mockReturnValue({ name: 'test_db' }),
        })),
        Db: vi.fn(),
      }));

      const { getMongoDatabase } = await import('./client.js');

      process.env.MONGO_URL = 'mongodb://localhost:27017/test_db';
      const db = await getMongoDatabase();

      expect(db).toBeDefined();
      expect(db.name).toBe('test_db');
    });

    it('should return cached connection on subsequent calls', async () => {
      const mockDbInstance = { name: 'cached_db' };
      let connectCalls = 0;

      vi.doMock('mongodb', () => ({
        MongoClient: vi.fn().mockImplementation(() => ({
          connect: vi.fn().mockImplementation(() => {
            connectCalls++;
            return Promise.resolve();
          }),
          close: vi.fn(),
          db: vi.fn().mockReturnValue(mockDbInstance),
        })),
        Db: vi.fn(),
      }));

      const { getMongoDatabase } = await import('./client.js');

      process.env.MONGO_URL = 'mongodb://localhost:27017/cached_db';

      const db1 = await getMongoDatabase();
      const db2 = await getMongoDatabase();

      expect(db1).toBe(db2);
      // MongoClient should only be instantiated once
      expect(connectCalls).toBe(1);
    });

    it('should use MONGO_URL environment variable', async () => {
      let capturedUri = '';

      vi.doMock('mongodb', () => ({
        MongoClient: vi.fn().mockImplementation((uri: string) => {
          capturedUri = uri;
          return {
            connect: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
            db: vi.fn().mockReturnValue({}),
          };
        }),
        Db: vi.fn(),
      }));

      const { getMongoDatabase } = await import('./client.js');

      process.env.MONGO_URL = 'mongodb://myhost:27017';
      delete process.env.MONGODB_URI;

      await getMongoDatabase();

      expect(capturedUri).toBe('mongodb://myhost:27017');
    });

    it('should fall back to MONGODB_URI when MONGO_URL is not set', async () => {
      let capturedUri = '';

      vi.doMock('mongodb', () => ({
        MongoClient: vi.fn().mockImplementation((uri: string) => {
          capturedUri = uri;
          return {
            connect: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
            db: vi.fn().mockReturnValue({}),
          };
        }),
        Db: vi.fn(),
      }));

      const { getMongoDatabase } = await import('./client.js');

      delete process.env.MONGO_URL;
      process.env.MONGODB_URI = 'mongodb://fallback:27017';

      await getMongoDatabase();

      expect(capturedUri).toBe('mongodb://fallback:27017');
    });

    it('should throw on connection failure', async () => {
      vi.doMock('mongodb', () => ({
        MongoClient: vi.fn().mockImplementation(() => ({
          connect: vi.fn().mockRejectedValue(new Error('Connection refused')),
          close: vi.fn(),
          db: vi.fn(),
        })),
        Db: vi.fn(),
      }));

      const { getMongoDatabase } = await import('./client.js');

      process.env.MONGO_URL = 'mongodb://badhost:27017';

      await expect(getMongoDatabase()).rejects.toThrow('MongoDB connection failed');
    });

    it('should extract database name from URI', async () => {
      let capturedDbName = '';

      vi.doMock('mongodb', () => ({
        MongoClient: vi.fn().mockImplementation(() => ({
          connect: vi.fn().mockResolvedValue(undefined),
          close: vi.fn(),
          db: vi.fn().mockImplementation((name: string) => {
            capturedDbName = name;
            return { name };
          }),
        })),
        Db: vi.fn(),
      }));

      const { getMongoDatabase } = await import('./client.js');

      delete process.env.MONGODB_DATABASE;
      process.env.MONGO_URL = 'mongodb://user:pass@host:27017/mydb';

      await getMongoDatabase();

      expect(capturedDbName).toBe('mydb');
    });
  });

  describe('isValidCollectionName', () => {
    // Import the function directly since it's synchronous and stateless
    it('should accept valid collection names', async () => {
      vi.doMock('mongodb', () => ({
        MongoClient: vi.fn(),
        Db: vi.fn(),
      }));

      const { isValidCollectionName } = await import('./client.js');

      expect(isValidCollectionName('users')).toBe(true);
      expect(isValidCollectionName('my_collection')).toBe(true);
      expect(isValidCollectionName('Data123')).toBe(true);
      expect(isValidCollectionName('a')).toBe(true);
    });

    it('should reject empty collection names', async () => {
      vi.doMock('mongodb', () => ({
        MongoClient: vi.fn(),
        Db: vi.fn(),
      }));

      const { isValidCollectionName } = await import('./client.js');

      expect(isValidCollectionName('')).toBe(false);
    });

    it('should reject collection names starting with "system."', async () => {
      vi.doMock('mongodb', () => ({
        MongoClient: vi.fn(),
        Db: vi.fn(),
      }));

      const { isValidCollectionName } = await import('./client.js');

      expect(isValidCollectionName('system.users')).toBe(false);
      expect(isValidCollectionName('system.indexes')).toBe(false);
    });

    it('should reject collection names with special characters', async () => {
      vi.doMock('mongodb', () => ({
        MongoClient: vi.fn(),
        Db: vi.fn(),
      }));

      const { isValidCollectionName } = await import('./client.js');

      expect(isValidCollectionName('my-collection')).toBe(false);
      expect(isValidCollectionName('my collection')).toBe(false);
      expect(isValidCollectionName('data.points')).toBe(false);
      expect(isValidCollectionName('col$name')).toBe(false);
    });
  });

  describe('closeMongoConnection', () => {
    it('should close an existing connection', async () => {
      const mockCloseFunc = vi.fn().mockResolvedValue(undefined);

      vi.doMock('mongodb', () => ({
        MongoClient: vi.fn().mockImplementation(() => ({
          connect: vi.fn().mockResolvedValue(undefined),
          close: mockCloseFunc,
          db: vi.fn().mockReturnValue({ name: 'test' }),
        })),
        Db: vi.fn(),
      }));

      const { getMongoDatabase, closeMongoConnection } = await import('./client.js');

      process.env.MONGO_URL = 'mongodb://localhost:27017';
      await getMongoDatabase();
      await closeMongoConnection();

      expect(mockCloseFunc).toHaveBeenCalledTimes(1);
    });

    it('should be safe to call when no connection exists', async () => {
      vi.doMock('mongodb', () => ({
        MongoClient: vi.fn(),
        Db: vi.fn(),
      }));

      const { closeMongoConnection } = await import('./client.js');

      // Should not throw
      await expect(closeMongoConnection()).resolves.toBeUndefined();
    });
  });
});
