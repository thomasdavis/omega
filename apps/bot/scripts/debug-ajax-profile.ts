#!/usr/bin/env tsx
/**
 * Debug Ajax's Profile
 * Find ALL records related to Ajax across the database
 */

import { getDatabase } from '../src/database/client.js';

async function main() {
  console.log('🔍 Debugging Ajax Profile Across All Tables\n');

  const db = getDatabase();

  // Search by username pattern
  console.log('=== Searching for "ajax" in user_profiles ===');
  const profiles = await db.execute({
    sql: 'SELECT user_id, username, message_count, uploaded_photo_url, ai_appearance_description, ai_detected_gender FROM user_profiles WHERE username LIKE ?',
    args: ['%ajax%'],
  });

  console.log(`Found ${profiles.rows.length} profile(s):`);
  for (const row of profiles.rows) {
    const r = row as any;
    console.log(`\n  User ID: ${r.user_id}`);
    console.log(`  Username: ${r.username}`);
    console.log(`  Message Count: ${r.message_count}`);
    console.log(`  Photo URL: ${r.uploaded_photo_url || 'NONE'}`);
    console.log(`  AI Appearance: ${r.ai_appearance_description ? r.ai_appearance_description.substring(0, 100) + '...' : 'NONE'}`);
    console.log(`  Gender: ${r.ai_detected_gender || 'NONE'}`);
  }

  console.log('\n=== Searching for "ajax" in messages table ===');
  const messages = await db.execute({
    sql: `SELECT DISTINCT user_id, username, COUNT(*) as count FROM messages WHERE username LIKE ? GROUP BY user_id`,
    args: ['%ajax%'],
  });

  console.log(`Found ${messages.rows.length} user ID(s):`);
  for (const row of messages.rows) {
    const r = row as any;
    console.log(`  User ID: ${r.user_id} | Username: ${r.username} | Messages: ${r.count}`);
  }

  console.log('\n=== ALL user_profiles (top 10 by message count) ===');
  const allProfiles = await db.execute({
    sql: 'SELECT user_id, username, message_count FROM user_profiles ORDER BY message_count DESC LIMIT 10',
    args: [],
  });

  for (const row of allProfiles.rows) {
    const r = row as any;
    console.log(`  ${r.username} (${r.user_id}): ${r.message_count} messages`);
  }

  console.log('\n✅ Debug complete!');
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
