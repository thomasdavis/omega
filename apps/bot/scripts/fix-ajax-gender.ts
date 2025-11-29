#!/usr/bin/env tsx
/**
 * Fix Ajax's Gender in Database
 * Sets gender to 'male' for Ajax's profile
 */

import { getDatabase } from '../src/database/client.js';

async function main() {
  const AJAX_USER_ID = '177014147867069440';

  console.log('🔧 Fixing Ajax\'s gender in database...\n');

  const db = getDatabase();

  try {
    // Check current profile
    console.log('Current profile:');
    const before = await db.execute({
      sql: 'SELECT username, ai_appearance_description, ai_detected_gender FROM user_profiles WHERE user_id = ?',
      args: [AJAX_USER_ID],
    });

    if (before.rows.length === 0) {
      console.log('❌ No profile found for Ajax');
      process.exit(1);
    }

    const profile = before.rows[0] as any;
    console.log(`  Username: ${profile.username}`);
    console.log(`  Appearance: ${profile.ai_appearance_description || 'None'}`);
    console.log(`  Gender: ${profile.ai_detected_gender || 'NULL'}`);

    // Update gender to male
    console.log('\nUpdating gender to "male"...');
    await db.execute({
      sql: 'UPDATE user_profiles SET ai_detected_gender = ? WHERE user_id = ?',
      args: ['male', AJAX_USER_ID],
    });

    // Verify update
    const after = await db.execute({
      sql: 'SELECT username, ai_appearance_description, ai_detected_gender FROM user_profiles WHERE user_id = ?',
      args: [AJAX_USER_ID],
    });

    const updated = after.rows[0] as any;
    console.log('\n✅ Profile updated!');
    console.log(`  Gender: ${updated.ai_detected_gender}`);

    console.log('\n✨ Ajax can now generate male portraits!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
