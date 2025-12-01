/**
 * Tool Metadata Types
 * Defines the structure for tool metadata used in BM25 search
 */

export interface ToolMetadata {
  /** Unique tool ID (matches tool registration name) */
  id: string;

  /** Human-readable tool name */
  name: string;

  /** Detailed description of what the tool does */
  description: string;

  /** High-relevance keywords for BM25 boosting */
  keywords: string[];

  /** Category tags (e.g., "database", "mongodb", "image") */
  tags: string[];

  /** Example user queries that should trigger this tool */
  examples: string[];

  /** Whether this is a core tool (always included) */
  isCore?: boolean;

  /** Tool category for organizational purposes */
  category: 'development' | 'content' | 'database' | 'github' | 'file' | 'research' | 'admin' | 'specialized';
}

export interface CoreToolConfig {
  /** List of core tool IDs always included */
  coreToolIds: string[];
}
