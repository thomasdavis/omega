/**
 * PostgreSQL Describe Table Tool
 * Show table schema, columns, types, and constraints
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool, isValidTableName, tableExists } from '../client.js';

export const pgDescribeTableTool = tool({
  description: `Show the schema of a PostgreSQL table (columns, types, constraints).

Use this when:
- User wants to see table structure/schema
- User asks "what columns does this table have?"
- User needs to understand the table definition

Examples:
- "Describe the users table"
- "What's the schema of the products table?"
- "Show me the structure of the orders table"`,

  inputSchema: z.object({
    table: z.string().describe('Table name to describe'),
  }),

  execute: async ({ table }) => {
    console.log(`🔍 [PostgreSQL Describe Table] Describing table: ${table}`);

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

      const pool = await getPostgresPool();

      // Get column information
      const columnsSql = `
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `;

      const columnsResult = await pool.query(columnsSql, [table]);

      const columns = columnsResult.rows.map(row => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        default: row.column_default,
        maxLength: row.character_maximum_length,
        precision: row.numeric_precision,
        scale: row.numeric_scale,
      }));

      // Get indexes
      const indexesSql = `
        SELECT
          i.relname as index_name,
          a.attname as column_name,
          ix.indisunique as is_unique,
          ix.indisprimary as is_primary
        FROM
          pg_class t,
          pg_class i,
          pg_index ix,
          pg_attribute a
        WHERE
          t.oid = ix.indrelid
          AND i.oid = ix.indexrelid
          AND a.attrelid = t.oid
          AND a.attnum = ANY(ix.indkey)
          AND t.relkind = 'r'
          AND t.relname = $1
        ORDER BY i.relname
      `;

      const indexesResult = await pool.query(indexesSql, [table]);

      // Group indexes by name
      const indexesMap = new Map<string, any>();
      for (const row of indexesResult.rows) {
        if (!indexesMap.has(row.index_name)) {
          indexesMap.set(row.index_name, {
            name: row.index_name,
            columns: [],
            unique: row.is_unique,
            primary: row.is_primary,
          });
        }
        indexesMap.get(row.index_name)!.columns.push(row.column_name);
      }

      const indexes = Array.from(indexesMap.values());

      // Get constraints
      const constraintsSql = `
        SELECT
          con.conname as constraint_name,
          con.contype as constraint_type,
          pg_get_constraintdef(con.oid) as definition
        FROM pg_constraint con
        INNER JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = $1
      `;

      const constraintsResult = await pool.query(constraintsSql, [table]);

      const constraints = constraintsResult.rows.map(row => ({
        name: row.constraint_name,
        type: row.constraint_type,
        definition: row.definition,
      }));

      console.log(`✅ [PostgreSQL Describe Table] Described table: ${table}`);

      return {
        success: true,
        table,
        columns,
        indexes,
        constraints,
      };
    } catch (error) {
      console.error(`❌ [PostgreSQL Describe Table] Failed:`, error);
      return {
        success: false,
        error: 'DESCRIBE_TABLE_FAILED',
        message: `Failed to describe table: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
