/**
 * PostgreSQL Migration Runner
 * Auto-discovers and executes all *.sql migration files in sorted order.
 *
 * To add a new migration, just create a file like 003_description.sql in this
 * directory. It will run automatically on the next server restart. Use
 * IF NOT EXISTS / IF EXISTS for idempotency since all migrations run every boot.
 */

import { readFileSync, readdirSync } from 'fs';
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

    // Remove comment-only lines first, then split by semicolons
    // This preserves multi-line statements that may start with comments
    const cleanedSql = sql
      .split('\n')
      .filter((line) => {
        const trimmed = line.trim();
        // Keep the line if it's not empty and not a comment-only line
        return trimmed.length > 0 && !trimmed.startsWith('--');
      })
      .join('\n');

    // Now split by semicolons to get individual statements
    const statements = cleanedSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

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
 * Discover all .sql migration files in this directory, sorted by name.
 * Convention: NNN_description.sql (e.g., 001_initial_schema.sql)
 */
function discoverMigrations(): string[] {
  const files = readdirSync(__dirname)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  return files;
}

/**
 * Initialize PostgreSQL schema
 * Auto-discovers and runs all SQL migrations in sorted order.
 */
export async function initializePostgresSchema(): Promise<void> {
  console.log('🚀 Initializing PostgreSQL schema...');

  const migrations = discoverMigrations();
  console.log(`   Found ${migrations.length} migration(s): ${migrations.join(', ')}`);

  try {
    for (const migration of migrations) {
      await runMigration(migration);
    }
    console.log(`✅ PostgreSQL schema initialized (${migrations.length} migrations)`);
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
