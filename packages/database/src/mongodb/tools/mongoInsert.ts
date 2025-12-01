/**
 * MongoDB Insert Tool
 * Insert one or multiple documents into a collection
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getMongoDatabase, isValidCollectionName } from '../client.js';

export const mongoInsertTool = tool({
  description: `Insert document(s) into a MongoDB collection.

Use this when:
- User wants to create/insert/add new data to MongoDB
- User wants to save data to a specific collection
- User wants to insert multiple documents at once

Examples:
- "Insert a user document into the users collection"
- "Add these 3 products to the products collection"
- "Save this data to MongoDB in the orders collection"`,

  inputSchema: z.object({
    collection: z.string().describe('Collection name (alphanumeric and underscores only, no system.*)'),
    documents: z
      .union([z.record(z.any()), z.array(z.record(z.any()))])
      .describe('Single document object or array of documents to insert'),
    createCollectionIfNotExists: z
      .boolean()
      .default(true)
      .describe('Whether to create the collection if it does not exist'),
  }),

  execute: async ({ collection, documents, createCollectionIfNotExists }) => {
    console.log(`📝 [MongoDB Insert] Inserting into collection: ${collection}`);

    try {
      // Validate collection name
      if (!isValidCollectionName(collection)) {
        return {
          success: false,
          error: 'INVALID_COLLECTION_NAME',
          message: `Invalid collection name: "${collection}". Collection names must be alphanumeric with underscores only and cannot start with "system."`,
        };
      }

      const db = await getMongoDatabase();
      const col = db.collection(collection);

      // Normalize to array for processing
      const docsArray = Array.isArray(documents) ? documents : [documents];

      if (docsArray.length === 0) {
        return {
          success: false,
          error: 'EMPTY_DOCUMENTS',
          message: 'No documents provided to insert',
        };
      }

      // Insert documents
      const result = await col.insertMany(docsArray);

      console.log(`✅ [MongoDB Insert] Inserted ${result.insertedCount} document(s) into ${collection}`);

      return {
        success: true,
        insertedCount: result.insertedCount,
        insertedIds: Object.values(result.insertedIds),
        collection,
      };
    } catch (error) {
      console.error(`❌ [MongoDB Insert] Failed:`, error);
      return {
        success: false,
        error: 'INSERT_FAILED',
        message: `Failed to insert documents: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
