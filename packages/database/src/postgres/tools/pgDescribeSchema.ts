/**
 * PostgreSQL Describe Schema Tool
 * Show the entire database schema (all tables, columns, indexes, constraints)
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool } from '../client.js';

export const pgDescribeSchemaTool = tool({
  description: `Show the complete database schema including all tables, columns, types, indexes, and constraints.

Use this when:
- User wants to see the entire database structure
- User asks "what tables exist?" or "show me the database schema"
- User needs to understand the full data model
- User wants to explore all available tables

Examples:
- "Show me the database schema"
- "What tables are in the database?"
- "Describe the entire database structure"
- "What's the data model?"`,

  inputSchema: z.object({
    includeSystemTables: z.boolean().optional().describe('Include system tables (pg_*, information_schema). Default: false'),
  }),

  execute: async ({ includeSystemTables = false }) => {
    console.log(`🔍 [PostgreSQL Describe Schema] Describing entire schema (includeSystemTables: ${includeSystemTables})`);

    try {
      const pool = await getPostgresPool();

      // Get all tables
      const tablesSql = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ${includeSystemTables ? '' : "AND table_name NOT LIKE 'pg_%' AND table_name != 'information_schema'"}
        ORDER BY table_name
      `;

      const tablesResult = await pool.query(tablesSql);
      const tables: any[] = [];

      // For each table, get detailed information
      for (const tableRow of tablesResult.rows) {
        const tableName = tableRow.table_name;

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

        const columnsResult = await pool.query(columnsSql, [tableName]);

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

        const indexesResult = await pool.query(indexesSql, [tableName]);

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

        const constraintsResult = await pool.query(constraintsSql, [tableName]);

        const constraints = constraintsResult.rows.map(row => ({
          name: row.constraint_name,
          type: row.constraint_type,
          definition: row.definition,
        }));

        // Get row count (approximate)
        const countSql = `
          SELECT reltuples::bigint AS approximate_row_count
          FROM pg_class
          WHERE relname = $1
        `;

        const countResult = await pool.query(countSql, [tableName]);
        const rowCount = countResult.rows[0]?.approximate_row_count || 0;

        tables.push({
          name: tableName,
          columns,
          indexes,
          constraints,
          approximateRowCount: Number(rowCount),
        });
      }

      console.log(`✅ [PostgreSQL Describe Schema] Described ${tables.length} tables`);

      return {
        success: true,
        tableCount: tables.length,
        tables,
      };
    } catch (error) {
      console.error(`❌ [PostgreSQL Describe Schema] Failed:`, error);
      return {
        success: false,
        error: 'DESCRIBE_SCHEMA_FAILED',
        message: `Failed to describe schema: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
