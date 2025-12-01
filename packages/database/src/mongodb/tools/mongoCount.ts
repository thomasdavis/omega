/**
 * MongoDB Count Tool
 * Count documents in a collection matching a filter
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getMongoDatabase, isValidCollectionName, collectionExists } from '../client.js';

export const mongoCountTool = tool({
  description: `Count documents in a MongoDB collection matching a filter.

Use this when:
- User wants to count how many documents match certain criteria
- User wants to know the total number of documents in a collection
- User needs statistics about document counts

Examples:
- "How many users are there?"
- "Count all products where price > 100"
- "Tell me how many orders were placed today"`,

  inputSchema: z.object({
    collection: z.string().describe('Collection name to count documents in'),
    filter: z
      .record(z.any())
      .default({})
      .describe('MongoDB query filter object (empty {} to count all documents)'),
  }),

  execute: async ({ collection, filter }) => {
    console.log(`🔢 [MongoDB Count] Counting in collection: ${collection}`);
    console.log(`   Filter: ${JSON.stringify(filter)}`);

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

      // Count documents
      const count = await col.countDocuments(filter);

      console.log(`✅ [MongoDB Count] Found ${count} document(s) in ${collection}`);

      return {
        success: true,
        count,
        collection,
        filter,
      };
    } catch (error) {
      console.error(`❌ [MongoDB Count] Failed:`, error);
      return {
        success: false,
        error: 'COUNT_FAILED',
        message: `Failed to count documents: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
