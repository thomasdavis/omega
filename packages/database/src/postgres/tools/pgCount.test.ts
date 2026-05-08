/**
 * pgCount Tool Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the postgres client module
vi.mock('../client.js', () => ({
  getPostgresPool: vi.fn(),
  isValidTableName: vi.fn(),
  tableExists: vi.fn(),
}));

import { pgCountTool } from './pgCount.js';
import { getPostgresPool, isValidTableName, tableExists } from '../client.js';

const mockGetPool = vi.mocked(getPostgresPool);
const mockIsValidTableName = vi.mocked(isValidTableName);
const mockTableExists = vi.mocked(tableExists);

describe('pgCountTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should have correct metadata', () => {
    expect(pgCountTool.description).toContain('Count rows');
  });

  describe('execute', () => {
    it('should count all rows in a table without WHERE clause', async () => {
      mockIsValidTableName.mockReturnValue(true);
      mockTableExists.mockResolvedValue(true);

      const mockQuery = vi.fn().mockResolvedValue({
        rows: [{ count: '42' }],
      });
      mockGetPool.mockResolvedValue({ query: mockQuery } as any);

      const result = await pgCountTool.execute({ table: 'users' }, { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal });

      expect(result).toEqual({
        success: true,
        count: 42,
        table: 'users',
      });
      expect(mockQuery).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM users ', []);
    });

    it('should count rows with WHERE conditions', async () => {
      mockIsValidTableName.mockReturnValue(true);
      mockTableExists.mockResolvedValue(true);

      const mockQuery = vi.fn().mockResolvedValue({
        rows: [{ count: '10' }],
      });
      mockGetPool.mockResolvedValue({ query: mockQuery } as any);

      const result = await pgCountTool.execute(
        { table: 'users', where: { active: true, role: 'admin' } },
        { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal }
      );

      expect(result).toEqual({
        success: true,
        count: 10,
        table: 'users',
      });
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM users WHERE active = $1 AND role = $2',
        [true, 'admin']
      );
    });

    it('should return error for invalid table name', async () => {
      mockIsValidTableName.mockReturnValue(false);

      const result = await pgCountTool.execute(
        { table: 'invalid-table!' },
        { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal }
      );

      expect(result).toEqual({
        success: false,
        error: 'INVALID_TABLE_NAME',
        message: expect.stringContaining('invalid-table!'),
      });
      expect(mockGetPool).not.toHaveBeenCalled();
    });

    it('should return error when table does not exist', async () => {
      mockIsValidTableName.mockReturnValue(true);
      mockTableExists.mockResolvedValue(false);

      const result = await pgCountTool.execute(
        { table: 'nonexistent' },
        { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal }
      );

      expect(result).toEqual({
        success: false,
        error: 'TABLE_NOT_FOUND',
        message: expect.stringContaining('nonexistent'),
      });
      expect(mockGetPool).not.toHaveBeenCalled();
    });

    it('should handle empty WHERE conditions (count all)', async () => {
      mockIsValidTableName.mockReturnValue(true);
      mockTableExists.mockResolvedValue(true);

      const mockQuery = vi.fn().mockResolvedValue({
        rows: [{ count: '100' }],
      });
      mockGetPool.mockResolvedValue({ query: mockQuery } as any);

      const result = await pgCountTool.execute(
        { table: 'users', where: {} },
        { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal }
      );

      expect(result.success).toBe(true);
      expect(result.count).toBe(100);
      // Should not have WHERE clause
      expect(mockQuery).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM users ', []);
    });

    it('should handle query errors gracefully', async () => {
      mockIsValidTableName.mockReturnValue(true);
      mockTableExists.mockResolvedValue(true);

      const mockQuery = vi.fn().mockRejectedValue(new Error('Connection lost'));
      mockGetPool.mockResolvedValue({ query: mockQuery } as any);

      const result = await pgCountTool.execute(
        { table: 'users' },
        { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal }
      );

      expect(result).toEqual({
        success: false,
        error: 'COUNT_FAILED',
        message: expect.stringContaining('Connection lost'),
      });
    });

    it('should parse count as integer', async () => {
      mockIsValidTableName.mockReturnValue(true);
      mockTableExists.mockResolvedValue(true);

      const mockQuery = vi.fn().mockResolvedValue({
        rows: [{ count: '0' }],
      });
      mockGetPool.mockResolvedValue({ query: mockQuery } as any);

      const result = await pgCountTool.execute(
        { table: 'empty_table' },
        { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal }
      );

      expect(result.count).toBe(0);
      expect(typeof result.count).toBe('number');
    });
  });
});
