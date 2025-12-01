/**
 * SQLite to JSON Export Script
 * Exports all data from LibSQL (SQLite) database to JSON files
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getDatabase } from '../libsql/client.js';

const EXPORT_DIR = './migration-data';

/**
 * Export a single table to JSON
 */
async function exportTable(tableName: string): Promise<void> {
  const db = getDatabase();
  console.log(`📤 Exporting ${tableName}...`);

  try {
    const result = await db.execute(`SELECT * FROM ${tableName}`);
    const rows = result.rows;

    console.log(`   Found ${rows.length} rows`);

    // Write to JSON file
    const filePath = join(EXPORT_DIR, `${tableName}.json`);
    writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf-8');

    console.log(`✅ Exported ${tableName} to ${filePath}`);
  } catch (error) {
    console.error(`❌ Failed to export ${tableName}:`, error);
    throw error;
  }
}

/**
 * Export metadata about the export
 */
function exportMetadata(tables: string[]): void {
  const metadata = {
    exportDate: new Date().toISOString(),
    exportTimestamp: Date.now(),
    tables,
    tableCount: tables.length,
    version: '1.0.0',
  };

  const filePath = join(EXPORT_DIR, '_metadata.json');
  writeFileSync(filePath, JSON.stringify(metadata, null, 2), 'utf-8');
  console.log(`✅ Exported metadata to ${filePath}`);
}

/**
 * Main export function
 * Exports all 6 tables from SQLite to JSON
 */
export async function exportAllTables(): Promise<void> {
  console.log('🚀 Starting SQLite export...');
  console.log(`   Export directory: ${EXPORT_DIR}`);

  // Create export directory
  try {
    mkdirSync(EXPORT_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists, ignore
  }

  const tables = [
    'messages',
    'queries',
    'documents',
    'document_collaborators',
    'user_profiles',
    'user_analysis_history',
  ];

  // Export each table
  for (const table of tables) {
    await exportTable(table);
  }

  // Export metadata
  exportMetadata(tables);

  console.log('✅ SQLite export completed successfully');
  console.log(`   ${tables.length} tables exported to ${EXPORT_DIR}`);
}

/**
 * CLI entry point
 * Run with: pnpm tsx packages/database/src/migrations/exportFromSQLite.ts
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  exportAllTables()
    .then(() => {
      console.log('✅ Export complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Export failed:', error);
      process.exit(1);
    });
}
