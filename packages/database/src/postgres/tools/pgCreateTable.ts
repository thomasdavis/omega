/**
 * PostgreSQL Create Table Tool
 * Create a new table with columns and constraints
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool, isValidTableName, isValidColumnName, tableExists } from '../client.js';

export const pgCreateTableTool = tool({
  description: `Create a new table in the PostgreSQL database.

Use this when:
- User wants to create a new table
- User needs to define a table schema with columns and types
- User wants to set up a new data structure

PostgreSQL data types: TEXT, VARCHAR(n), INTEGER, BIGINT, SERIAL, BIGSERIAL, BOOLEAN, DECIMAL(p,s), NUMERIC, REAL, DOUBLE PRECISION, DATE, TIME, TIMESTAMP, TIMESTAMPTZ, JSONB, UUID, etc.

Examples:
- "Create a users table with id, name, email"
- "Make a products table with id (serial primary key), name (text), price (decimal)"
- "Create a table for storing logs"`,

  inputSchema: z.object({
    table: z.string().describe('Table name to create'),
    columns: z.array(z.object({
      name: z.string().describe('Column name'),
      type: z.string().describe('PostgreSQL data type (e.g., TEXT, INTEGER, SERIAL, JSONB, TIMESTAMP)'),
      nullable: z.boolean().default(true).describe('Whether column can be NULL'),
      primaryKey: z.boolean().default(false).describe('Whether this is a primary key'),
      unique: z.boolean().default(false).describe('Whether values must be unique'),
      defaultValue: z.string().optional().describe('Default value SQL expression'),
    })).describe('Column definitions'),
    ifNotExists: z.boolean().default(true).describe('Add IF NOT EXISTS clause to prevent error if table exists'),
  }),

  execute: async ({ table, columns, ifNotExists }) => {
    console.log(`🆕 [PostgreSQL Create Table] Creating table: ${table}`);

    try {
      // Validate table name
      if (!isValidTableName(table)) {
        return {
          success: false,
          error: 'INVALID_TABLE_NAME',
          message: `Invalid table name: "${table}"`,
        };
      }

      // Check if table already exists (if not using IF NOT EXISTS)
      if (!ifNotExists) {
        const exists = await tableExists(table);
        if (exists) {
          return {
            success: false,
            error: 'TABLE_ALREADY_EXISTS',
            message: `Table "${table}" already exists`,
          };
        }
      }

      // Validate columns
      if (columns.length === 0) {
        return {
          success: false,
          error: 'NO_COLUMNS',
          message: 'At least one column is required',
        };
      }

      for (const col of columns) {
        if (!isValidColumnName(col.name)) {
          return {
            success: false,
            error: 'INVALID_COLUMN_NAME',
            message: `Invalid column name: "${col.name}"`,
          };
        }
      }

      // Build column definitions
      const columnDefs = columns.map(col => {
        let def = `${col.name} ${col.type}`;

        if (col.primaryKey) {
          def += ' PRIMARY KEY';
        }

        if (!col.nullable && !col.primaryKey) {
          def += ' NOT NULL';
        }

        if (col.unique && !col.primaryKey) {
          def += ' UNIQUE';
        }

        if (col.defaultValue) {
          def += ` DEFAULT ${col.defaultValue}`;
        }

        return def;
      });

      const ifNotExistsClause = ifNotExists ? 'IF NOT EXISTS' : '';
      const sql = `CREATE TABLE ${ifNotExistsClause} ${table} (${columnDefs.join(', ')})`;

      const pool = await getPostgresPool();
      await pool.query(sql);

      console.log(`✅ [PostgreSQL Create Table] Created table: ${table}`);

      return {
        success: true,
        table,
        columns: columns.map(c => ({ name: c.name, type: c.type })),
        message: `Table "${table}" created successfully`,
      };
    } catch (error) {
      console.error(`❌ [PostgreSQL Create Table] Failed:`, error);
      return {
        success: false,
        error: 'CREATE_TABLE_FAILED',
        message: `Failed to create table: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
