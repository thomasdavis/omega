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
let autonomousToolsLoaded = false;

/**
 * Build or retrieve the BM25 search index
 * Includes both core tools and autonomous tools
 */
export async function getSearchIndex(): Promise<MiniSearch<ToolMetadata>> {
  if (searchIndex && autonomousToolsLoaded) {
    return searchIndex;
  }

  console.log('🔍 Building BM25 tool search index...');

  // Configure MiniSearch with BM25 settings
  if (!searchIndex) {
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

    // Deduplicate tool metadata by ID (last entry wins)
    const deduped = Array.from(
      new Map(TOOL_METADATA.map(t => [t.id, t])).values()
    );
    if (deduped.length < TOOL_METADATA.length) {
      console.warn(`⚠️  Removed ${TOOL_METADATA.length - deduped.length} duplicate tool metadata entries`);
    }

    // Index all core tool metadata
    searchIndex.addAll(deduped);
    console.log(`✅ Indexed ${deduped.length} core tools`);
  }

  // Load autonomous tool metadata
  if (!autonomousToolsLoaded) {
    try {
      const { getAutonomousToolMetadata } = await import('../autonomousToolLoader.js');
      const autonomousMetadata = await getAutonomousToolMetadata();

      if (autonomousMetadata.length > 0) {
        // Filter out any autonomous tools that duplicate core tool IDs
        const coreIds = new Set(TOOL_METADATA.map(t => t.id));
        const uniqueAutonomous = autonomousMetadata.filter(t => {
          if (coreIds.has(t.id)) {
            console.warn(`⚠️  Skipping duplicate autonomous tool ID: ${t.id}`);
            return false;
          }
          coreIds.add(t.id);
          return true;
        });
        if (uniqueAutonomous.length > 0) {
          searchIndex.addAll(uniqueAutonomous);
          console.log(`✅ Indexed ${uniqueAutonomous.length} autonomous tools`);
        }
      }

      autonomousToolsLoaded = true;
    } catch (error) {
      console.warn('⚠️  Could not load autonomous tools:', error);
      autonomousToolsLoaded = true; // Mark as loaded to prevent repeated attempts
    }
  }

  return searchIndex;
}

/**
 * Force rebuild of search index
 * Useful when autonomous tools are added/updated
 */
export function rebuildSearchIndex(): void {
  searchIndex = null;
  autonomousToolsLoaded = false;
  console.log('🔄 Search index will be rebuilt on next access');
}

/**
 * Search for tools using BM25 ranking
 *
 * @param query - Search query (user message or combined context)
 * @param limit - Maximum number of results (default: 20)
 * @returns Array of tool IDs ranked by relevance
 */
export async function searchTools(query: string, limit: number = 20): Promise<string[]> {
  const index = await getSearchIndex();

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
