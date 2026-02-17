/**
 * Unit tests for TPMJS API Client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock process.env before importing
const originalEnv = process.env;

describe('TPMJS API Client', () => {
  let apiClient: typeof import('./tpmjsApiClient.js');

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    // Re-import to get fresh module with updated env
    apiClient = await import('./tpmjsApiClient.js');
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('hasTpmjsApiKey', () => {
    it('should return false when TPMJS_API_KEY is not set', () => {
      delete process.env.TPMJS_API_KEY;
      expect(apiClient.hasTpmjsApiKey()).toBe(false);
    });

    it('should return true when TPMJS_API_KEY is set', () => {
      process.env.TPMJS_API_KEY = 'test-api-key-123';
      expect(apiClient.hasTpmjsApiKey()).toBe(true);
    });
  });

  describe('searchTpmjsRegistry', () => {
    it('should return results on successful search', async () => {
      const mockResults = {
        results: [
          {
            toolId: 'firecrawl::scrapeUrl',
            name: 'Firecrawl Scraper',
            description: 'Scrape websites using Firecrawl',
            package: 'firecrawl',
            exportName: 'scrapeUrl',
            version: '1.0.0',
            category: 'web-scraping',
          },
        ],
        total: 1,
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'application/json' : null,
        },
        json: async () => mockResults,
        text: async () => JSON.stringify(mockResults),
      } as unknown as Response);

      const result = await apiClient.searchTpmjsRegistry('web scraping');

      expect(result.results).toHaveLength(1);
      expect(result.results[0].toolId).toBe('firecrawl::scrapeUrl');
      expect(result.results[0].name).toBe('Firecrawl Scraper');
      expect(result.error).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      // Mock all three endpoints to fail
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        headers: {
          get: () => 'text/plain',
        },
        text: async () => 'Internal Server Error',
        json: async () => ({}),
      } as unknown as Response);

      const result = await apiClient.searchTpmjsRegistry('test query');

      expect(result.results).toHaveLength(0);
      expect(result.error).toBeTruthy();
    });

    it('should include category filter in query params', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ results: [], total: 0 }),
        text: async () => '{"results":[],"total":0}',
      } as unknown as Response);

      await apiClient.searchTpmjsRegistry('test', {
        category: 'web-scraping',
        limit: 5,
      });

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('category=web-scraping');
      expect(calledUrl).toContain('limit=5');
    });

    it('should handle network timeouts', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(
        Object.assign(new Error('timeout'), { name: 'TimeoutError' })
      );

      const result = await apiClient.searchTpmjsRegistry('test');

      expect(result.results).toHaveLength(0);
      expect(result.error).toBeTruthy();
    });
  });

  describe('executeTpmjsTool', () => {
    it('should return result on successful execution', async () => {
      const mockResult = {
        success: true,
        result: { data: 'scraped content' },
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'application/json' : null,
        },
        json: async () => mockResult,
        text: async () => JSON.stringify(mockResult),
      } as unknown as Response);

      const result = await apiClient.executeTpmjsTool(
        'firecrawl::scrapeUrl',
        { url: 'https://example.com' },
        { FIRECRAWL_API_KEY: 'test-key' }
      );

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ data: 'scraped content' });
      expect(result.toolId).toBe('firecrawl::scrapeUrl');
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle execution failure', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 400,
        headers: {
          get: () => 'text/plain',
        },
        text: async () => 'Bad Request: Invalid tool ID',
        json: async () => ({}),
      } as unknown as Response);

      const result = await apiClient.executeTpmjsTool(
        'invalid::tool',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.toolId).toBe('invalid::tool');
    });

    it('should include env variables in request body', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ success: true, result: {} }),
        text: async () => '{"success":true,"result":{}}',
      } as unknown as Response);

      await apiClient.executeTpmjsTool(
        'test::tool',
        { param1: 'value1' },
        { API_KEY: 'my-key' }
      );

      const requestBody = JSON.parse(
        fetchSpy.mock.calls[0][1]?.body as string
      );
      expect(requestBody.toolId).toBe('test::tool');
      expect(requestBody.params).toEqual({ param1: 'value1' });
      expect(requestBody.env).toEqual({ API_KEY: 'my-key' });
    });
  });

  describe('getTpmjsToolMetadata', () => {
    it('should return metadata for a valid tool', async () => {
      const mockMetadata = {
        toolId: 'firecrawl::scrapeUrl',
        name: 'Firecrawl Scraper',
        description: 'Scrape websites',
        package: 'firecrawl',
        exportName: 'scrapeUrl',
        version: '1.0.0',
        category: 'web-scraping',
        envVars: ['FIRECRAWL_API_KEY'],
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'application/json' : null,
        },
        json: async () => mockMetadata,
        text: async () => JSON.stringify(mockMetadata),
      } as unknown as Response);

      const result = await apiClient.getTpmjsToolMetadata(
        'firecrawl::scrapeUrl'
      );

      expect(result.metadata).toBeTruthy();
      expect(result.metadata?.toolId).toBe('firecrawl::scrapeUrl');
      expect(result.metadata?.envVars).toContain('FIRECRAWL_API_KEY');
      expect(result.error).toBeNull();
    });

    it('should return error for unknown tool', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
        headers: {
          get: () => 'text/plain',
        },
        text: async () => 'Not found',
        json: async () => ({}),
      } as unknown as Response);

      const result = await apiClient.getTpmjsToolMetadata('nonexistent::tool');

      expect(result.metadata).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('fetchTpmjsSpec', () => {
    it('should fetch and parse llms.txt content', async () => {
      const llmsTxtContent = `# TPMJS Tool Registry
> A global registry for executable tools

## API
api_base: https://registry.tpmjs.com
version: 2.0

### firecrawl::scrapeUrl
> Scrape web pages using Firecrawl API
package: firecrawl
export: scrapeUrl
category: web-scraping
keywords: scrape,web,crawl

### exa::search
> Search the web using Exa API
package: exa
export: search
category: web-scraping
keywords: search,web,exa
`;

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'text/plain' : null,
        },
        json: async () => ({}),
        text: async () => llmsTxtContent,
      } as unknown as Response);

      const result = await apiClient.fetchTpmjsSpec();

      expect(result.spec).toBeTruthy();
      expect(result.spec?.name).toBe('TPMJS Tool Registry');
      expect(result.spec?.tools).toHaveLength(2);
      expect(result.spec?.tools[0].toolId).toBe('firecrawl::scrapeUrl');
      expect(result.spec?.tools[1].toolId).toBe('exa::search');
      expect(result.rawContent).toBeTruthy();
      expect(result.error).toBeNull();
    });

    it('should handle fetch failure', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        headers: {
          get: () => 'text/plain',
        },
        text: async () => 'Server Error',
        json: async () => ({}),
      } as unknown as Response);

      const result = await apiClient.fetchTpmjsSpec();

      expect(result.spec).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('validateTpmjsApiKey', () => {
    it('should return invalid when no API key is set', async () => {
      delete process.env.TPMJS_API_KEY;

      const result = await apiClient.validateTpmjsApiKey();

      expect(result.valid).toBe(false);
      expect(result.message).toContain('not configured');
    });

    it('should validate API key via auth endpoint', async () => {
      process.env.TPMJS_API_KEY = 'valid-test-key';

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ authenticated: true, user: 'test' }),
        text: async () => '{"authenticated":true}',
      } as unknown as Response);

      const result = await apiClient.validateTpmjsApiKey();

      expect(result.valid).toBe(true);
    });

    it('should report invalid for 401 response', async () => {
      process.env.TPMJS_API_KEY = 'invalid-key';

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: {
          get: () => 'text/plain',
        },
        text: async () => 'Unauthorized',
        json: async () => ({}),
      } as unknown as Response);

      const result = await apiClient.validateTpmjsApiKey();

      expect(result.valid).toBe(false);
      expect(result.message).toContain('invalid');
    });
  });

  describe('listTpmjsCategories', () => {
    it('should return categories from API', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({
          categories: ['web-scraping', 'data-processing', 'ai-ml'],
        }),
        text: async () =>
          '{"categories":["web-scraping","data-processing","ai-ml"]}',
      } as unknown as Response);

      const result = await apiClient.listTpmjsCategories();

      expect(result.categories).toContain('web-scraping');
      expect(result.categories).toContain('data-processing');
      expect(result.categories).toContain('ai-ml');
    });

    it('should return fallback categories when API fails', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: {
          get: () => 'text/plain',
        },
        text: async () => 'Error',
        json: async () => ({}),
      } as unknown as Response);

      const result = await apiClient.listTpmjsCategories();

      // Should return the hardcoded fallback categories
      expect(result.categories.length).toBeGreaterThan(0);
      expect(result.categories).toContain('web-scraping');
      expect(result.categories).toContain('data-processing');
    });
  });

  describe('API Key Authentication', () => {
    it('should include Authorization header when API key is set', async () => {
      process.env.TPMJS_API_KEY = 'my-secret-key';

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ results: [], total: 0 }),
        text: async () => '{"results":[],"total":0}',
      } as unknown as Response);

      await apiClient.searchTpmjsRegistry('test');

      const headers = fetchSpy.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      expect(headers['Authorization']).toBe('Bearer my-secret-key');
      expect(headers['X-API-Key']).toBe('my-secret-key');
    });

    it('should not include auth headers when API key is not set', async () => {
      delete process.env.TPMJS_API_KEY;

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ results: [], total: 0 }),
        text: async () => '{"results":[],"total":0}',
      } as unknown as Response);

      await apiClient.searchTpmjsRegistry('test');

      const headers = fetchSpy.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      expect(headers['Authorization']).toBeUndefined();
      expect(headers['X-API-Key']).toBeUndefined();
    });
  });
});
