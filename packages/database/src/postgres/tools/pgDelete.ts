/**
 * PostgreSQL Delete Tool
 * Delete rows from a table with WHERE conditions
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool, isValidTableName, tableExists } from '../client.js';

export const pgDeleteTool = tool({
  description: `Delete row(s) from a PostgreSQL table.

Use this when:
- User wants to remove/delete records from a table
- User needs to delete rows matching specific conditions

⚠️ DANGER: Deletion is permanent and cannot be undone!
⚠️ IMPORTANT: WHERE conditions and confirmDeletion flag are required.

Examples:
- "Delete user with id=123"
- "Remove all expired sessions"
- "Delete all rows where status='inactive'"`,

  inputSchema: z.object({
    table: z.string().describe('Table name to delete from'),
    where: z.record(z.any()).describe('WHERE conditions (required for safety)'),
    confirmDeletion: z.boolean().default(false).describe('Confirmation flag (must be true to delete)'),
  }),

  execute: async ({ table, where, confirmDeletion }) => {
    console.log(`🗑️ [PostgreSQL Delete] Deleting from table: ${table}`);

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
          message: 'WHERE conditions are required for DELETE operations to prevent accidental deletion of all rows',
        };
      }

      // Require confirmation
      if (!confirmDeletion) {
        return {
          success: false,
          error: 'CONFIRMATION_REQUIRED',
          message: 'Deletion requires confirmDeletion=true to proceed',
        };
      }

      // Build WHERE clause
      const params: any[] = [];
      let paramIndex = 1;

      const whereConditions = Object.entries(where).map(([key, value]) => {
        params.push(value);
        return `${key} = $${paramIndex++}`;
      });

      const sql = `DELETE FROM ${table} WHERE ${whereConditions.join(' AND ')}`;

      const pool = await getPostgresPool();
      const result = await pool.query(sql, params);

      console.log(`✅ [PostgreSQL Delete] Deleted ${result.rowCount} row(s)`);

      return {
        success: true,
        deletedCount: result.rowCount || 0,
        table,
      };
    } catch (error) {
      console.error(`❌ [PostgreSQL Delete] Failed:`, error);
      return {
        success: false,
        error: 'DELETE_FAILED',
        message: `Failed to delete rows: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
