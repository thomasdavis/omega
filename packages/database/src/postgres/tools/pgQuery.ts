/**
 * PostgreSQL Query Tool
 * Execute raw SQL queries with parameterized inputs
 * Includes audit logging and safety confirmations for destructive operations
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { QueryResult, QueryResultRow } from 'pg';
import { getPostgresPool } from '../client.js';
import { logDecision } from '../decisionLogService.js';

/**
 * Detect potentially dangerous SQL operations
 */
function isDangerousQuery(sql: string): { isDangerous: boolean; reason?: string } {
  const normalizedSql = sql.trim().toUpperCase();

  // DROP operations
  if (normalizedSql.startsWith('DROP ')) {
    return { isDangerous: true, reason: 'DROP operation detected' };
  }

  // TRUNCATE operations
  if (normalizedSql.startsWith('TRUNCATE ')) {
    return { isDangerous: true, reason: 'TRUNCATE operation detected' };
  }

  // DELETE without WHERE clause
  if (normalizedSql.startsWith('DELETE ') && !normalizedSql.includes('WHERE')) {
    return { isDangerous: true, reason: 'DELETE without WHERE clause detected' };
  }

  // UPDATE without WHERE clause
  if (normalizedSql.startsWith('UPDATE ') && !normalizedSql.includes('WHERE')) {
    return { isDangerous: true, reason: 'UPDATE without WHERE clause detected' };
  }

  // ALTER operations
  if (normalizedSql.startsWith('ALTER ')) {
    return { isDangerous: true, reason: 'ALTER operation detected' };
  }

  return { isDangerous: false };
}

export const pgQueryTool = tool({
  description: `Execute raw SQL queries on PostgreSQL database with audit logging and safety controls.

Use this when:
- User wants to run custom SQL queries
- User needs complex queries beyond other tools (WITH clauses, joins, aggregations)
- User wants to use PostgreSQL-specific features

⚠️ IMPORTANT: Use parameterized queries ($1, $2, etc.) for user input to prevent SQL injection.

🔒 SAFETY: Dangerous operations (DROP, TRUNCATE, DELETE/UPDATE without WHERE, ALTER) require confirmDangerous=true.

📝 AUDIT: All queries are logged to decision_logs table for accountability.

Examples:
- "Run this SQL query: SELECT * FROM users WHERE age > 18"
- "Execute: INSERT INTO logs (message) VALUES ($1)" with params ["Hello"]
- "Complex aggregation: WITH latest_images AS (...) SELECT * FROM latest_images JOIN user_profiles USING (user_id)"
- "Delete with confirmation: DELETE FROM logs WHERE created_at < NOW() - INTERVAL '30 days'" (requires confirmDangerous=true)`,

  inputSchema: z.object({
    sql: z.string().describe('SQL query to execute (use $1, $2, etc. for parameters)'),
    params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().describe('Query parameters for $1, $2, etc.'),
    rowMode: z.enum(['array', 'object']).default('object').describe('Return rows as objects or arrays'),
    confirmDangerous: z.boolean().optional().default(false).describe('Required to be true for dangerous operations (DROP, TRUNCATE, DELETE/UPDATE without WHERE, ALTER)'),
    userId: z.string().optional().describe('User ID for audit logging (automatically provided from context)'),
    username: z.string().optional().describe('Username for audit logging (automatically provided from context)'),
  }),

  execute: async ({ sql, params = [], rowMode, confirmDangerous = false, userId, username }) => {
    const startTime = Date.now();

    console.log(`🔍 [PostgreSQL Query] Executing SQL`);
    console.log(`   SQL: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`);
    console.log(`   Params: ${params.length} parameter(s)`);
    console.log(`   User: ${username || 'unknown'} (${userId || 'unknown'})`);

    // Safety check: Detect dangerous operations
    const dangerCheck = isDangerousQuery(sql);
    if (dangerCheck.isDangerous && !confirmDangerous) {
      console.warn(`⚠️  [PostgreSQL Query] Dangerous operation blocked: ${dangerCheck.reason}`);

      // Log blocked query to decision logs
      try {
        await logDecision({
          userId,
          username,
          decisionDescription: `PostgreSQL Query BLOCKED: ${dangerCheck.reason}`,
          blame: 'pgQueryTool',
          metadata: {
            decisionType: 'queryExecution',
            blocked: true,
            reason: dangerCheck.reason,
            sqlPreview: sql.substring(0, 200),
            paramCount: params.length,
          },
        });
      } catch (logError) {
        console.error('Failed to log blocked query:', logError);
      }

      return {
        success: false,
        error: 'DANGEROUS_QUERY_BLOCKED',
        message: `${dangerCheck.reason}. Set confirmDangerous=true to execute this query.`,
        blocked: true,
      };
    }

    try {
      const pool = await getPostgresPool();

      const result: QueryResult = rowMode === 'array'
        ? await pool.query({ text: sql, values: params, rowMode: 'array' })
        : await pool.query({ text: sql, values: params });

      const executionTime = Date.now() - startTime;

      console.log(`✅ [PostgreSQL Query] Executed: ${result.command}, ${result.rowCount} row(s) in ${executionTime}ms`);

      // Log successful query to decision logs
      try {
        await logDecision({
          userId,
          username,
          decisionDescription: `PostgreSQL Query: ${result.command} (${result.rowCount} rows)`,
          blame: 'pgQueryTool',
          metadata: {
            decisionType: 'queryExecution',
            command: result.command,
            rowCount: result.rowCount || 0,
            executionTimeMs: executionTime,
            sqlPreview: sql.substring(0, 200),
            paramCount: params.length,
            isDangerous: dangerCheck.isDangerous,
            confirmed: confirmDangerous,
          },
        });
      } catch (logError) {
        console.error('Failed to log query execution:', logError);
        // Don't fail the query if logging fails
      }

      return {
        success: true,
        rows: result.rows as QueryResultRow[],
        rowCount: result.rowCount || 0,
        command: result.command, // SELECT, INSERT, UPDATE, DELETE, etc.
        fields: result.fields?.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })),
        executionTimeMs: executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      console.error(`❌ [PostgreSQL Query] Failed:`, error);

      // Log failed query to decision logs
      try {
        await logDecision({
          userId,
          username,
          decisionDescription: `PostgreSQL Query FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`,
          blame: 'pgQueryTool',
          metadata: {
            decisionType: 'queryExecution',
            failed: true,
            errorMessage: error instanceof Error ? error.message : String(error),
            executionTimeMs: executionTime,
            sqlPreview: sql.substring(0, 200),
            paramCount: params.length,
          },
        });
      } catch (logError) {
        console.error('Failed to log query failure:', logError);
      }

      return {
        success: false,
        error: 'QUERY_FAILED',
        message: `Failed to execute query: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
