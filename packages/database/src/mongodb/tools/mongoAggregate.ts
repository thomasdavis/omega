/**
 * MongoDB Aggregate Tool
 * Run aggregation pipelines for complex data transformations and analysis
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getMongoDatabase, isValidCollectionName, collectionExists } from '../client.js';

export const mongoAggregateTool = tool({
  description: `Run MongoDB aggregation pipelines for complex data transformations and analysis.

Aggregation pipelines allow:
- Data filtering, grouping, sorting
- Mathematical operations and calculations
- Joining data from multiple collections ($lookup)
- Reshaping documents
- Statistical analysis

Common aggregation stages:
- $match: Filter documents
- $group: Group by field and aggregate
- $sort: Sort results
- $project: Reshape documents
- $lookup: Join with other collections
- $unwind: Flatten arrays
- $count: Count documents
- $limit/$skip: Pagination

Use this when:
- User needs complex data analysis
- User wants to group and aggregate data
- User needs to transform document structure
- User wants statistics or summaries

Examples:
- "Count users by country"
- "Get average product price by category"
- "Find top 10 customers by order total"`,

  inputSchema: z.object({
    collection: z.string().describe('Collection name to run aggregation on'),
    pipeline: z
      .array(z.record(z.any()))
      .describe('MongoDB aggregation pipeline array (e.g., [{$match: {age: {$gt: 18}}}, {$group: {_id: "$country", count: {$sum: 1}}}])'),
    timeout: z
      .number()
      .int()
      .positive()
      .max(30000)
      .default(10000)
      .describe('Maximum execution time in milliseconds (max 30s)'),
  }),

  execute: async ({ collection, pipeline, timeout }) => {
    console.log(`📊 [MongoDB Aggregate] Running aggregation on: ${collection}`);
    console.log(`   Pipeline stages: ${pipeline.length}`);

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

      // Validate pipeline is not empty
      if (pipeline.length === 0) {
        return {
          success: false,
          error: 'EMPTY_PIPELINE',
          message: 'Aggregation pipeline cannot be empty',
        };
      }

      const db = await getMongoDatabase();
      const col = db.collection(collection);

      // Run aggregation with timeout
      const results = await col
        .aggregate(pipeline, {
          maxTimeMS: timeout,
          allowDiskUse: true, // Allow large result sets
        })
        .toArray();

      console.log(`✅ [MongoDB Aggregate] Returned ${results.length} result(s)`);

      return {
        success: true,
        results,
        count: results.length,
        collection,
        pipelineStages: pipeline.length,
      };
    } catch (error) {
      console.error(`❌ [MongoDB Aggregate] Failed:`, error);
      return {
        success: false,
        error: 'AGGREGATION_FAILED',
        message: `Failed to run aggregation: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
