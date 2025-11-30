/**
 * PostgreSQL List Indexes Tool
 * List all indexes on a table
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool, isValidTableName, tableExists } from '../client.js';

export const pgListIndexesTool = tool({
  description: `List all indexes on a PostgreSQL table.

Use this when:
- User wants to see what indexes exist on a table
- User needs to check index names before dropping
- User wants to understand query optimization

Examples:
- "What indexes are on the users table?"
- "List all indexes for products"
- "Show me the indexes on orders table"`,

  inputSchema: z.object({
    table: z.string().describe('Table name to list indexes for'),
  }),

  execute: async ({ table }) => {
    console.log(`📇 [PostgreSQL List Indexes] Listing indexes for table: ${table}`);

    try {
      // Validate table name
      if (!isValidTableName(table)) {
        return {
          success: false,
          error: 'INVALID_TABLE_NAME',
          message: `Invalid table name: "${table}"`,
        };
      }

      // Check if table exists
      const exists = await tableExists(table);
      if (!exists) {
        return {
          success: false,
          error: 'TABLE_NOT_FOUND',
          message: `Table "${table}" does not exist`,
        };
      }

      const pool = await getPostgresPool();

      const sql = `
        SELECT
          i.relname as index_name,
          a.attname as column_name,
          ix.indisunique as is_unique,
          ix.indisprimary as is_primary,
          am.amname as index_type
        FROM
          pg_class t,
          pg_class i,
          pg_index ix,
          pg_attribute a,
          pg_am am
        WHERE
          t.oid = ix.indrelid
          AND i.oid = ix.indexrelid
          AND a.attrelid = t.oid
          AND a.attnum = ANY(ix.indkey)
          AND t.relkind = 'r'
          AND t.relname = $1
          AND i.relam = am.oid
        ORDER BY i.relname
      `;

      const result = await pool.query(sql, [table]);

      // Group indexes by name
      const indexesMap = new Map<string, any>();
      for (const row of result.rows) {
        if (!indexesMap.has(row.index_name)) {
          indexesMap.set(row.index_name, {
            name: row.index_name,
            columns: [],
            unique: row.is_unique,
            primary: row.is_primary,
            type: row.index_type,
          });
        }
        indexesMap.get(row.index_name)!.columns.push(row.column_name);
      }

      const indexes = Array.from(indexesMap.values());

      console.log(`✅ [PostgreSQL List Indexes] Found ${indexes.length} index(es)`);

      return {
        success: true,
        table,
        indexes,
        count: indexes.length,
      };
    } catch (error) {
      console.error(`❌ [PostgreSQL List Indexes] Failed:`, error);
      return {
        success: false,
        error: 'LIST_INDEXES_FAILED',
        message: `Failed to list indexes: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
