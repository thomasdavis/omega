/**
 * JSON to PostgreSQL Import Script
 * Imports data from JSON files into Railway PostgreSQL database
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { getPostgresPool } from '../postgres/client.js';
import type { Pool } from 'pg';

const IMPORT_DIR = './migration-data';

/**
 * Convert SQLite row to PostgreSQL-compatible row
 * Handles type conversions:
 * - TEXT JSON fields → JSONB
 * - INTEGER booleans → BOOLEAN
 */
function convertRowForPostgres(row: any, tableName: string): any {
  const converted = { ...row };

  // Fields that should be converted to JSONB
  const jsonbFields: { [key: string]: string[] } = {
    messages: ['metadata', 'sentiment_analysis', 'response_decision'],
    queries: ['query_result', 'sentiment_analysis'],
    documents: ['metadata'],
    user_profiles: [
      'secondary_archetypes',
      'primary_interests',
      'expertise_areas',
      'notable_patterns',
      'dominant_emotions',
      'feelings_json',
      'personality_facets',
      'cultural_values',
      'predicted_behaviors',
      'world_model_adjustments',
      'personal_model_adjustments',
      'uploaded_photo_metadata',
      'distinctive_features',
      'accessories',
    ],
    user_analysis_history: ['feelings_snapshot', 'personality_snapshot'],
  };

  // Fields that should be converted to BOOLEAN
  const booleanFields: { [key: string]: string[] } = {
    documents: ['is_public'],
  };

  // Convert TEXT JSON fields to JSONB
  const jsonFields = jsonbFields[tableName] || [];
  for (const field of jsonFields) {
    if (converted[field] !== undefined && converted[field] !== null) {
      try {
        // If it's a string, parse it first
        if (typeof converted[field] === 'string') {
          console.log(`🔍 DEBUG: Parsing string JSON for field ${field}`);
          converted[field] = JSON.parse(converted[field]);
        }
        // Validate that the value can be stringified to valid JSON
        // This catches malformed objects that would fail PostgreSQL's JSONB validation
        console.log(`🔍 DEBUG: Validating JSON for field ${field}`);
        JSON.stringify(converted[field]);
      } catch (error) {
        // If parsing or stringify fails, set to null (PostgreSQL won't accept invalid JSON in JSONB columns)
        console.warn(`⚠️  Warning: Invalid JSON for ${field}, setting to null. Error: ${error}`);
        converted[field] = null;
      }
    }
  }

  // Convert INTEGER booleans to BOOLEAN
  const boolFields = booleanFields[tableName] || [];
  for (const field of boolFields) {
    if (converted[field] !== undefined && converted[field] !== null) {
      converted[field] = Boolean(converted[field]);
    }
  }

  return converted;
}

/**
 * Import a single table from JSON
 */
async function importTable(tableName: string, pool: Pool): Promise<void> {
  console.log(`📥 Importing ${tableName}...`);

  try {
    const filePath = join(IMPORT_DIR, `${tableName}.json`);
    const jsonData = readFileSync(filePath, 'utf-8');
    const rows = JSON.parse(jsonData);

    console.log(`   Found ${rows.length} rows to import`);

    if (rows.length === 0) {
      console.log(`   ⚠️  No data to import for ${tableName}`);
      return;
    }

    // Get column names from first row
    const firstRow = convertRowForPostgres(rows[0], tableName);
    const columns = Object.keys(firstRow);

    // Build parameterized INSERT query
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (id) DO NOTHING
    `;

    // Insert each row
    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const convertedRow = convertRowForPostgres(row, tableName);
      const values = columns.map((col) => convertedRow[col]);

      try {
        const result = await pool.query(query, values);
        if (result.rowCount && result.rowCount > 0) {
          inserted++;
        } else {
          skipped++;
        }
      } catch (error: any) {
        // Check if it's a duplicate key error
        if (error.code === '23505') {
          skipped++;
        } else {
          console.error(`   Error inserting row:`, error.message);
          console.error(`   Row data:`, convertedRow);
          throw error;
        }
      }
    }

    console.log(`✅ Imported ${tableName}: ${inserted} inserted, ${skipped} skipped`);
  } catch (error) {
    console.error(`❌ Failed to import ${tableName}:`, error);
    throw error;
  }
}

/**
 * Verify metadata and list available tables
 */
function verifyMetadata(): string[] {
  try {
    const metadataPath = join(IMPORT_DIR, '_metadata.json');
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));

    console.log('📋 Import metadata:');
    console.log(`   Export date: ${metadata.exportDate}`);
    console.log(`   Tables: ${metadata.tableCount}`);
    console.log(`   Version: ${metadata.version}`);

    return metadata.tables;
  } catch (error) {
    console.warn('⚠️  No metadata file found, scanning directory...');

    // Fall back to scanning directory for .json files
    const files = readdirSync(IMPORT_DIR).filter(
      (f) => f.endsWith('.json') && !f.startsWith('_')
    );
    return files.map((f) => f.replace('.json', ''));
  }
}

/**
 * Main import function
 * Imports all tables from JSON to PostgreSQL
 */
export async function importAllTables(): Promise<void> {
  console.log('🚀 Starting PostgreSQL import...');
  console.log(`   Import directory: ${IMPORT_DIR}`);

  const pool = await getPostgresPool();

  // Verify metadata and get table list
  const tables = verifyMetadata();
  console.log(`   Found ${tables.length} tables to import\n`);

  // Import tables in order (respecting foreign keys)
  const importOrder = [
    'user_profiles', // Must come before user_analysis_history
    'user_analysis_history',
    'messages',
    'queries',
    'documents', // Must come before document_collaborators
    'document_collaborators',
  ];

  // Only import tables that exist in the export
  const tablesToImport = importOrder.filter((t) => tables.includes(t));

  // Import each table
  for (const table of tablesToImport) {
    await importTable(table, pool);
  }

  console.log('\n✅ PostgreSQL import completed successfully');
  console.log(`   ${tablesToImport.length} tables imported`);
}

/**
 * CLI entry point
 * Run with: pnpm tsx packages/database/src/migrations/importToPostgres.ts
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  importAllTables()
    .then(() => {
      console.log('✅ Import complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Import failed:', error);
      process.exit(1);
    });
}
