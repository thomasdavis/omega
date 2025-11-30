/**
 * MongoDB Update Tool
 * Update one or multiple documents in a collection using MongoDB update operators
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getMongoDatabase, isValidCollectionName, collectionExists } from '../client.js';

export const mongoUpdateTool = tool({
  description: `Update document(s) in a MongoDB collection using MongoDB update operators.

Use this when:
- User wants to update/modify existing documents
- User wants to change specific fields in documents
- User needs to use operators like $set, $inc, $push, etc.

MongoDB Update Operators:
- $set: Set field values
- $inc: Increment numeric fields
- $push: Add to arrays
- $pull: Remove from arrays
- $unset: Remove fields
- And many more...

Examples:
- "Update user 123 to set name to 'John'"
- "Increment the view count for all products"
- "Add a tag to all documents where category is 'tech'"`,

  inputSchema: z.object({
    collection: z.string().describe('Collection name to update documents in'),
    filter: z.record(z.any()).describe('MongoDB query filter to match documents to update'),
    update: z
      .record(z.any())
      .describe('MongoDB update object using operators (e.g., {$set: {name: "John"}, $inc: {age: 1}})'),
    updateMany: z
      .boolean()
      .default(false)
      .describe('Whether to update all matching documents (true) or just the first one (false)'),
    upsert: z
      .boolean()
      .default(false)
      .describe('Whether to insert a new document if no match is found'),
  }),

  execute: async ({ collection, filter, update, updateMany, upsert }) => {
    console.log(`✏️ [MongoDB Update] Updating in collection: ${collection}`);
    console.log(`   Filter: ${JSON.stringify(filter)} | UpdateMany: ${updateMany} | Upsert: ${upsert}`);

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

      // Execute update
      const options = { upsert };
      const result = updateMany
        ? await col.updateMany(filter, update, options)
        : await col.updateOne(filter, update, options);

      console.log(`✅ [MongoDB Update] Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}, Upserted: ${result.upsertedCount}`);

      return {
        success: true,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount,
        upsertedId: result.upsertedId || null,
        collection,
        updateMany,
      };
    } catch (error) {
      console.error(`❌ [MongoDB Update] Failed:`, error);
      return {
        success: false,
        error: 'UPDATE_FAILED',
        message: `Failed to update documents: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
