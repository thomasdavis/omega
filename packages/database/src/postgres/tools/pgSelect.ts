/**
 * PostgreSQL Select Tool
 * Query rows from a table with filters, joins, sorting, and pagination
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool, isValidTableName, tableExists } from '../client.js';

export const pgSelectTool = tool({
  description: `Query rows from a PostgreSQL table with filters, joins, sorting, and pagination.

Use this when:
- User wants to fetch/query/select data from a table
- User needs to filter, sort, or paginate results
- User wants to join multiple tables

Examples:
- "Get all users where age > 18"
- "Find products sorted by price, limit 10"
- "Query orders with customer info (join)"`,

  inputSchema: z.object({
    table: z.string().describe('Table name to query from'),
    columns: z.array(z.string()).optional().describe('Columns to select (default: all columns with *)'),
    where: z.record(z.any()).optional().describe('WHERE conditions as key-value pairs'),
    orderBy: z.array(z.object({
      column: z.string(),
      direction: z.enum(['ASC', 'DESC']).default('ASC'),
    })).optional().describe('Sort order'),
    limit: z.number().int().positive().max(1000).optional().describe('Maximum rows to return'),
    offset: z.number().int().min(0).optional().describe('Number of rows to skip (pagination)'),
    joins: z.array(z.object({
      type: z.enum(['INNER', 'LEFT', 'RIGHT', 'FULL']),
      table: z.string(),
      on: z.string().describe('Join condition (e.g., "users.id = orders.user_id")'),
    })).optional().describe('Table joins'),
  }),

  execute: async ({ table, columns, where, orderBy, limit, offset, joins }) => {
    console.log(`🔍 [PostgreSQL Select] Querying table: ${table}`);

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

      // Build SELECT clause
      const selectClause = columns && columns.length > 0
        ? columns.join(', ')
        : '*';

      // Build JOIN clauses
      let joinClause = '';
      if (joins && joins.length > 0) {
        joinClause = joins.map(j => `${j.type} JOIN ${j.table} ON ${j.on}`).join(' ');
      }

      // Build WHERE clause
      const whereConditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (where) {
        for (const [key, value] of Object.entries(where)) {
          whereConditions.push(`${key} = $${paramIndex++}`);
          params.push(value);
        }
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Build ORDER BY clause
      const orderByClause = orderBy && orderBy.length > 0
        ? `ORDER BY ${orderBy.map(o => `${o.column} ${o.direction}`).join(', ')}`
        : '';

      // Build LIMIT/OFFSET clause
      let limitClause = '';
      if (limit !== undefined) {
        limitClause = `LIMIT ${limit}`;
      }
      if (offset !== undefined) {
        limitClause += ` OFFSET ${offset}`;
      }

      // Build final query
      const sql = `SELECT ${selectClause} FROM ${table} ${joinClause} ${whereClause} ${orderByClause} ${limitClause}`.trim();

      const pool = await getPostgresPool();
      const result = await pool.query(sql, params);

      console.log(`✅ [PostgreSQL Select] Found ${result.rowCount} row(s)`);

      return {
        success: true,
        rows: result.rows,
        count: result.rowCount || 0,
        table,
      };
    } catch (error) {
      console.error(`❌ [PostgreSQL Select] Failed:`, error);
      return {
        success: false,
        error: 'SELECT_FAILED',
        message: `Failed to query rows: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
