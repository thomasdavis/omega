/**
 * MongoDB Delete Tool
 * Delete one or multiple documents from a collection
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getMongoDatabase, isValidCollectionName, collectionExists } from '../client.js';

export const mongoDeleteTool = tool({
  description: `Delete document(s) from a MongoDB collection.

Use this when:
- User wants to delete/remove documents from a collection
- User wants to clear specific documents matching a filter
- User needs to remove one or all matching documents

⚠️ DANGER: Deletion is permanent and cannot be undone!

Examples:
- "Delete the user with id 123"
- "Remove all products where stock is 0"
- "Delete all documents in the temp collection"`,

  inputSchema: z.object({
    collection: z.string().describe('Collection name to delete documents from'),
    filter: z.record(z.any()).describe('MongoDB query filter to match documents to delete'),
    deleteMany: z
      .boolean()
      .default(false)
      .describe('Whether to delete all matching documents (true) or just the first one (false)'),
  }),

  execute: async ({ collection, filter, deleteMany }) => {
    console.log(`🗑️ [MongoDB Delete] Deleting from collection: ${collection}`);
    console.log(`   Filter: ${JSON.stringify(filter)} | DeleteMany: ${deleteMany}`);

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

      // Safety check: Prevent accidental deletion of all documents
      if (Object.keys(filter).length === 0 && !deleteMany) {
        return {
          success: false,
          error: 'UNSAFE_DELETE',
          message: 'Refusing to delete with empty filter. To delete all documents, use deleteMany=true and provide an explicit filter like {}',
        };
      }

      const db = await getMongoDatabase();
      const col = db.collection(collection);

      // Execute delete
      const result = deleteMany ? await col.deleteMany(filter) : await col.deleteOne(filter);

      console.log(`✅ [MongoDB Delete] Deleted ${result.deletedCount} document(s) from ${collection}`);

      return {
        success: true,
        deletedCount: result.deletedCount,
        collection,
        deleteMany,
      };
    } catch (error) {
      console.error(`❌ [MongoDB Delete] Failed:`, error);
      return {
        success: false,
        error: 'DELETE_FAILED',
        message: `Failed to delete documents: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
