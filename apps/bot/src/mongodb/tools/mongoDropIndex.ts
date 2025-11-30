/**
 * MongoDB Drop Index Tool
 * Drop (delete) an index from a collection
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getMongoDatabase, isValidCollectionName, collectionExists } from '../client.js';

export const mongoDropIndexTool = tool({
  description: `Drop (delete) an index from a MongoDB collection.

⚠️ Cannot drop the _id_ index (MongoDB requirement).

Use this when:
- User wants to remove an unused index
- User needs to recreate an index with different options
- User is cleaning up index bloat
- User wants to improve write performance by removing indexes

Examples:
- "Drop the email_1 index from users"
- "Remove the compound index on firstName and lastName"
- "Delete all indexes except _id"`,

  inputSchema: z.object({
    collection: z.string().describe('Collection name to drop index from'),
    indexName: z.string().describe('Name of the index to drop (use "*" to drop all non-_id indexes)'),
  }),

  execute: async ({ collection, indexName }) => {
    console.log(`🗑️ [MongoDB Drop Index] Dropping index: ${indexName} from ${collection}`);

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

      // Protect the _id_ index
      if (indexName === '_id_') {
        return {
          success: false,
          error: 'PROTECTED_INDEX',
          message: 'Cannot drop the _id_ index - it is required by MongoDB',
        };
      }

      const db = await getMongoDatabase();
      const col = db.collection(collection);

      // Drop index(es)
      if (indexName === '*') {
        // Drop all indexes except _id_
        await col.dropIndexes();
        console.log(`✅ [MongoDB Drop Index] Dropped all non-_id indexes on ${collection}`);

        return {
          success: true,
          collection,
          droppedAll: true,
          message: 'All indexes except _id_ have been dropped',
        };
      } else {
        // Drop specific index
        await col.dropIndex(indexName);
        console.log(`✅ [MongoDB Drop Index] Dropped index: ${indexName} from ${collection}`);

        return {
          success: true,
          collection,
          indexName,
          droppedAll: false,
        };
      }
    } catch (error) {
      console.error(`❌ [MongoDB Drop Index] Failed:`, error);

      // Check if error is "index not found"
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('index not found')) {
        return {
          success: false,
          error: 'INDEX_NOT_FOUND',
          message: `Index "${indexName}" does not exist on collection "${collection}"`,
        };
      }

      return {
        success: false,
        error: 'DROP_INDEX_FAILED',
        message: `Failed to drop index: ${errorMessage}`,
      };
    }
  },
});
