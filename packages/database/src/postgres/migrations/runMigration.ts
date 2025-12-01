/**
 * PostgreSQL Migration Runner
 * Executes SQL migration files against the Railway PostgreSQL database
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getPostgresPool } from '../client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run a specific migration file
 */
export async function runMigration(migrationFile: string): Promise<void> {
  const pool = await getPostgresPool();

  try {
    console.log(`📋 Running migration: ${migrationFile}`);

    // Read the SQL file
    const sqlPath = join(__dirname, migrationFile);
    const sql = readFileSync(sqlPath, 'utf-8');

    // Split by semicolons to execute statements individually
    // This handles multi-statement SQL files properly
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    console.log(`   Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`   Executing statement ${i + 1}/${statements.length}...`);
        await pool.query(statement);
      }
    }

    console.log(`✅ Migration completed: ${migrationFile}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${migrationFile}`);
    console.error(error);
    throw error;
  }
}

/**
 * Initialize PostgreSQL schema
 * Runs the initial schema migration
 */
export async function initializePostgresSchema(): Promise<void> {
  console.log('🚀 Initializing PostgreSQL schema...');

  try {
    await runMigration('001_initial_schema.sql');
    console.log('✅ PostgreSQL schema initialized successfully');
    console.log('   - messages table with GIN full-text search');
    console.log('   - queries table with execution tracking');
    console.log('   - documents table with collaborative editing');
    console.log('   - document_collaborators table for access control');
    console.log('   - user_profiles table with PhD-level profiling');
    console.log('   - user_analysis_history table for temporal tracking');
  } catch (error) {
    console.error('❌ Failed to initialize PostgreSQL schema');
    throw error;
  }
}

/**
 * CLI entry point
 * Run with: pnpm tsx packages/database/src/postgres/migrations/runMigration.ts
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  initializePostgresSchema()
    .then(() => {
      console.log('✅ Migration complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}
