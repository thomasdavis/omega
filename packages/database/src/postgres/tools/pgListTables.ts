/**
 * PostgreSQL List Tables Tool
 * List all tables in the database
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool } from '../client.js';

export const pgListTablesTool = tool({
  description: `List all tables in the PostgreSQL database.

Use this when:
- User wants to see what tables exist
- User asks "what tables are there?"
- User needs to browse available tables

Examples:
- "What tables are in PostgreSQL?"
- "List all my tables"
- "Show me the database schema"`,

  inputSchema: z.object({
    includeSystemTables: z.boolean().default(false).describe('Whether to include system tables (pg_*, information_schema)'),
  }),

  execute: async ({ includeSystemTables }) => {
    console.log(`📋 [PostgreSQL List Tables] Listing tables`);

    try {
      const pool = await getPostgresPool();

      let sql = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `;

      if (!includeSystemTables) {
        sql += ` AND table_name NOT LIKE 'pg_%'`;
      }

      sql += ` ORDER BY table_name`;

      const result = await pool.query(sql);

      const tables = result.rows.map(row => row.table_name);

      console.log(`✅ [PostgreSQL List Tables] Found ${tables.length} table(s)`);

      return {
        success: true,
        tables,
        count: tables.length,
      };
    } catch (error) {
      console.error(`❌ [PostgreSQL List Tables] Failed:`, error);
      return {
        success: false,
        error: 'LIST_TABLES_FAILED',
        message: `Failed to list tables: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
