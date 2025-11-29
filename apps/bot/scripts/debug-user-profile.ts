#!/usr/bin/env tsx
/**
 * Debug User Profile Script
 * Inspects user_profiles table and messages to debug message count issues
 */

import { getDatabase } from '../src/database/client.js';
import { initializeSchema } from '../src/database/schema.js';

async function main() {
  console.log('🔍 Debugging User Profile...\n');

  // Initialize database
  const db = getDatabase();
  await initializeSchema();

  // Get the user ID from command line or use a default
  const targetUserId = process.argv[2];
  const targetUsername = process.argv[3];

  console.log('📊 Database Info:');
  console.log('  Target User ID:', targetUserId || 'Not specified');
  console.log('  Target Username:', targetUsername || 'Not specified');
  console.log('');

  // Count total messages in database
  const totalMessagesResult = await db.execute('SELECT COUNT(*) as count FROM messages');
  const totalMessages = (totalMessagesResult.rows[0] as any).count;
  console.log(`📨 Total messages in database: ${totalMessages}`);
  console.log('');

  // List all users in messages table
  console.log('👥 All users in messages table:');
  const usersResult = await db.execute(`
    SELECT user_id, username, COUNT(*) as message_count
    FROM messages
    WHERE sender_type = 'human' AND user_id IS NOT NULL
    GROUP BY user_id, username
    ORDER BY message_count DESC
    LIMIT 20
  `);

  if (usersResult.rows.length === 0) {
    console.log('  ⚠️  No users found in messages table!');
  } else {
    for (const row of usersResult.rows) {
      const r = row as any;
      console.log(`  - ${r.username} (ID: ${r.user_id}): ${r.message_count} messages`);
    }
  }
  console.log('');

  // Check user_profiles table
  console.log('📋 User Profiles Table:');
  const profilesResult = await db.execute('SELECT COUNT(*) as count FROM user_profiles');
  const profileCount = (profilesResult.rows[0] as any).count;
  console.log(`  Total profiles: ${profileCount}`);

  if (profileCount > 0) {
    console.log('  Profiles:');
    const allProfilesResult = await db.execute(`
      SELECT user_id, username, message_count, last_analyzed_at, uploaded_photo_url
      FROM user_profiles
      ORDER BY message_count DESC
      LIMIT 20
    `);

    for (const row of allProfilesResult.rows) {
      const r = row as any;
      const photoStatus = r.uploaded_photo_url ? '📷' : '  ';
      const analyzedStatus = r.last_analyzed_at ? '✅' : '❌';
      console.log(`  ${photoStatus} ${r.username} (ID: ${r.user_id}): ${r.message_count} messages [Analyzed: ${analyzedStatus}]`);
    }
  }
  console.log('');

  // If specific user provided, show detailed info
  if (targetUserId) {
    console.log(`🔍 Detailed info for user ID: ${targetUserId}`);

    // Check messages
    const userMessagesResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND sender_type = ?',
      args: [targetUserId, 'human'],
    });
    const userMessageCount = (userMessagesResult.rows[0] as any).count;
    console.log(`  Messages in database: ${userMessageCount}`);

    // Check profile
    const profileResult = await db.execute({
      sql: 'SELECT * FROM user_profiles WHERE user_id = ?',
      args: [targetUserId],
    });

    if (profileResult.rows.length === 0) {
      console.log('  ⚠️  No profile found for this user!');
      console.log('  This means getOrCreateUserProfile() or incrementMessageCount() is not being called properly.');
    } else {
      const profile = profileResult.rows[0] as any;
      console.log('  Profile found:');
      console.log(`    - Username: ${profile.username}`);
      console.log(`    - Message count in profile: ${profile.message_count}`);
      console.log(`    - Last analyzed: ${profile.last_analyzed_at ? new Date(profile.last_analyzed_at * 1000).toISOString() : 'Never'}`);
      console.log(`    - Photo uploaded: ${profile.uploaded_photo_url ? 'Yes' : 'No'}`);
      console.log(`    - Appearance description: ${profile.ai_appearance_description ? 'Yes' : 'No'}`);
      console.log(`    - Feelings data: ${profile.feelings_json ? 'Yes' : 'No'}`);
    }
  }

  // Show recent messages
  console.log('\n📝 Recent 10 messages:');
  const recentMessagesResult = await db.execute(`
    SELECT user_id, username, message_content, sender_type, timestamp
    FROM messages
    ORDER BY timestamp DESC
    LIMIT 10
  `);

  for (const row of recentMessagesResult.rows) {
    const r = row as any;
    const date = new Date(r.timestamp).toISOString();
    const preview = r.message_content.substring(0, 50);
    console.log(`  [${r.sender_type}] ${r.username} (${r.user_id}): ${preview}... (${date})`);
  }

  console.log('\n✅ Debug complete!');
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
