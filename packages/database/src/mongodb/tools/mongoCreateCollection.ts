/**
 * MongoDB Create Collection Tool
 * Create a new collection in the database
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getMongoDatabase, isValidCollectionName, collectionExists } from '../client.js';

export const mongoCreateCollectionTool = tool({
  description: `Create a new collection in the MongoDB database.

Use this when:
- User wants to create a new collection
- User needs to initialize a collection with specific options
- User wants to set up a new data storage area

Examples:
- "Create a collection called users"
- "Make a new products collection"
- "Initialize a collection for storing orders"`,

  inputSchema: z.object({
    collection: z.string().describe('Name of the collection to create (alphanumeric and underscores only)'),
    capped: z
      .boolean()
      .optional()
      .describe('Whether to create a capped collection (fixed size)'),
    size: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Size in bytes for capped collection (required if capped=true)'),
    maxDocuments: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Maximum number of documents for capped collection'),
  }),

  execute: async ({ collection, capped, size, maxDocuments }) => {
    console.log(`🆕 [MongoDB Create Collection] Creating collection: ${collection}`);

    try {
      // Validate collection name
      if (!isValidCollectionName(collection)) {
        return {
          success: false,
          error: 'INVALID_COLLECTION_NAME',
          message: `Invalid collection name: "${collection}". Collection names must be alphanumeric with underscores only and cannot start with "system."`,
        };
      }

      // Check if collection already exists
      const exists = await collectionExists(collection);
      if (exists) {
        return {
          success: false,
          error: 'COLLECTION_ALREADY_EXISTS',
          message: `Collection "${collection}" already exists`,
        };
      }

      // Validate capped collection options
      if (capped && !size) {
        return {
          success: false,
          error: 'INVALID_CAPPED_OPTIONS',
          message: 'Capped collections require a size parameter',
        };
      }

      const db = await getMongoDatabase();

      // Build options
      const options: any = {};
      if (capped) {
        options.capped = true;
        options.size = size;
        if (maxDocuments) {
          options.max = maxDocuments;
        }
      }

      // Create collection
      await db.createCollection(collection, options);

      console.log(`✅ [MongoDB Create Collection] Created collection: ${collection}`);

      return {
        success: true,
        collection,
        capped: !!capped,
        options: capped ? { size, maxDocuments } : undefined,
      };
    } catch (error) {
      console.error(`❌ [MongoDB Create Collection] Failed:`, error);
      return {
        success: false,
        error: 'CREATE_COLLECTION_FAILED',
        message: `Failed to create collection: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
