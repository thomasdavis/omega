/**
 * MongoDB Create Index Tool
 * Create an index on a collection to improve query performance
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getMongoDatabase, isValidCollectionName, collectionExists } from '../client.js';

export const mongoCreateIndexTool = tool({
  description: `Create an index on a MongoDB collection to improve query performance.

Indexes speed up queries but take up disk space and slow down writes.

Index types:
- Single field: {fieldName: 1} (ascending) or {fieldName: -1} (descending)
- Compound: {field1: 1, field2: -1}
- Text: {field: "text"} for full-text search
- Unique: Enforce uniqueness
- TTL: Auto-delete documents after time

Use this when:
- User has slow queries
- User needs to enforce uniqueness
- User wants full-text search capabilities
- User needs to optimize query performance

Examples:
- "Create an index on email field (unique)"
- "Add a compound index on lastName and firstName"
- "Create a text index for product descriptions"`,

  inputSchema: z.object({
    collection: z.string().describe('Collection name to create index on'),
    keys: z
      .record(z.union([z.literal(1), z.literal(-1), z.literal('text')]))
      .describe('Index specification object (e.g., {email: 1} for ascending, {name: "text"} for text index)'),
    unique: z.boolean().default(false).describe('Whether to enforce uniqueness'),
    sparse: z
      .boolean()
      .default(false)
      .describe('Whether to index only documents that have the indexed field'),
    name: z.string().optional().describe('Custom name for the index (auto-generated if not provided)'),
    expireAfterSeconds: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('TTL (Time To Live) in seconds - documents auto-delete after this time'),
  }),

  execute: async ({ collection, keys, unique, sparse, name, expireAfterSeconds }) => {
    console.log(`🗂️ [MongoDB Create Index] Creating index on: ${collection}`);
    console.log(`   Keys: ${JSON.stringify(keys)} | Unique: ${unique}`);

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

      // Validate keys object is not empty
      if (Object.keys(keys).length === 0) {
        return {
          success: false,
          error: 'EMPTY_KEYS',
          message: 'Index keys specification cannot be empty',
        };
      }

      const db = await getMongoDatabase();
      const col = db.collection(collection);

      // Build index options
      const options: any = { unique, sparse };
      if (name) {
        options.name = name;
      }
      if (expireAfterSeconds !== undefined) {
        options.expireAfterSeconds = expireAfterSeconds;
      }

      // Create index
      const indexName = await col.createIndex(keys, options);

      console.log(`✅ [MongoDB Create Index] Created index: ${indexName} on ${collection}`);

      return {
        success: true,
        indexName,
        collection,
        keys,
        unique,
        sparse,
        ttl: expireAfterSeconds,
      };
    } catch (error) {
      console.error(`❌ [MongoDB Create Index] Failed:`, error);
      return {
        success: false,
        error: 'CREATE_INDEX_FAILED',
        message: `Failed to create index: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
