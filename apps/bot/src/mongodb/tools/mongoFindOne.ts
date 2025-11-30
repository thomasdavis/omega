/**
 * MongoDB FindOne Tool
 * Query a single document from a collection
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getMongoDatabase, isValidCollectionName, collectionExists } from '../client.js';

export const mongoFindOneTool = tool({
  description: `Query a single document from a MongoDB collection.

Use this when:
- User wants to find a specific document by ID or unique field
- User wants to get one document that matches a filter
- User needs to check if a document exists

Examples:
- "Find the user with id 12345"
- "Get the product with SKU ABC123"
- "Check if an order exists with orderNumber 999"`,

  inputSchema: z.object({
    collection: z.string().describe('Collection name to query from'),
    filter: z.record(z.any()).describe('MongoDB query filter object (e.g., {_id: "...", name: "John"})'),
    projection: z
      .record(z.union([z.literal(0), z.literal(1)]))
      .optional()
      .describe('Fields to include (1) or exclude (0) in result'),
  }),

  execute: async ({ collection, filter, projection }) => {
    console.log(`🔍 [MongoDB FindOne] Querying collection: ${collection}`);
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

      // Build query options
      const options: any = {};
      if (projection) {
        options.projection = projection;
      }

      // Execute query
      const document = await col.findOne(filter, options);

      if (!document) {
        console.log(`✅ [MongoDB FindOne] No document found in ${collection}`);
        return {
          success: true,
          document: null,
          found: false,
          collection,
          filter,
        };
      }

      console.log(`✅ [MongoDB FindOne] Found document in ${collection}`);

      return {
        success: true,
        document,
        found: true,
        collection,
        filter,
      };
    } catch (error) {
      console.error(`❌ [MongoDB FindOne] Failed:`, error);
      return {
        success: false,
        error: 'FIND_ONE_FAILED',
        message: `Failed to query document: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
