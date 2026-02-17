/**
 * Unit tests for TPMJS Registry Search Tool
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the API client module
vi.mock('./tpmjsApiClient.js', () => ({
  searchTpmjsRegistry: vi.fn(),
  hasTpmjsApiKey: vi.fn(),
  listTpmjsCategories: vi.fn(),
}));

import { tpmjsRegistrySearchTool } from './tpmjsRegistrySearch.js';
import {
  searchTpmjsRegistry,
  hasTpmjsApiKey,
  listTpmjsCategories,
} from './tpmjsApiClient.js';

describe('TPMJS Registry Search Tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (hasTpmjsApiKey as ReturnType<typeof vi.fn>).mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have correct tool metadata', () => {
    expect(tpmjsRegistrySearchTool.description).toContain('TPMJS registry');
    expect(tpmjsRegistrySearchTool.description).toContain('API key');
  });

  it('should return search results with tool metadata', async () => {
    (searchTpmjsRegistry as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: [
        {
          toolId: 'firecrawl::scrapeUrl',
          name: 'Firecrawl Scraper',
          description: 'Scrape websites using Firecrawl',
          package: 'firecrawl',
          exportName: 'scrapeUrl',
          version: '1.0.0',
          category: 'web-scraping',
          keywords: ['scrape', 'web'],
        },
        {
          toolId: 'exa::search',
          name: 'Exa Search',
          description: 'Search the web using Exa API',
          package: 'exa',
          exportName: 'search',
          version: '2.0.0',
          category: 'web-scraping',
        },
      ],
      total: 2,
      error: null,
    });

    const result = await tpmjsRegistrySearchTool.execute({
      query: 'web scraping',
    });

    expect(result.success).toBe(true);
    expect(result.authenticated).toBe(true);
    expect(result.resultCount).toBe(2);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].toolId).toBe('firecrawl::scrapeUrl');
    expect(result.results[1].toolId).toBe('exa::search');
    expect(result.usage).toContain('tpmjsRegistryExecute');
  });

  it('should pass category filter to search', async () => {
    (searchTpmjsRegistry as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: [],
      total: 0,
      error: null,
    });
    (listTpmjsCategories as ReturnType<typeof vi.fn>).mockResolvedValue({
      categories: ['web-scraping', 'data-processing'],
      error: null,
    });

    await tpmjsRegistrySearchTool.execute({
      query: 'test',
      category: 'web-scraping',
    });

    expect(searchTpmjsRegistry).toHaveBeenCalledWith('test', {
      category: 'web-scraping',
      limit: 10,
    });
  });

  it('should handle empty results with suggestions', async () => {
    (searchTpmjsRegistry as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: [],
      total: 0,
      error: null,
    });
    (listTpmjsCategories as ReturnType<typeof vi.fn>).mockResolvedValue({
      categories: ['web-scraping', 'data-processing'],
      error: null,
    });

    const result = await tpmjsRegistrySearchTool.execute({
      query: 'nonexistent tool xyz',
    });

    expect(result.success).toBe(true);
    expect(result.resultCount).toBe(0);
    expect(result.suggestions).toBeTruthy();
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('should indicate when API key is not configured', async () => {
    (hasTpmjsApiKey as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (searchTpmjsRegistry as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: [
        {
          toolId: 'test::tool',
          name: 'Test Tool',
          description: 'Test',
          package: 'test',
          exportName: 'tool',
        },
      ],
      total: 1,
      error: null,
    });

    const result = await tpmjsRegistrySearchTool.execute({
      query: 'test',
    });

    expect(result.authenticated).toBe(false);
    expect(result.success).toBe(true);
  });

  it('should handle search errors gracefully', async () => {
    (searchTpmjsRegistry as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error')
    );

    const result = await tpmjsRegistrySearchTool.execute({
      query: 'test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('search_failed');
    expect(result.message).toContain('Network error');
    expect(result.suggestions).toBeTruthy();
  });

  it('should respect the limit parameter', async () => {
    (searchTpmjsRegistry as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: [],
      total: 0,
      error: null,
    });
    (listTpmjsCategories as ReturnType<typeof vi.fn>).mockResolvedValue({
      categories: [],
      error: null,
    });

    await tpmjsRegistrySearchTool.execute({
      query: 'test',
      limit: 25,
    });

    expect(searchTpmjsRegistry).toHaveBeenCalledWith('test', {
      category: undefined,
      limit: 25,
    });
  });

  it('should construct toolId from package and exportName when toolId is missing', async () => {
    (searchTpmjsRegistry as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: [
        {
          toolId: '',
          name: 'Test Tool',
          description: 'Test description',
          package: 'my-package',
          exportName: 'myTool',
        },
      ],
      total: 1,
      error: null,
    });

    const result = await tpmjsRegistrySearchTool.execute({
      query: 'test',
    });

    expect(result.results[0].toolId).toBe('my-package::myTool');
  });
});
