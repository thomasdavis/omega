/**
 * Postgres Query Executor Tool
 * Enables generic execution of PostgreSQL queries via a secure and efficient interface
 *
 * This tool provides:
 * - Safe parameterized query execution
 * - SELECT-only queries for security
 * - Structured JSON results with metadata
 * - Column information and data types
 * - Row count and query statistics
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool } from '@repo/database';

export const postgresQueryExecutorTool = tool({
  description: `Execute PostgreSQL SELECT queries directly against the production database.

  This tool enables advanced database operations including:
  - Ad-hoc data inspection and analytics
  - Channel message history querying
  - Semantic alignment project data inspection
  - Custom reporting and aggregations

  Features:
  - Parameterized queries for safety ($1, $2, etc.)
  - Returns structured JSON with column metadata
  - Includes data types, row counts, and execution info

  SECURITY: Only SELECT queries are allowed. No INSERT/UPDATE/DELETE/DROP operations.

  Examples:
  - SELECT * FROM channel_message_history WHERE user_id = $1
  - SELECT COUNT(*) FROM users WHERE created_at > $1
  - SELECT channel_id, COUNT(*) as msg_count FROM messages GROUP BY channel_id`,

  inputSchema: z.object({
    query: z.string().describe('The SQL SELECT query to execute. Use $1, $2, etc. for parameterized values'),
    params: z.array(z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.null()
    ])).optional().describe('Optional array of parameter values for $1, $2, etc. in the query'),
  }),

  execute: async ({ query, params }) => {
    try {
      // Validate query is SELECT only (case-insensitive, handles whitespace)
      const trimmedQuery = query.trim();
      const upperQuery = trimmedQuery.toUpperCase();

      // Check for SELECT at start (allowing for WITH CTEs)
      const isSelect = upperQuery.startsWith('SELECT') || upperQuery.startsWith('WITH');

      if (!isSelect) {
        return {
          success: false,
          error: 'Only SELECT queries (including WITH CTEs) are allowed. No INSERT/UPDATE/DELETE/DROP/ALTER operations permitted.',
          query: trimmedQuery,
        };
      }

      // Additional safety: block dangerous keywords in the query
      const dangerousKeywords = [
        'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE',
        'ALTER', 'CREATE', 'GRANT', 'REVOKE'
      ];

      // Split query into parts and check each (to avoid false positives in strings)
      // This is a basic check - parameterized queries provide the main protection
      const queryParts = upperQuery.split(/['";]/);
      const hasDangerousKeyword = queryParts.some(part =>
        dangerousKeywords.some(keyword =>
          // Check for keyword as a standalone word (with word boundaries)
          new RegExp(`\\b${keyword}\\b`).test(part)
        )
      );

      if (hasDangerousKeyword) {
        return {
          success: false,
          error: 'Query contains forbidden operations. Only SELECT queries are allowed for security.',
          query: trimmedQuery,
        };
      }

      // Get PostgreSQL connection pool
      const pool = await getPostgresPool();

      // Execute query with parameters (if provided)
      const startTime = Date.now();
      const result = params && params.length > 0
        ? await pool.query(query, params)
        : await pool.query(query);
      const executionTimeMs = Date.now() - startTime;

      // Extract column metadata
      const columns = result.fields.map(field => ({
        name: field.name,
        dataTypeID: field.dataTypeID,
        tableID: field.tableID,
        columnID: field.columnID,
      }));

      // Convert rows to plain objects for clean JSON output
      const rows = result.rows.map(row => {
        const obj: Record<string, any> = {};
        Object.keys(row).forEach(key => {
          obj[key] = row[key];
        });
        return obj;
      });

      return {
        success: true,
        rowCount: result.rowCount ?? 0,
        rows: rows,
        columns: columns,
        executionTimeMs: executionTimeMs,
        query: trimmedQuery,
        note: rows.length === 0
          ? 'Query executed successfully but returned no rows.'
          : `Query executed successfully. Returned ${result.rowCount} row(s).`,
      };

    } catch (error) {
      // Handle PostgreSQL errors with detailed messages
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = error instanceof Error && 'code' in error
        ? { code: (error as any).code, detail: (error as any).detail }
        : undefined;

      return {
        success: false,
        error: errorMessage,
        errorDetails: errorDetails,
        query: query,
        note: 'Query execution failed. Check error message for details.',
      };
    }
  },
});
