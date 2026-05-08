/**
 * mongoCount Tool Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the mongodb client module
vi.mock('../client.js', () => ({
  getMongoDatabase: vi.fn(),
  isValidCollectionName: vi.fn(),
  collectionExists: vi.fn(),
}));

import { mongoCountTool } from './mongoCount.js';
import { getMongoDatabase, isValidCollectionName, collectionExists } from '../client.js';

const mockGetDb = vi.mocked(getMongoDatabase);
const mockIsValidName = vi.mocked(isValidCollectionName);
const mockCollectionExists = vi.mocked(collectionExists);

describe('mongoCountTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should have correct metadata', () => {
    expect(mongoCountTool.description).toContain('Count documents');
  });

  describe('execute', () => {
    it('should count all documents with empty filter', async () => {
      mockIsValidName.mockReturnValue(true);
      mockCollectionExists.mockResolvedValue(true);

      const mockCountDocuments = vi.fn().mockResolvedValue(25);
      const mockCollection = vi.fn().mockReturnValue({
        countDocuments: mockCountDocuments,
      });
      mockGetDb.mockResolvedValue({
        collection: mockCollection,
      } as any);

      const result = await mongoCountTool.execute(
        { collection: 'users', filter: {} },
        { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal }
      );

      expect(result).toEqual({
        success: true,
        count: 25,
        collection: 'users',
        filter: {},
      });
      expect(mockCollection).toHaveBeenCalledWith('users');
      expect(mockCountDocuments).toHaveBeenCalledWith({});
    });

    it('should count documents matching a filter', async () => {
      mockIsValidName.mockReturnValue(true);
      mockCollectionExists.mockResolvedValue(true);

      const mockCountDocuments = vi.fn().mockResolvedValue(5);
      const mockCollection = vi.fn().mockReturnValue({
        countDocuments: mockCountDocuments,
      });
      mockGetDb.mockResolvedValue({
        collection: mockCollection,
      } as any);

      const filter = { status: 'active', age: { $gt: 18 } };
      const result = await mongoCountTool.execute(
        { collection: 'users', filter },
        { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal }
      );

      expect(result).toEqual({
        success: true,
        count: 5,
        collection: 'users',
        filter,
      });
      expect(mockCountDocuments).toHaveBeenCalledWith(filter);
    });

    it('should return error for invalid collection name', async () => {
      mockIsValidName.mockReturnValue(false);

      const result = await mongoCountTool.execute(
        { collection: 'invalid-name!', filter: {} },
        { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal }
      );

      expect(result).toEqual({
        success: false,
        error: 'INVALID_COLLECTION_NAME',
        message: expect.stringContaining('invalid-name!'),
      });
      expect(mockGetDb).not.toHaveBeenCalled();
    });

    it('should return error when collection does not exist', async () => {
      mockIsValidName.mockReturnValue(true);
      mockCollectionExists.mockResolvedValue(false);

      const result = await mongoCountTool.execute(
        { collection: 'nonexistent', filter: {} },
        { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal }
      );

      expect(result).toEqual({
        success: false,
        error: 'COLLECTION_NOT_FOUND',
        message: expect.stringContaining('nonexistent'),
      });
      expect(mockGetDb).not.toHaveBeenCalled();
    });

    it('should return count of 0 for empty collection', async () => {
      mockIsValidName.mockReturnValue(true);
      mockCollectionExists.mockResolvedValue(true);

      const mockCountDocuments = vi.fn().mockResolvedValue(0);
      mockGetDb.mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          countDocuments: mockCountDocuments,
        }),
      } as any);

      const result = await mongoCountTool.execute(
        { collection: 'empty_col', filter: {} },
        { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal }
      );

      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      mockIsValidName.mockReturnValue(true);
      mockCollectionExists.mockResolvedValue(true);

      const mockCountDocuments = vi.fn().mockRejectedValue(new Error('DB connection lost'));
      mockGetDb.mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          countDocuments: mockCountDocuments,
        }),
      } as any);

      const result = await mongoCountTool.execute(
        { collection: 'users', filter: {} },
        { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal }
      );

      expect(result).toEqual({
        success: false,
        error: 'COUNT_FAILED',
        message: expect.stringContaining('DB connection lost'),
      });
    });

    it('should handle getMongoDatabase failure', async () => {
      mockIsValidName.mockReturnValue(true);
      mockCollectionExists.mockResolvedValue(true);
      mockGetDb.mockRejectedValue(new Error('Not connected'));

      const result = await mongoCountTool.execute(
        { collection: 'users', filter: {} },
        { toolCallId: 'test', messages: [], abortSignal: new AbortController().signal }
      );

      expect(result).toEqual({
        success: false,
        error: 'COUNT_FAILED',
        message: expect.stringContaining('Not connected'),
      });
    });
  });
});
