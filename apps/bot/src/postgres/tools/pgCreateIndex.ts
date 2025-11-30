/**
 * PostgreSQL Create Index Tool
 * Create an index on a table to improve query performance
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool, isValidTableName, isValidColumnName, tableExists } from '../client.js';

export const pgCreateIndexTool = tool({
  description: `Create an index on a PostgreSQL table to improve query performance.

Use this when:
- User wants to speed up queries on certain columns
- User needs to create a unique constraint via index
- User wants to optimize search performance

Index types:
- btree (default) - General purpose, supports <, <=, =, >=, >
- hash - Equality comparisons only (=)
- gin - Full-text search, JSONB, arrays
- gist - Geometric data, full-text search

Examples:
- "Create an index on the email column in users table"
- "Make a unique index on username"
- "Create a GIN index on the tags JSONB column"`,

  inputSchema: z.object({
    table: z.string().describe('Table name to create index on'),
    indexName: z.string().optional().describe('Index name (auto-generated if not provided)'),
    columns: z.array(z.string()).describe('Column names to index'),
    unique: z.boolean().default(false).describe('Whether this is a unique index'),
    indexType: z.enum(['btree', 'hash', 'gin', 'gist']).default('btree').describe('Index type'),
    ifNotExists: z.boolean().default(true).describe('Add IF NOT EXISTS clause'),
  }),

  execute: async ({ table, indexName, columns, unique, indexType, ifNotExists }) => {
    console.log(`📇 [PostgreSQL Create Index] Creating index on table: ${table}`);

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

      // Validate columns
      if (columns.length === 0) {
        return {
          success: false,
          error: 'NO_COLUMNS',
          message: 'At least one column is required for an index',
        };
      }

      for (const col of columns) {
        if (!isValidColumnName(col)) {
          return {
            success: false,
            error: 'INVALID_COLUMN_NAME',
            message: `Invalid column name: "${col}"`,
          };
        }
      }

      // Generate index name if not provided
      const finalIndexName = indexName || `idx_${table}_${columns.join('_')}`;

      // Validate index name
      if (!isValidTableName(finalIndexName)) {
        return {
          success: false,
          error: 'INVALID_INDEX_NAME',
          message: `Invalid index name: "${finalIndexName}"`,
        };
      }

      // Build CREATE INDEX statement
      const uniqueClause = unique ? 'UNIQUE' : '';
      const ifNotExistsClause = ifNotExists ? 'IF NOT EXISTS' : '';
      const methodClause = indexType !== 'btree' ? `USING ${indexType}` : '';

      const sql = `CREATE ${uniqueClause} INDEX ${ifNotExistsClause} ${finalIndexName} ON ${table} ${methodClause} (${columns.join(', ')})`;

      const pool = await getPostgresPool();
      await pool.query(sql);

      console.log(`✅ [PostgreSQL Create Index] Created index: ${finalIndexName}`);

      return {
        success: true,
        table,
        indexName: finalIndexName,
        columns,
        unique,
        indexType,
        message: `Index "${finalIndexName}" created successfully`,
      };
    } catch (error) {
      console.error(`❌ [PostgreSQL Create Index] Failed:`, error);
      return {
        success: false,
        error: 'CREATE_INDEX_FAILED',
        message: `Failed to create index: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
