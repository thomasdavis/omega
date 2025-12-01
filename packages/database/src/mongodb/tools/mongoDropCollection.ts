/**
 * MongoDB Drop Collection Tool
 * Drop (delete) an entire collection from the database
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getMongoDatabase, isValidCollectionName, collectionExists } from '../client.js';

export const mongoDropCollectionTool = tool({
  description: `Drop (delete) an entire collection from the MongoDB database.

⚠️ DANGER: This permanently deletes the entire collection and all its documents!
Cannot drop system collections (system.*).

Use this when:
- User wants to delete an entire collection
- User needs to remove a collection permanently
- User wants to clear out old data structures

Examples:
- "Drop the temp collection"
- "Delete the old_users collection"
- "Remove the test_data collection"`,

  inputSchema: z.object({
    collection: z.string().describe('Name of the collection to drop'),
    confirmDeletion: z
      .boolean()
      .default(false)
      .describe('Confirmation flag to prevent accidental deletion (must be true)'),
  }),

  execute: async ({ collection, confirmDeletion }) => {
    console.log(`🗑️ [MongoDB Drop Collection] Attempting to drop collection: ${collection}`);

    try {
      // Require explicit confirmation
      if (!confirmDeletion) {
        return {
          success: false,
          error: 'CONFIRMATION_REQUIRED',
          message: `Dropping a collection is permanent and cannot be undone. Set confirmDeletion=true to proceed with deleting "${collection}"`,
        };
      }

      // Validate collection name
      if (!isValidCollectionName(collection)) {
        return {
          success: false,
          error: 'INVALID_COLLECTION_NAME',
          message: `Invalid collection name: "${collection}". Collection names must be alphanumeric with underscores only and cannot start with "system."`,
        };
      }

      // Extra safety: prevent dropping system collections
      if (collection.startsWith('system.')) {
        return {
          success: false,
          error: 'SYSTEM_COLLECTION_PROTECTED',
          message: `Cannot drop system collection "${collection}"`,
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

      // Drop the collection
      await db.dropCollection(collection);

      console.log(`✅ [MongoDB Drop Collection] Dropped collection: ${collection}`);

      return {
        success: true,
        collection,
        message: `Collection "${collection}" has been permanently deleted`,
      };
    } catch (error) {
      console.error(`❌ [MongoDB Drop Collection] Failed:`, error);
      return {
        success: false,
        error: 'DROP_COLLECTION_FAILED',
        message: `Failed to drop collection: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
