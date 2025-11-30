/**
 * PostgreSQL Count Tool
 * Count rows in a table matching optional conditions
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool, isValidTableName, tableExists } from '../client.js';

export const pgCountTool = tool({
  description: `Count rows in a PostgreSQL table.

Use this when:
- User wants to count how many rows match certain criteria
- User needs to know the total number of records
- User wants statistics about row counts

Examples:
- "How many users are there?"
- "Count all products where price > 100"
- "Get the number of active sessions"`,

  inputSchema: z.object({
    table: z.string().describe('Table name to count rows in'),
    where: z.record(z.any()).optional().describe('Optional WHERE conditions'),
  }),

  execute: async ({ table, where }) => {
    console.log(`🔢 [PostgreSQL Count] Counting rows in table: ${table}`);

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

      // Build WHERE clause
      const params: any[] = [];
      let whereClause = '';

      if (where && Object.keys(where).length > 0) {
        let paramIndex = 1;
        const whereConditions = Object.entries(where).map(([key, value]) => {
          params.push(value);
          return `${key} = $${paramIndex++}`;
        });
        whereClause = `WHERE ${whereConditions.join(' AND ')}`;
      }

      const sql = `SELECT COUNT(*) as count FROM ${table} ${whereClause}`;

      const pool = await getPostgresPool();
      const result = await pool.query(sql, params);

      const count = parseInt(result.rows[0].count, 10);

      console.log(`✅ [PostgreSQL Count] Found ${count} row(s)`);

      return {
        success: true,
        count,
        table,
      };
    } catch (error) {
      console.error(`❌ [PostgreSQL Count] Failed:`, error);
      return {
        success: false,
        error: 'COUNT_FAILED',
        message: `Failed to count rows: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
