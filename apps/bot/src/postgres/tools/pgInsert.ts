/**
 * PostgreSQL Insert Tool
 * Insert one or multiple rows into a table
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool, isValidTableName, tableExists } from '../client.js';

export const pgInsertTool = tool({
  description: `Insert row(s) into a PostgreSQL table.

Use this when:
- User wants to insert/add new data to a table
- User wants to create new records
- User needs to insert multiple rows at once

Examples:
- "Insert a user: {name: 'Alice', email: 'alice@example.com'}"
- "Add 3 products to the products table"
- "Insert and return the inserted id"`,

  inputSchema: z.object({
    table: z.string().describe('Table name to insert into'),
    rows: z.union([z.record(z.any()), z.array(z.record(z.any()))]).describe('Single row object or array of rows'),
    returning: z.array(z.string()).optional().describe('Columns to return (e.g., ["id", "created_at"])'),
  }),

  execute: async ({ table, rows, returning }) => {
    console.log(`📝 [PostgreSQL Insert] Inserting into table: ${table}`);

    try {
      // Validate table name
      if (!isValidTableName(table)) {
        return {
          success: false,
          error: 'INVALID_TABLE_NAME',
          message: `Invalid table name: "${table}". Table names must start with a letter or underscore and contain only alphanumeric characters and underscores. Cannot use system tables (pg_*).`,
        };
      }

      // Check if table exists
      const exists = await tableExists(table);
      if (!exists) {
        return {
          success: false,
          error: 'TABLE_NOT_FOUND',
          message: `Table "${table}" does not exist. Create it first with pgCreateTable.`,
        };
      }

      // Normalize to array
      const rowsArray = Array.isArray(rows) ? rows : [rows];

      if (rowsArray.length === 0) {
        return {
          success: false,
          error: 'EMPTY_ROWS',
          message: 'No rows provided to insert',
        };
      }

      // Get columns from first row
      const columns = Object.keys(rowsArray[0]);
      if (columns.length === 0) {
        return {
          success: false,
          error: 'EMPTY_COLUMNS',
          message: 'Row has no columns',
        };
      }

      // Build parameterized query
      const pool = await getPostgresPool();
      const valueSets: string[] = [];
      const allValues: any[] = [];
      let paramIndex = 1;

      for (const row of rowsArray) {
        const rowValues = columns.map(col => row[col]);
        const placeholders = rowValues.map(() => `$${paramIndex++}`).join(', ');
        valueSets.push(`(${placeholders})`);
        allValues.push(...rowValues);
      }

      const returningClause = returning && returning.length > 0
        ? `RETURNING ${returning.join(', ')}`
        : '';

      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valueSets.join(', ')} ${returningClause}`;

      const result = await pool.query(sql, allValues);

      console.log(`✅ [PostgreSQL Insert] Inserted ${result.rowCount} row(s) into ${table}`);

      return {
        success: true,
        insertedCount: result.rowCount || 0,
        returning: result.rows,
        table,
      };
    } catch (error) {
      console.error(`❌ [PostgreSQL Insert] Failed:`, error);
      return {
        success: false,
        error: 'INSERT_FAILED',
        message: `Failed to insert rows: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
