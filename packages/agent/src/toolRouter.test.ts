/**
 * Unit tests for Tool Router - selectTools and buildSearchQuery
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the searchIndex module
vi.mock('./toolRegistry/searchIndex.js', () => ({
  searchTools: vi.fn(),
}));

// Mock the metadata module
vi.mock('./toolRegistry/metadata.js', () => ({
  CORE_TOOLS: ['search', 'calculator', 'webFetch'],
}));

import { selectTools } from './toolRouter.js';
import { searchTools } from './toolRegistry/searchIndex.js';
import { CORE_TOOLS } from './toolRegistry/metadata.js';

describe('toolRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.log output from DEBUG mode
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('selectTools', () => {
    it('should always include core tools in the result', async () => {
      vi.mocked(searchTools).mockResolvedValue([]);

      const result = await selectTools('hello world');

      expect(result).toContain('search');
      expect(result).toContain('calculator');
      expect(result).toContain('webFetch');
    });

    it('should append BM25 results after core tools', async () => {
      vi.mocked(searchTools).mockResolvedValue(['weather', 'locationMap']);

      const result = await selectTools('what is the weather');

      // Core tools come first
      expect(result[0]).toBe('search');
      expect(result[1]).toBe('calculator');
      expect(result[2]).toBe('webFetch');
      // BM25 results come after
      expect(result).toContain('weather');
      expect(result).toContain('locationMap');
    });

    it('should deduplicate tools when BM25 returns core tool IDs', async () => {
      vi.mocked(searchTools).mockResolvedValue(['search', 'weather', 'calculator']);

      const result = await selectTools('search for something');

      // Core tools appear exactly once
      const searchCount = result.filter(id => id === 'search').length;
      const calculatorCount = result.filter(id => id === 'calculator').length;
      expect(searchCount).toBe(1);
      expect(calculatorCount).toBe(1);
      // Non-core BM25 tool is still included
      expect(result).toContain('weather');
    });

    it('should pass the current message to searchTools', async () => {
      vi.mocked(searchTools).mockResolvedValue([]);

      await selectTools('calculate 2+2');

      expect(searchTools).toHaveBeenCalledWith(
        'calculate 2+2',
        20 // CONFIG.MAX_TOOLS
      );
    });

    it('should build a weighted query when recentMessages are provided', async () => {
      vi.mocked(searchTools).mockResolvedValue([]);

      await selectTools('what is the weather', ['I was talking about travel', 'planning a trip']);

      // buildSearchQuery doubles the current message and appends context
      // With CONTEXT_MESSAGES=2, both recent messages should be included
      expect(searchTools).toHaveBeenCalledWith(
        'what is the weather what is the weather I was talking about travel planning a trip',
        20
      );
    });

    it('should only use the last N context messages based on CONTEXT_MESSAGES config', async () => {
      vi.mocked(searchTools).mockResolvedValue([]);

      // Pass more than CONTEXT_MESSAGES (2) recent messages
      await selectTools('current query', ['msg1', 'msg2', 'msg3', 'msg4']);

      // buildSearchQuery takes last 2 messages (CONTEXT_MESSAGES=2)
      expect(searchTools).toHaveBeenCalledWith(
        'current query current query msg3 msg4',
        20
      );
    });

    it('should not double the message when no recentMessages are provided', async () => {
      vi.mocked(searchTools).mockResolvedValue([]);

      await selectTools('simple query');

      // Without recent messages, query is just the current message (no doubling)
      expect(searchTools).toHaveBeenCalledWith('simple query', 20);
    });

    it('should not double the message when recentMessages is empty array', async () => {
      vi.mocked(searchTools).mockResolvedValue([]);

      await selectTools('simple query', []);

      expect(searchTools).toHaveBeenCalledWith('simple query', 20);
    });

    it('should limit total tools to MAX_TOOLS + CORE_TOOLS count', async () => {
      // Return many BM25 results
      const manyTools = Array.from({ length: 30 }, (_, i) => `tool${i}`);
      vi.mocked(searchTools).mockResolvedValue(manyTools);

      const result = await selectTools('lots of tools');

      // Max should be CONFIG.MAX_TOOLS (20) + CORE_TOOLS.length (3) = 23
      expect(result.length).toBeLessThanOrEqual(20 + CORE_TOOLS.length);
    });

    it('should handle empty search results gracefully', async () => {
      vi.mocked(searchTools).mockResolvedValue([]);

      const result = await selectTools('obscure query');

      // Should still have core tools
      expect(result).toEqual(['search', 'calculator', 'webFetch']);
    });

    it('should preserve order: core tools first, then BM25 ranked order', async () => {
      vi.mocked(searchTools).mockResolvedValue(['toolC', 'toolA', 'toolB']);

      const result = await selectTools('test query');

      // Verify order
      expect(result).toEqual([
        'search', 'calculator', 'webFetch', // core tools
        'toolC', 'toolA', 'toolB' // BM25 ranked order preserved
      ]);
    });

    it('should produce no duplicates even with overlapping BM25 results', async () => {
      vi.mocked(searchTools).mockResolvedValue([
        'webFetch', 'search', 'weather', 'weather', 'calculator'
      ]);

      const result = await selectTools('duplicate test');

      const unique = new Set(result);
      expect(result.length).toBe(unique.size);
      expect(result).toContain('weather');
    });
  });
});
