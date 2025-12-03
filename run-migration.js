#!/usr/bin/env node
/**
 * Migration Runner Script
 * Executes SQLite to PostgreSQL migration phases 2-3
 * Run with: node run-migration.js
 */

import { exportAllTables } from './packages/database/dist/migrations/exportFromSQLite.js';
import { importAllTables } from './packages/database/dist/migrations/importToPostgres.js';

async function runMigration() {
  console.log('🚀 Starting Migration (Phases 2-3)');
  console.log('====================================\n');

  try {
    // Phase 2: Export from SQLite
    console.log('📤 Phase 2: Exporting data from SQLite...');
    await exportAllTables();
    console.log('✅ Phase 2 complete\n');

    // Phase 3: Import to PostgreSQL
    console.log('📥 Phase 3: Importing data to PostgreSQL...');
    await importAllTables();
    console.log('✅ Phase 3 complete\n');

    console.log('🎉 Migration complete!');
    console.log('\nNext steps:');
    console.log('1. Verify data integrity');
    console.log('2. Enable shadow writing: railway variables --set USE_POSTGRES_SHADOW=true');
    console.log('3. Monitor for 24-48 hours');
    console.log('4. Switch to PostgreSQL primary: railway variables --set USE_POSTGRES_PRIMARY=true');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
