/**
 * MongoDB List Collections Tool
 * List all collections in the database
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getMongoDatabase } from '../client.js';

export const mongoListCollectionsTool = tool({
  description: `List all collections in the MongoDB database.

Use this when:
- User wants to see what collections exist
- User asks "what collections are there?"
- User needs to browse available collections

Examples:
- "What collections are in MongoDB?"
- "List all my collections"
- "Show me what's in the database"`,

  inputSchema: z.object({
    includeSystemCollections: z
      .boolean()
      .default(false)
      .describe('Whether to include system collections (system.*)'),
  }),

  execute: async ({ includeSystemCollections }) => {
    console.log(`📋 [MongoDB List Collections] Listing collections`);

    try {
      const db = await getMongoDatabase();

      // Get all collections
      const collections = await db.listCollections().toArray();

      // Filter out system collections if requested
      const filteredCollections = includeSystemCollections
        ? collections
        : collections.filter((col) => !col.name.startsWith('system.'));

      const collectionNames = filteredCollections.map((col) => col.name);

      console.log(`✅ [MongoDB List Collections] Found ${collectionNames.length} collection(s)`);

      return {
        success: true,
        collections: collectionNames,
        count: collectionNames.length,
        details: filteredCollections.map((col) => ({
          name: col.name,
          type: col.type,
        })),
      };
    } catch (error) {
      console.error(`❌ [MongoDB List Collections] Failed:`, error);
      return {
        success: false,
        error: 'LIST_COLLECTIONS_FAILED',
        message: `Failed to list collections: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
