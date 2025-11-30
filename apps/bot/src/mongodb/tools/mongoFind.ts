/**
 * MongoDB Find Tool
 * Query documents from a collection with filters, sorting, and pagination
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getMongoDatabase, isValidCollectionName, collectionExists } from '../client.js';

export const mongoFindTool = tool({
  description: `Query multiple documents from a MongoDB collection with filters, sorting, and pagination.

Use this when:
- User wants to search/query/find documents in a collection
- User wants to get multiple documents with filters
- User wants to list all documents in a collection
- User needs sorting or pagination

Examples:
- "Find all users where age > 18"
- "Get the first 10 products sorted by price"
- "List all documents in the orders collection"`,

  inputSchema: z.object({
    collection: z.string().describe('Collection name to query from'),
    filter: z
      .record(z.any())
      .default({})
      .describe('MongoDB query filter object (e.g., {age: {$gt: 18}, name: "John"})'),
    projection: z
      .record(z.union([z.literal(0), z.literal(1)]))
      .optional()
      .describe('Fields to include (1) or exclude (0) in results'),
    sort: z
      .record(z.union([z.literal(1), z.literal(-1)]))
      .optional()
      .describe('Sort order object (1 for ascending, -1 for descending)'),
    limit: z
      .number()
      .int()
      .positive()
      .max(1000)
      .default(100)
      .describe('Maximum number of documents to return (max 1000)'),
    skip: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe('Number of documents to skip (for pagination)'),
  }),

  execute: async ({ collection, filter, projection, sort, limit, skip }) => {
    console.log(`🔍 [MongoDB Find] Querying collection: ${collection}`);
    console.log(`   Filter: ${JSON.stringify(filter)} | Limit: ${limit} | Skip: ${skip}`);

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

      // Build query
      let query = col.find(filter);

      if (projection) {
        query = query.project(projection);
      }

      if (sort) {
        query = query.sort(sort);
      }

      query = query.skip(skip).limit(limit);

      // Execute query
      const documents = await query.toArray();

      console.log(`✅ [MongoDB Find] Found ${documents.length} document(s) in ${collection}`);

      return {
        success: true,
        documents,
        count: documents.length,
        collection,
        filter,
        limit,
        skip,
      };
    } catch (error) {
      console.error(`❌ [MongoDB Find] Failed:`, error);
      return {
        success: false,
        error: 'FIND_FAILED',
        message: `Failed to query documents: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
