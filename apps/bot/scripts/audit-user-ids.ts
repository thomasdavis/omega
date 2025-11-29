#!/usr/bin/env tsx
/**
 * Audit User IDs
 * Check for inconsistencies in how user IDs are stored across messages and profiles
 */

import { getDatabase } from '../src/database/client.js';

async function main() {
  console.log('🔍 Auditing User IDs Across Database\n');

  const db = getDatabase();

  // 1. Find all profiles for "ajax"
  console.log('=== User Profiles for "ajax" ===');
  const profiles = await db.execute({
    sql: 'SELECT user_id, username, message_count, first_seen_at, created_at FROM user_profiles WHERE username LIKE ?',
    args: ['%ajax%'],
  });

  console.log(`Found ${profiles.rows.length} profile(s):`);
  for (const row of profiles.rows) {
    const r = row as any;
    console.log(`  User ID: ${r.user_id}`);
    console.log(`  Username: ${r.username}`);
    console.log(`  Message Count (in profile): ${r.message_count}`);
    console.log(`  First Seen: ${new Date(r.first_seen_at * 1000).toISOString()}`);
    console.log(`  Created: ${new Date(r.created_at * 1000).toISOString()}`);
    console.log('');
  }

  // 2. Find all messages from users with "ajax" in username
  console.log('=== Messages from "ajax" users ===');
  const messages = await db.execute({
    sql: `SELECT user_id, username, COUNT(*) as count, MIN(timestamp) as first_msg, MAX(timestamp) as last_msg
          FROM messages
          WHERE username LIKE ? AND sender_type = 'human'
          GROUP BY user_id`,
    args: ['%ajax%'],
  });

  console.log(`Found ${messages.rows.length} user ID(s) in messages:`);
  for (const row of messages.rows) {
    const r = row as any;
    console.log(`  User ID: ${r.user_id}`);
    console.log(`  Username: ${r.username}`);
    console.log(`  Message Count (in messages table): ${r.count}`);
    console.log(`  First Message: ${new Date(r.first_msg).toISOString()}`);
    console.log(`  Last Message: ${new Date(r.last_msg).toISOString()}`);
    console.log('');
  }

  // 3. Check for mismatches
  console.log('=== Checking for Mismatches ===');
  for (const msgRow of messages.rows) {
    const msg = msgRow as any;
    const matchingProfile = profiles.rows.find((p: any) => p.user_id === msg.user_id);

    if (!matchingProfile) {
      console.log(`⚠️  WARNING: User ID ${msg.user_id} has ${msg.count} messages but NO PROFILE!`);
    } else {
      const prof = matchingProfile as any;
      if (prof.message_count !== msg.count) {
        console.log(`⚠️  MISMATCH: User ID ${msg.user_id}`);
        console.log(`    Profile says: ${prof.message_count} messages`);
        console.log(`    Messages table has: ${msg.count} messages`);
        console.log(`    Difference: ${msg.count - prof.message_count}`);
      } else {
        console.log(`✅ User ID ${msg.user_id}: Counts match (${msg.count} messages)`);
      }
    }
  }

  // 4. Check for orphaned profiles (profiles without messages)
  console.log('\n=== Orphaned Profiles (no messages) ===');
  for (const profRow of profiles.rows) {
    const prof = profRow as any;
    const hasMessages = messages.rows.some((m: any) => m.user_id === prof.user_id);

    if (!hasMessages) {
      console.log(`⚠️  Profile ${prof.user_id} (${prof.username}) has no messages in messages table`);
      console.log(`    Profile claims ${prof.message_count} messages`);
    }
  }

  // 5. Show sample recent messages for debugging
  console.log('\n=== Sample Recent Messages from Ajax ===');
  const recentMessages = await db.execute({
    sql: `SELECT user_id, username, message_content, timestamp
          FROM messages
          WHERE username LIKE ? AND sender_type = 'human'
          ORDER BY timestamp DESC
          LIMIT 5`,
    args: ['%ajax%'],
  });

  for (const row of recentMessages.rows) {
    const r = row as any;
    console.log(`[${new Date(r.timestamp).toISOString()}] ${r.username} (${r.user_id}):`);
    console.log(`  "${r.message_content.substring(0, 80)}${r.message_content.length > 80 ? '...' : ''}"`);
  }

  console.log('\n✅ Audit complete!');
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
