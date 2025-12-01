/**
 * MongoDB List Indexes Tool
 * List all indexes on a collection
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getMongoDatabase, isValidCollectionName, collectionExists } from '../client.js';

export const mongoListIndexesTool = tool({
  description: `List all indexes on a MongoDB collection.

Shows:
- Index names
- Indexed fields and sort order
- Unique/sparse/TTL properties
- Index sizes

Use this when:
- User wants to see what indexes exist
- User needs to audit index usage
- User wants to check index properties
- User is optimizing query performance

Examples:
- "What indexes are on the users collection?"
- "List all indexes"
- "Show me the indexes on products"`,

  inputSchema: z.object({
    collection: z.string().describe('Collection name to list indexes for'),
  }),

  execute: async ({ collection }) => {
    console.log(`🗂️ [MongoDB List Indexes] Listing indexes for: ${collection}`);

    try {
      // Validate collection name
      if (!isValidCollectionName(collection)) {
        return {
          success: false,
          error: 'INVALID_COLLECTION_NAME',
          message: `Invalid collection name: "${collection}". Collection names must be alphanumeric with underscores only and cannot start with "system."`,
        };
      }

      // Check if collection exists
      const exists = await collectionExists(collection);
      if (!exists) {
        return {
          success: false,
          error: 'COLLECTION_NOT_FOUND',
          message: `Collection "${collection}" does not exist`,
        };
      }

      const db = await getMongoDatabase();
      const col = db.collection(collection);

      // Get all indexes
      const indexes = await col.indexes();

      console.log(`✅ [MongoDB List Indexes] Found ${indexes.length} index(es) on ${collection}`);

      return {
        success: true,
        indexes,
        count: indexes.length,
        collection,
        indexNames: indexes.map((idx) => idx.name),
      };
    } catch (error) {
      console.error(`❌ [MongoDB List Indexes] Failed:`, error);
      return {
        success: false,
        error: 'LIST_INDEXES_FAILED',
        message: `Failed to list indexes: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
