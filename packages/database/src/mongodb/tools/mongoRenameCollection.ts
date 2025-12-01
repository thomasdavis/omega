/**
 * MongoDB Rename Collection Tool
 * Rename a collection in the database
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getMongoDatabase, isValidCollectionName, collectionExists } from '../client.js';

export const mongoRenameCollectionTool = tool({
  description: `Rename a collection in the MongoDB database.

Cannot rename system collections (system.*).

Use this when:
- User wants to rename a collection
- User needs to change a collection's name
- User wants to reorganize collection naming

Examples:
- "Rename the users collection to customers"
- "Change old_products to products"
- "Rename temp_data to archive_data"`,

  inputSchema: z.object({
    oldName: z.string().describe('Current name of the collection to rename'),
    newName: z.string().describe('New name for the collection (alphanumeric and underscores only)'),
    dropTarget: z
      .boolean()
      .default(false)
      .describe('Whether to drop the target collection if it already exists'),
  }),

  execute: async ({ oldName, newName, dropTarget }) => {
    console.log(`✏️ [MongoDB Rename Collection] Renaming: ${oldName} → ${newName}`);

    try {
      // Validate old collection name
      if (!isValidCollectionName(oldName)) {
        return {
          success: false,
          error: 'INVALID_OLD_NAME',
          message: `Invalid collection name: "${oldName}". Collection names must be alphanumeric with underscores only and cannot start with "system."`,
        };
      }

      // Validate new collection name
      if (!isValidCollectionName(newName)) {
        return {
          success: false,
          error: 'INVALID_NEW_NAME',
          message: `Invalid collection name: "${newName}". Collection names must be alphanumeric with underscores only and cannot start with "system."`,
        };
      }

      // Extra safety: prevent renaming system collections
      if (oldName.startsWith('system.') || newName.startsWith('system.')) {
        return {
          success: false,
          error: 'SYSTEM_COLLECTION_PROTECTED',
          message: `Cannot rename system collections`,
        };
      }

      // Check if old collection exists
      const oldExists = await collectionExists(oldName);
      if (!oldExists) {
        return {
          success: false,
          error: 'COLLECTION_NOT_FOUND',
          message: `Collection "${oldName}" does not exist`,
        };
      }

      // Check if new collection name already exists
      const newExists = await collectionExists(newName);
      if (newExists && !dropTarget) {
        return {
          success: false,
          error: 'TARGET_ALREADY_EXISTS',
          message: `Collection "${newName}" already exists. Set dropTarget=true to overwrite it`,
        };
      }

      const db = await getMongoDatabase();
      const col = db.collection(oldName);

      // Rename the collection
      await col.rename(newName, { dropTarget });

      console.log(`✅ [MongoDB Rename Collection] Renamed: ${oldName} → ${newName}`);

      return {
        success: true,
        oldName,
        newName,
        droppedTarget: newExists && dropTarget,
      };
    } catch (error) {
      console.error(`❌ [MongoDB Rename Collection] Failed:`, error);
      return {
        success: false,
        error: 'RENAME_COLLECTION_FAILED',
        message: `Failed to rename collection: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
