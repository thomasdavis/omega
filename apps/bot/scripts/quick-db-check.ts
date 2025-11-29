#!/usr/bin/env tsx
/**
 * Quick Database Check
 * Runs on Railway to check user profile and message count
 */

import { getDatabase } from '../src/database/client.js';
import { existsSync } from 'fs';

async function main() {
  const userId = '143715740458740736'; // ajaxdavis

  console.log('🔍 Quick Database Check for ajaxdavis\n');
  console.log('Environment:');
  console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`  /data exists: ${existsSync('/data')}`);
  console.log(`  /data/omega.db exists: ${existsSync('/data/omega.db')}`);
  console.log('');

  const db = getDatabase();

  // 1. Count messages
  console.log('📨 Checking messages table:');
  const messagesResult = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND sender_type = ?',
    args: [userId, 'human'],
  });
  const messageCount = (messagesResult.rows[0] as any).count;
  console.log(`  Messages from ajaxdavis: ${messageCount}\n`);

  // 2. Check profile
  console.log('👤 Checking user_profiles table:');
  const profileResult = await db.execute({
    sql: 'SELECT * FROM user_profiles WHERE user_id = ?',
    args: [userId],
  });

  if (profileResult.rows.length === 0) {
    console.log('  ❌ NO PROFILE FOUND!');
    console.log('  This is the problem - profile was never created.\n');
  } else {
    const profile = profileResult.rows[0] as any;
    console.log(`  ✅ Profile exists:`);
    console.log(`     Username: ${profile.username}`);
    console.log(`     Message count in profile: ${profile.message_count}`);
    console.log(`     Photo URL: ${profile.uploaded_photo_url || 'None'}`);
    console.log(`     Last analyzed: ${profile.last_analyzed_at || 'Never'}\n`);
  }

  // 3. Show sample messages
  console.log('📝 Sample messages from ajaxdavis:');
  const samplesResult = await db.execute({
    sql: 'SELECT message_content, timestamp FROM messages WHERE user_id = ? AND sender_type = ? ORDER BY timestamp DESC LIMIT 5',
    args: [userId, 'human'],
  });

  for (const row of samplesResult.rows) {
    const r = row as any;
    const date = new Date(r.timestamp).toISOString();
    const preview = r.message_content.substring(0, 60);
    console.log(`  - [${date}] ${preview}...`);
  }

  console.log('\n✅ Check complete!');
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
