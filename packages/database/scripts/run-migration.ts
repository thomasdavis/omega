#!/usr/bin/env tsx
/**
 * Run pending Prisma migrations on Railway PostgreSQL
 * Usage: tsx packages/database/scripts/run-migration.ts
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL or POSTGRES_URL environment variable not set');
    process.exit(1);
  }

  console.log('🔌 Connecting to PostgreSQL...');

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Read migration file
    const migrationPath = join(
      __dirname,
      '../prisma/migrations/20251203055229_add_agent_synthesis_table/migration.sql'
    );

    console.log(`📄 Reading migration: ${migrationPath}`);
    const migrationSql = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Running migration...');
    await client.query(migrationSql);

    console.log('✅ Migration completed successfully!');

    // Verify table exists
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'agent_syntheses'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Table "agent_syntheses" verified in database');
    } else {
      console.error('⚠️  Table "agent_syntheses" not found after migration');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Disconnected from PostgreSQL');
  }
}

runMigration();
