/**
 * TPMJS Registry Search Tool
 * Search the TPMJS registry to find tools for any task
 * Returns metadata including the toolId needed for execution
 *
 * @see https://tpmjs.com/sdk
 */

import { tool } from 'ai';
import { z } from 'zod';

const TPMJS_API_URL = process.env.TPMJS_API_URL || 'https://tpmjs.com';

/**
 * Available categories for filtering registry search
 */
const AVAILABLE_CATEGORIES = [
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
  'monitoring'
] as const;

interface RegistryTool {
  toolId: string;
  name: string;
  package: string;
  description: string;
  category: string;
  requiredEnvVars: string[];
  healthStatus: string;
  qualityScore?: number;
}

interface RegistrySearchResponse {
  tools?: Array<{
    toolId?: string;
    name?: string;
    package?: string;
    description?: string;
    category?: string;
    requiredEnvVars?: string[];
    healthStatus?: string;
    qualityScore?: number;
  }>;
  matchCount?: number;
}

export const tpmjsRegistrySearchTool = tool({
  description: 'Search the TPMJS registry to find tools for any task. Returns metadata including the toolId needed for execution with tpmjsRegistryExecute. Use this to discover external tools that can extend your capabilities.',
  inputSchema: z.object({
    query: z.string().describe('Search terms for keywords, tool names, or descriptions'),
    category: z.enum(AVAILABLE_CATEGORIES).optional().describe('Filter results by domain category'),
    limit: z.number().int().min(1).max(20).optional().default(5).describe('Maximum results (1-20, default: 5)'),
  }),
  execute: async ({ query, category, limit = 5 }: { query: string; category?: typeof AVAILABLE_CATEGORIES[number]; limit?: number }) => {
    console.log(`🔍 TPMJS Registry Search: "${query}"${category ? ` (category: ${category})` : ''}`);

    try {
      // Build search URL
      const searchParams = new URLSearchParams({
        q: query,
        limit: String(limit),
      });
      if (category) {
        searchParams.set('category', category);
      }

      const searchUrl = `${TPMJS_API_URL}/api/registry/search?${searchParams.toString()}`;

      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'OmegaBot/1.0 (TPMJS Registry Search)',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        // Handle API errors gracefully
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`❌ TPMJS Registry search failed: ${response.status} ${response.statusText}`);

        return {
          success: false,
          error: 'registry_search_failed',
          message: `Registry search failed: ${response.status} ${response.statusText}`,
          details: errorText,
          query,
          category,
        };
      }

      const data = await response.json() as RegistrySearchResponse;

      // Format results for easy consumption
      const tools: RegistryTool[] = (data.tools || []).map((tool) => ({
        toolId: tool.toolId || '',
        name: tool.name || '',
        package: tool.package || '',
        description: tool.description || '',
        category: tool.category || '',
        requiredEnvVars: tool.requiredEnvVars || [],
        healthStatus: tool.healthStatus || 'unknown',
        qualityScore: tool.qualityScore,
      }));

      console.log(`✅ Found ${tools.length} tools matching "${query}"`);

      return {
        success: true,
        query,
        category: category || null,
        matchCount: data.matchCount || tools.length,
        tools,
        message: tools.length > 0
          ? `Found ${tools.length} tool(s) matching "${query}". Use tpmjsRegistryExecute with the toolId to run any of these tools.`
          : `No tools found matching "${query}". Try different search terms or browse categories.`,
        availableCategories: AVAILABLE_CATEGORIES,
      };

    } catch (error) {
      console.error('❌ TPMJS Registry search error:', error);

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'timeout',
          message: 'Registry search timed out. The TPMJS API may be experiencing issues.',
          query,
          category,
        };
      }

      return {
        success: false,
        error: 'exception',
        message: `Error searching registry: ${error instanceof Error ? error.message : 'Unknown error'}`,
        query,
        category,
      };
    }
  },
});
