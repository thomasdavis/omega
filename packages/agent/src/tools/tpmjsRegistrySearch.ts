/**
 * TPMJS Registry Search Tool
 * Searches the TPMJS registry to discover available tools using API key authentication.
 * Replaces the direct @tpmjs/registry-search import with a proper authenticated implementation.
 *
 * API Reference: https://tpmjs.com/llms.txt
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  searchTpmjsRegistry,
  hasTpmjsApiKey,
  listTpmjsCategories,
} from './tpmjsApiClient.js';

// Known categories for the TPMJS registry
const VALID_CATEGORIES = [
  'web-scraping',
  'data-processing',
  'file-operations',
  'communication',
  'database',
  'api-integration',
  'image-processing',
  'text-analysis',
  'automation',
  'ai-ml',
  'security',
  'monitoring',
] as const;

export const tpmjsRegistrySearchTool = tool({
  description:
    'Search the TPMJS registry to find tools for any task. Returns tool metadata including the toolId needed for execution with tpmjsRegistryExecute. Uses API key authentication for full access to the registry. Search by keywords, tool names, descriptions, or filter by category.',
  inputSchema: z.object({
    query: z.string().describe('Search query - keywords, tool names, or descriptions to search for'),
    category: z
      .enum(VALID_CATEGORIES)
      .optional()
      .describe('Optional category filter to narrow results'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Maximum number of results to return (default 10, max 50)'),
  }),
  execute: async (args: { query: string; category?: string; limit?: number }) => {
    const { query, category, limit = 10 } = args;
    console.log(`🔍 TPMJS Registry Search: "${query}"${category ? ` [category: ${category}]` : ''}`);

    const hasApiKey = hasTpmjsApiKey();
    if (!hasApiKey) {
      console.warn('⚠️  TPMJS_API_KEY not configured - search may be limited');
    }

    try {
      // Try the API client first
      const searchResult = await searchTpmjsRegistry(query, {
        category,
        limit,
      });

      if (searchResult.results.length > 0) {
        console.log(`✅ Found ${searchResult.results.length} tools (total: ${searchResult.total})`);
        return {
          success: true,
          authenticated: hasApiKey,
          query,
          category: category || null,
          resultCount: searchResult.results.length,
          totalAvailable: searchResult.total,
          results: searchResult.results.map(r => ({
            toolId: r.toolId || `${r.package}::${r.exportName}`,
            name: r.name,
            description: r.description,
            package: r.package,
            exportName: r.exportName,
            version: r.version,
            category: r.category,
            keywords: r.keywords,
          })),
          usage: 'Use tpmjsRegistryExecute with the toolId to run any of these tools',
        };
      }

      // If API search returns no results, try fallback via npm package
      try {
        const { registrySearchTool } = await import('@tpmjs/registry-search');
        const executeFunc = registrySearchTool.execute as (args: Record<string, unknown>) => Promise<unknown>;
        const fallbackResult = await executeFunc({ query, category, limit });

        // Process fallback result
        if (fallbackResult && typeof fallbackResult === 'object') {
          console.log('✅ Found results via @tpmjs/registry-search fallback');
          return {
            success: true,
            authenticated: hasApiKey,
            query,
            category: category || null,
            source: 'npm-package-fallback',
            ...(fallbackResult as Record<string, unknown>),
          };
        }
      } catch {
        // npm package fallback failed, that's okay
      }

      // No results from either source
      const categoriesResult = await listTpmjsCategories();
      return {
        success: true,
        authenticated: hasApiKey,
        query,
        category: category || null,
        resultCount: 0,
        totalAvailable: 0,
        results: [],
        message: searchResult.error
          ? `Search returned no results. API note: ${searchResult.error}`
          : `No tools found matching "${query}"${category ? ` in category "${category}"` : ''}`,
        suggestions: [
          'Try broader search terms',
          'Remove the category filter to search all categories',
          category ? `Try searching without the "${category}" category filter` : null,
          `Available categories: ${categoriesResult.categories.join(', ')}`,
        ].filter(Boolean),
      };
    } catch (error) {
      console.error('❌ TPMJS Registry Search error:', error);
      return {
        success: false,
        authenticated: hasApiKey,
        query,
        category: category || null,
        error: 'search_failed',
        message: error instanceof Error ? error.message : 'Unknown error during TPMJS registry search',
        suggestions: [
          'Check that TPMJS_API_KEY is configured correctly',
          'Try again with different search terms',
          'Check https://tpmjs.com for available tools',
        ],
      };
    }
  },
});
