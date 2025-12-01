/**
 * PostgreSQL Update Tool
 * Update rows in a table with WHERE conditions
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool, isValidTableName, tableExists } from '../client.js';

export const pgUpdateTool = tool({
  description: `Update row(s) in a PostgreSQL table.

Use this when:
- User wants to modify/update existing records
- User needs to change column values
- User wants to update multiple rows matching a condition

⚠️ IMPORTANT: WHERE conditions are required for safety to prevent accidental updates of all rows.

Examples:
- "Update user with id=123 to set name='John'"
- "Set all products where price > 100 to sale=true"
- "Update and return the modified rows"`,

  inputSchema: z.object({
    table: z.string().describe('Table name to update'),
    set: z.record(z.any()).describe('Columns to update with new values'),
    where: z.record(z.any()).describe('WHERE conditions (required for safety)'),
    returning: z.array(z.string()).optional().describe('Columns to return from updated rows'),
  }),

  execute: async ({ table, set, where, returning }) => {
    console.log(`✏️ [PostgreSQL Update] Updating table: ${table}`);

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

      // Require WHERE clause
      if (!where || Object.keys(where).length === 0) {
        return {
          success: false,
          error: 'WHERE_REQUIRED',
          message: 'WHERE conditions are required for UPDATE operations to prevent accidental updates of all rows',
        };
      }

      // Build SET clause
      const setColumns = Object.keys(set);
      if (setColumns.length === 0) {
        return {
          success: false,
          error: 'EMPTY_SET',
          message: 'No columns to update',
        };
      }

      const params: any[] = [];
      let paramIndex = 1;

      const setClauses = setColumns.map(col => {
        params.push(set[col]);
        return `${col} = $${paramIndex++}`;
      });

      // Build WHERE clause
      const whereConditions = Object.entries(where).map(([key, value]) => {
        params.push(value);
        return `${key} = $${paramIndex++}`;
      });

      // Build RETURNING clause
      const returningClause = returning && returning.length > 0
        ? `RETURNING ${returning.join(', ')}`
        : '';

      // Build final query
      const sql = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${whereConditions.join(' AND ')} ${returningClause}`;

      const pool = await getPostgresPool();
      const result = await pool.query(sql, params);

      console.log(`✅ [PostgreSQL Update] Updated ${result.rowCount} row(s)`);

      return {
        success: true,
        updatedCount: result.rowCount || 0,
        returning: result.rows,
        table,
      };
    } catch (error) {
      console.error(`❌ [PostgreSQL Update] Failed:`, error);
      return {
        success: false,
        error: 'UPDATE_FAILED',
        message: `Failed to update rows: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
