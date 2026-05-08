/**
 * pgListTables Tool Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the postgres client module
vi.mock('../client.js', () => ({
  getPostgresPool: vi.fn(),
}));

import { pgListTablesTool } from './pgListTables.js';
import { getPostgresPool } from '../client.js';

const mockGetPool = vi.mocked(getPostgresPool);

describe('pgListTablesTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should have correct metadata', () => {
    expect(pgListTablesTool.description).toContain('List all tables');
  });

  describe('execute', () => {
    it('should list tables excluding system tables by default', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        rows: [
          { table_name: 'messages' },
          { table_name: 'users' },
          { table_name: 'queries' },
        ],
      });
      mockGetPool.mockResolvedValue({ query: mockQuery } as any);

      const result = await pgListTablesTool.execute(
        { includeSystemTables: false },
        { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal }
      );

      expect(result).toEqual({
        success: true,
        tables: ['messages', 'users', 'queries'],
        count: 3,
      });

      // Should filter out pg_ tables
      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain("NOT LIKE 'pg_%'");
    });

    it('should include system tables when requested', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        rows: [
          { table_name: 'messages' },
          { table_name: 'pg_stat' },
          { table_name: 'users' },
        ],
      });
      mockGetPool.mockResolvedValue({ query: mockQuery } as any);

      const result = await pgListTablesTool.execute(
        { includeSystemTables: true },
        { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal }
      );

      expect(result.success).toBe(true);
      expect(result.tables).toContain('pg_stat');

      // Should not filter out pg_ tables
      const sql = mockQuery.mock.calls[0][0];
      expect(sql).not.toContain("NOT LIKE 'pg_%'");
    });

    it('should return empty list when no tables exist', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        rows: [],
      });
      mockGetPool.mockResolvedValue({ query: mockQuery } as any);

      const result = await pgListTablesTool.execute(
        { includeSystemTables: false },
        { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal }
      );

      expect(result).toEqual({
        success: true,
        tables: [],
        count: 0,
      });
    });

    it('should query the public schema', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        rows: [],
      });
      mockGetPool.mockResolvedValue({ query: mockQuery } as any);

      await pgListTablesTool.execute(
        { includeSystemTables: false },
        { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal }
      );

      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain("table_schema = 'public'");
    });

    it('should order tables by name', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        rows: [
          { table_name: 'alpha' },
          { table_name: 'beta' },
        ],
      });
      mockGetPool.mockResolvedValue({ query: mockQuery } as any);

      await pgListTablesTool.execute(
        { includeSystemTables: false },
        { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal }
      );

      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain('ORDER BY table_name');
    });

    it('should handle query errors gracefully', async () => {
      const mockQuery = vi.fn().mockRejectedValue(new Error('Permission denied'));
      mockGetPool.mockResolvedValue({ query: mockQuery } as any);

      const result = await pgListTablesTool.execute(
        { includeSystemTables: false },
        { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal }
      );

      expect(result).toEqual({
        success: false,
        error: 'LIST_TABLES_FAILED',
        message: expect.stringContaining('Permission denied'),
      });
    });

    it('should handle pool connection errors', async () => {
      mockGetPool.mockRejectedValue(new Error('Pool connection failed'));

      const result = await pgListTablesTool.execute(
        { includeSystemTables: false },
        { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal }
      );

      expect(result).toEqual({
        success: false,
        error: 'LIST_TABLES_FAILED',
        message: expect.stringContaining('Pool connection failed'),
      });
    });
  });
});
