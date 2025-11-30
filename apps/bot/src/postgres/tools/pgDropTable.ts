/**
 * PostgreSQL Drop Table Tool
 * Drop (delete) an entire table from the database
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool, isValidTableName, tableExists } from '../client.js';

export const pgDropTableTool = tool({
  description: `Drop (delete) a table from the PostgreSQL database.

⚠️ DANGER: This permanently deletes the entire table and all its data!
Cannot drop system tables (pg_*).

Use this when:
- User wants to delete an entire table
- User needs to remove a table permanently
- User wants to clean up old tables

Examples:
- "Drop the temp table"
- "Delete the old_users table"
- "Remove the test_data table"`,

  inputSchema: z.object({
    table: z.string().describe('Table name to drop'),
    cascade: z.boolean().default(false).describe('Also drop dependent objects (CASCADE)'),
    confirmDeletion: z.boolean().default(false).describe('Confirmation flag (must be true to drop)'),
  }),

  execute: async ({ table, cascade, confirmDeletion }) => {
    console.log(`🗑️ [PostgreSQL Drop Table] Attempting to drop table: ${table}`);

    try {
      // Require confirmation
      if (!confirmDeletion) {
        return {
          success: false,
          error: 'CONFIRMATION_REQUIRED',
          message: `Dropping a table is permanent and cannot be undone. Set confirmDeletion=true to proceed with deleting "${table}"`,
        };
      }

      // Validate table name
      if (!isValidTableName(table)) {
        return {
          success: false,
          error: 'INVALID_TABLE_NAME',
          message: `Invalid table name: "${table}"`,
        };
      }

      // Extra safety: prevent dropping system tables
      if (table.startsWith('pg_') || table === 'information_schema') {
        return {
          success: false,
          error: 'SYSTEM_TABLE_PROTECTED',
          message: `Cannot drop system table "${table}"`,
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

      const cascadeClause = cascade ? 'CASCADE' : '';
      const sql = `DROP TABLE ${table} ${cascadeClause}`;

      const pool = await getPostgresPool();
      await pool.query(sql);

      console.log(`✅ [PostgreSQL Drop Table] Dropped table: ${table}`);

      return {
        success: true,
        table,
        message: `Table "${table}" has been permanently deleted`,
      };
    } catch (error) {
      console.error(`❌ [PostgreSQL Drop Table] Failed:`, error);
      return {
        success: false,
        error: 'DROP_TABLE_FAILED',
        message: `Failed to drop table: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
