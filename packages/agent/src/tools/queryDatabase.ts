/**
 * Query Database Tool
 * Allows querying the production database for debugging and analysis
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getDatabase } from '@repo/database';// OLD:client.js';

export const queryDatabaseTool = tool({
  description: `Query the production SQLite database directly for debugging and analysis.

  Use this to:
  - Debug user profile issues (check message counts, profile data)
  - Inspect database state
  - Verify data integrity
  - Troubleshoot missing or incorrect data

  SAFETY: Only SELECT queries are allowed. No INSERT/UPDATE/DELETE.`,

  inputSchema: z.object({
    query: z.string().describe('The SQL SELECT query to execute (SELECT only, no modifications)'),
    params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().describe('Optional query parameters for prepared statements'),
  }),

  execute: async ({ query, params }) => {
    try {
      // Safety check: only allow SELECT queries
      const trimmedQuery = query.trim().toUpperCase();
      if (!trimmedQuery.startsWith('SELECT')) {
        return {
          success: false,
          error: 'Only SELECT queries are allowed for safety. No INSERT/UPDATE/DELETE/DROP operations.',
        };
      }

      // Execute query
      const db = getDatabase();
      const result = params && params.length > 0
        ? await db.execute({ sql: query, args: params })
        : await db.execute(query);

      // Convert rows to plain objects for better readability
      const rows = result.rows.map(row => {
        const obj: Record<string, any> = {};
        Object.keys(row).forEach(key => {
          obj[key] = row[key];
        });
        return obj;
      });

      return {
        success: true,
        rowCount: rows.length,
        rows: rows,
        columns: result.columns || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error executing query',
      };
    }
  },
});
