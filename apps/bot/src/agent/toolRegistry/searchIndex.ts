/**
 * BM25 Search Index for Tool Routing
 * Uses MiniSearch for fast, accurate tool selection
 */

import MiniSearch from 'minisearch';
import { TOOL_METADATA } from './metadata.js';
import type { ToolMetadata } from './types.js';

/**
 * Singleton search index instance
 * Built once on first access, cached for subsequent calls
 */
let searchIndex: MiniSearch<ToolMetadata> | null = null;

/**
 * Build or retrieve the BM25 search index
 */
export function getSearchIndex(): MiniSearch<ToolMetadata> {
  if (searchIndex) {
    return searchIndex;
  }

  console.log('🔍 Building BM25 tool search index...');

  // Configure MiniSearch with BM25 settings
  searchIndex = new MiniSearch<ToolMetadata>({
    fields: ['keywords', 'tags', 'description', 'examples'], // Fields to index
    storeFields: ['id', 'name', 'category'], // Fields to return in results
    searchOptions: {
      boost: {
        keywords: 3.0,    // Keywords are most important
        tags: 2.5,        // Tags are very important
        description: 2.0, // Descriptions are important
        examples: 1.5     // Examples are moderately important
      },
      fuzzy: 0.2, // Allow slight typos (20% edit distance)
      prefix: true, // Match word prefixes (e.g., "calc" matches "calculator")
      combineWith: 'OR' // Match any of the search terms
    }
  });

  // Index all tool metadata
  searchIndex.addAll(TOOL_METADATA);

  console.log(`✅ Indexed ${TOOL_METADATA.length} tools for BM25 search`);

  return searchIndex;
}

/**
 * Search for tools using BM25 ranking
 *
 * @param query - Search query (user message or combined context)
 * @param limit - Maximum number of results (default: 20)
 * @returns Array of tool IDs ranked by relevance
 */
export function searchTools(query: string, limit: number = 20): string[] {
  const index = getSearchIndex();

  // Perform BM25 search with configured options
  const results = index.search(query, {
    boost: {
      keywords: 3.0,
      tags: 2.5,
      description: 2.0,
      examples: 1.5
    },
    fuzzy: 0.2,
    prefix: true,
    combineWith: 'OR'
  }).slice(0, limit);

  // Extract tool IDs from results
  const toolIds = results.map(result => result.id);

  console.log(`🔍 BM25 Search: "${query.substring(0, 50)}..." → ${toolIds.length} tools`);
  console.log(`   Top tools: ${toolIds.slice(0, 5).join(', ')}`);

  return toolIds;
}

/**
 * Get tool metadata by ID
 */
export function getToolMetadata(toolId: string): ToolMetadata | undefined {
  return TOOL_METADATA.find(tool => tool.id === toolId);
}

/**
 * Get all tool IDs
 */
export function getAllToolIds(): string[] {
  return TOOL_METADATA.map(tool => tool.id);
}
