#!/usr/bin/env tsx
/**
 * Database Migration: Add gender column to user_profiles
 * Adds ai_detected_gender column for portrait generation
 */

import { getDatabase } from '../src/database/client.js';

async function main() {
  console.log('🔄 Running migration: Add ai_detected_gender column\n');

  const db = getDatabase();

  try {
    // Add the gender column
    console.log('Adding ai_detected_gender column...');
    await db.execute(`
      ALTER TABLE user_profiles ADD COLUMN ai_detected_gender TEXT
    `);

    console.log('✅ Column added successfully!');

    // Check current profile count
    const result = await db.execute('SELECT COUNT(*) as count FROM user_profiles');
    const count = (result.rows[0] as any).count;
    console.log(`\n📊 Total profiles: ${count}`);

    console.log('\n✅ Migration complete!');
    console.log('\nNote: Existing profiles will have NULL gender until they re-upload their photo.');
    console.log('Gender will be automatically detected and stored on next photo upload.');

    process.exit(0);
  } catch (error: any) {
    // If column already exists, that's okay
    if (error.message?.includes('duplicate column name')) {
      console.log('✅ Column already exists - skipping migration');
      process.exit(0);
    }

    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
