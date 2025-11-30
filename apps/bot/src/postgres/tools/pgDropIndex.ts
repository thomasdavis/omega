/**
 * PostgreSQL Drop Index Tool
 * Drop an index from a table
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool, isValidTableName } from '../client.js';

export const pgDropIndexTool = tool({
  description: `Drop (delete) an index from the PostgreSQL database.

⚠️ Dropping indexes can slow down queries! Only drop if you're sure.

Use this when:
- User wants to remove an index
- User needs to recreate an index with different settings
- User wants to clean up unused indexes

Examples:
- "Drop the email_idx index"
- "Remove the index called idx_users_name"
- "Delete the old_index"`,

  inputSchema: z.object({
    indexName: z.string().describe('Index name to drop'),
    ifExists: z.boolean().default(true).describe('Add IF EXISTS clause to prevent error'),
    cascade: z.boolean().default(false).describe('Also drop objects that depend on this index'),
  }),

  execute: async ({ indexName, ifExists, cascade }) => {
    console.log(`🗑️ [PostgreSQL Drop Index] Dropping index: ${indexName}`);

    try {
      // Validate index name
      if (!isValidTableName(indexName)) {
        return {
          success: false,
          error: 'INVALID_INDEX_NAME',
          message: `Invalid index name: "${indexName}"`,
        };
      }

      // Build DROP INDEX statement
      const ifExistsClause = ifExists ? 'IF EXISTS' : '';
      const cascadeClause = cascade ? 'CASCADE' : '';

      const sql = `DROP INDEX ${ifExistsClause} ${indexName} ${cascadeClause}`;

      const pool = await getPostgresPool();
      await pool.query(sql);

      console.log(`✅ [PostgreSQL Drop Index] Dropped index: ${indexName}`);

      return {
        success: true,
        indexName,
        message: `Index "${indexName}" has been dropped`,
      };
    } catch (error) {
      console.error(`❌ [PostgreSQL Drop Index] Failed:`, error);
      return {
        success: false,
        error: 'DROP_INDEX_FAILED',
        message: `Failed to drop index: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
