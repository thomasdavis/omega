/**
 * PostgreSQL Client Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('PostgreSQL Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPostgresPool', () => {
    it('should create a new pool on first call', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [{ now: '2026-05-08' }] }),
        release: vi.fn(),
      };
      const mockPool = {
        connect: vi.fn().mockResolvedValue(mockClient),
        query: vi.fn(),
        end: vi.fn(),
        on: vi.fn(),
      };

      vi.doMock('pg', () => ({
        Pool: vi.fn().mockImplementation(() => mockPool),
      }));

      const { getPostgresPool } = await import('./client.js');

      process.env.POSTGRES_URL = 'postgresql://user:pass@localhost:5432/testdb';

      const pool = await getPostgresPool();

      expect(pool).toBeDefined();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT NOW()');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return cached pool on subsequent calls', async () => {
      let poolCreateCount = 0;
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [{ now: '2026-05-08' }] }),
        release: vi.fn(),
      };

      vi.doMock('pg', () => ({
        Pool: vi.fn().mockImplementation(() => {
          poolCreateCount++;
          return {
            connect: vi.fn().mockResolvedValue(mockClient),
            query: vi.fn(),
            end: vi.fn(),
            on: vi.fn(),
          };
        }),
      }));

      const { getPostgresPool } = await import('./client.js');

      process.env.POSTGRES_URL = 'postgresql://user:pass@localhost:5432/testdb';

      const pool1 = await getPostgresPool();
      const pool2 = await getPostgresPool();

      expect(pool1).toBe(pool2);
      expect(poolCreateCount).toBe(1);
    });

    it('should use POSTGRES_URL first', async () => {
      let capturedConfig: any = null;
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [{ now: '2026-05-08' }] }),
        release: vi.fn(),
      };

      vi.doMock('pg', () => ({
        Pool: vi.fn().mockImplementation((config: any) => {
          capturedConfig = config;
          return {
            connect: vi.fn().mockResolvedValue(mockClient),
            query: vi.fn(),
            end: vi.fn(),
            on: vi.fn(),
          };
        }),
      }));

      const { getPostgresPool } = await import('./client.js');

      process.env.POSTGRES_URL = 'postgresql://postgres:pw@host1:5432/db1';
      process.env.DATABASE_PUBLIC_URL = 'postgresql://postgres:pw@host2:5432/db2';

      await getPostgresPool();

      expect(capturedConfig.connectionString).toBe('postgresql://postgres:pw@host1:5432/db1');
    });

    it('should fall back to DATABASE_PUBLIC_URL', async () => {
      let capturedConfig: any = null;
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [{ now: '2026-05-08' }] }),
        release: vi.fn(),
      };

      vi.doMock('pg', () => ({
        Pool: vi.fn().mockImplementation((config: any) => {
          capturedConfig = config;
          return {
            connect: vi.fn().mockResolvedValue(mockClient),
            query: vi.fn(),
            end: vi.fn(),
            on: vi.fn(),
          };
        }),
      }));

      const { getPostgresPool } = await import('./client.js');

      delete process.env.POSTGRES_URL;
      process.env.DATABASE_PUBLIC_URL = 'postgresql://postgres:pw@host2:5432/db2';

      await getPostgresPool();

      expect(capturedConfig.connectionString).toBe('postgresql://postgres:pw@host2:5432/db2');
    });

    it('should throw when no connection string is set', async () => {
      vi.doMock('pg', () => ({
        Pool: vi.fn(),
      }));

      const { getPostgresPool } = await import('./client.js');

      delete process.env.POSTGRES_URL;
      delete process.env.DATABASE_PUBLIC_URL;
      delete process.env.DATABASE_URL;

      await expect(getPostgresPool()).rejects.toThrow(
        'POSTGRES_URL, DATABASE_PUBLIC_URL, or DATABASE_URL environment variable not set'
      );
    });

    it('should throw and reset pool when connection test fails', async () => {
      const mockClient = {
        query: vi.fn().mockRejectedValue(new Error('auth failed')),
        release: vi.fn(),
      };

      vi.doMock('pg', () => ({
        Pool: vi.fn().mockImplementation(() => ({
          connect: vi.fn().mockResolvedValue(mockClient),
          query: vi.fn(),
          end: vi.fn(),
          on: vi.fn(),
        })),
      }));

      const { getPostgresPool } = await import('./client.js');

      process.env.POSTGRES_URL = 'postgresql://user:wrong@localhost:5432/testdb';

      await expect(getPostgresPool()).rejects.toThrow('auth failed');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should register an error handler on the pool', async () => {
      let registeredHandler: any = null;
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [{ now: '2026-05-08' }] }),
        release: vi.fn(),
      };

      vi.doMock('pg', () => ({
        Pool: vi.fn().mockImplementation(() => ({
          connect: vi.fn().mockResolvedValue(mockClient),
          query: vi.fn(),
          end: vi.fn(),
          on: vi.fn().mockImplementation((event: string, handler: any) => {
            if (event === 'error') {
              registeredHandler = handler;
            }
          }),
        })),
      }));

      const { getPostgresPool } = await import('./client.js');

      process.env.POSTGRES_URL = 'postgresql://user:pass@localhost:5432/testdb';
      await getPostgresPool();

      expect(registeredHandler).toBeDefined();
      // The handler should not throw
      registeredHandler(new Error('idle client error'));
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('PostgreSQL pool idle client error'),
        'idle client error'
      );
    });
  });

  describe('isValidTableName', () => {
    it('should accept valid table names', async () => {
      vi.doMock('pg', () => ({ Pool: vi.fn() }));
      const { isValidTableName } = await import('./client.js');

      expect(isValidTableName('users')).toBe(true);
      expect(isValidTableName('user_profiles')).toBe(true);
      expect(isValidTableName('_private')).toBe(true);
      expect(isValidTableName('Table123')).toBe(true);
    });

    it('should reject empty names', async () => {
      vi.doMock('pg', () => ({ Pool: vi.fn() }));
      const { isValidTableName } = await import('./client.js');

      expect(isValidTableName('')).toBe(false);
    });

    it('should reject names starting with pg_', async () => {
      vi.doMock('pg', () => ({ Pool: vi.fn() }));
      const { isValidTableName } = await import('./client.js');

      expect(isValidTableName('pg_catalog')).toBe(false);
      expect(isValidTableName('pg_stat')).toBe(false);
    });

    it('should reject information_schema', async () => {
      vi.doMock('pg', () => ({ Pool: vi.fn() }));
      const { isValidTableName } = await import('./client.js');

      expect(isValidTableName('information_schema')).toBe(false);
    });

    it('should reject names with special characters', async () => {
      vi.doMock('pg', () => ({ Pool: vi.fn() }));
      const { isValidTableName } = await import('./client.js');

      expect(isValidTableName('my-table')).toBe(false);
      expect(isValidTableName('my table')).toBe(false);
      expect(isValidTableName('table.name')).toBe(false);
      expect(isValidTableName('123table')).toBe(false);
    });
  });

  describe('isValidColumnName', () => {
    it('should accept valid column names', async () => {
      vi.doMock('pg', () => ({ Pool: vi.fn() }));
      const { isValidColumnName } = await import('./client.js');

      expect(isValidColumnName('id')).toBe(true);
      expect(isValidColumnName('user_name')).toBe(true);
      expect(isValidColumnName('_id')).toBe(true);
      expect(isValidColumnName('Col123')).toBe(true);
    });

    it('should reject empty names', async () => {
      vi.doMock('pg', () => ({ Pool: vi.fn() }));
      const { isValidColumnName } = await import('./client.js');

      expect(isValidColumnName('')).toBe(false);
    });

    it('should reject names with special characters', async () => {
      vi.doMock('pg', () => ({ Pool: vi.fn() }));
      const { isValidColumnName } = await import('./client.js');

      expect(isValidColumnName('my-col')).toBe(false);
      expect(isValidColumnName('my col')).toBe(false);
      expect(isValidColumnName('1col')).toBe(false);
    });
  });

  describe('closePostgresPool', () => {
    it('should close an existing pool', async () => {
      const mockEnd = vi.fn().mockResolvedValue(undefined);
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [{ now: '2026-05-08' }] }),
        release: vi.fn(),
      };

      vi.doMock('pg', () => ({
        Pool: vi.fn().mockImplementation(() => ({
          connect: vi.fn().mockResolvedValue(mockClient),
          query: vi.fn(),
          end: mockEnd,
          on: vi.fn(),
        })),
      }));

      const { getPostgresPool, closePostgresPool } = await import('./client.js');

      process.env.POSTGRES_URL = 'postgresql://user:pass@localhost:5432/testdb';
      await getPostgresPool();
      await closePostgresPool();

      expect(mockEnd).toHaveBeenCalledTimes(1);
    });

    it('should be safe to call when no pool exists', async () => {
      vi.doMock('pg', () => ({
        Pool: vi.fn(),
      }));

      const { closePostgresPool } = await import('./client.js');

      // Should not throw
      await expect(closePostgresPool()).resolves.toBeUndefined();
    });

    it('should handle errors during close gracefully', async () => {
      const mockEnd = vi.fn().mockRejectedValue(new Error('close failed'));
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [{ now: '2026-05-08' }] }),
        release: vi.fn(),
      };

      vi.doMock('pg', () => ({
        Pool: vi.fn().mockImplementation(() => ({
          connect: vi.fn().mockResolvedValue(mockClient),
          query: vi.fn(),
          end: mockEnd,
          on: vi.fn(),
        })),
      }));

      const { getPostgresPool, closePostgresPool } = await import('./client.js');

      process.env.POSTGRES_URL = 'postgresql://user:pass@localhost:5432/testdb';
      await getPostgresPool();

      // Should not throw
      await expect(closePostgresPool()).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error closing PostgreSQL pool'),
        expect.any(Error)
      );
    });
  });
});
