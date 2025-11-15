/**
 * Search Tool - Search the web for information
 * Uses DuckDuckGo via HTML scraping as a free alternative to paid APIs
 */

import { tool } from 'ai';
import { z } from 'zod';

export const searchTool = tool({
  description: 'Search the web for information about a topic using DuckDuckGo. Returns search results with titles, snippets, and URLs.',
  parameters: z.object({
    query: z.string().describe('The search query'),
    numResults: z.number().optional().describe('Number of results to return (default 5, max 10)'),
  }),
  // @ts-ignore - AI SDK beta.99 type mismatch
  execute: async ({ query, numResults = 5 }) => {
    try {
      console.log(`🔍 Searching DuckDuckGo for: "${query}"`);

      // Limit results to max 10
      const limit = Math.min(numResults || 5, 10);

      // Use DuckDuckGo HTML search (no API key needed)
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

      // Fetch search results
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OmegaBot/1.0)',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          query,
          error: `Search failed with status ${response.status}`,
        };
      }

      const html = await response.text();

      // Parse results from HTML (basic regex parsing)
      const results: Array<{ title: string; snippet: string; url: string }> = [];
      const resultRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([^<]+)</g;

      let match;
      while ((match = resultRegex.exec(html)) !== null && results.length < limit) {
        const url = match[1];
        const title = match[2].trim();
        const snippet = match[3].trim();

        results.push({ title, snippet, url });
      }

      return {
        success: true,
        query,
        numResults: results.length,
        results,
        source: 'DuckDuckGo',
      };
    } catch (error) {
      console.error('Search error:', error);
      return {
        success: false,
        query,
        error: error instanceof Error ? error.message : 'Search failed',
      };
    }
  },
});
