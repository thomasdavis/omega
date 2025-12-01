/**
 * PostgreSQL Query Tool
 * Execute raw SQL queries with parameterized inputs
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { QueryResult, QueryResultRow } from 'pg';
import { getPostgresPool } from '../client.js';

export const pgQueryTool = tool({
  description: `Execute raw SQL queries on PostgreSQL database.

Use this when:
- User wants to run custom SQL queries
- User needs complex queries beyond other tools
- User wants to use PostgreSQL-specific features

⚠️ IMPORTANT: Use parameterized queries ($1, $2, etc.) for user input to prevent SQL injection.

Examples:
- "Run this SQL query: SELECT * FROM users WHERE age > 18"
- "Execute: INSERT INTO logs (message) VALUES ($1)" with params
- "Get all tables: SELECT tablename FROM pg_tables WHERE schemaname='public'"`,

  inputSchema: z.object({
    sql: z.string().describe('SQL query to execute (use $1, $2, etc. for parameters)'),
    params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().describe('Query parameters for $1, $2, etc.'),
    rowMode: z.enum(['array', 'object']).default('object').describe('Return rows as objects or arrays'),
  }),

  execute: async ({ sql, params = [], rowMode }) => {
    console.log(`🔍 [PostgreSQL Query] Executing SQL`);
    console.log(`   SQL: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`);
    console.log(`   Params: ${params.length} parameter(s)`);

    try {
      const pool = await getPostgresPool();

      const result: QueryResult = rowMode === 'array'
        ? await pool.query({ text: sql, values: params, rowMode: 'array' })
        : await pool.query({ text: sql, values: params });

      console.log(`✅ [PostgreSQL Query] Executed: ${result.command}, ${result.rowCount} row(s)`);

      return {
        success: true,
        rows: result.rows as QueryResultRow[],
        rowCount: result.rowCount || 0,
        command: result.command, // SELECT, INSERT, UPDATE, DELETE, etc.
        fields: result.fields?.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })),
      };
    } catch (error) {
      console.error(`❌ [PostgreSQL Query] Failed:`, error);
      return {
        success: false,
        error: 'QUERY_FAILED',
        message: `Failed to execute query: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
