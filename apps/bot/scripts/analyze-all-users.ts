/**
 * Analyze All Users Script
 * Manually triggers comprehensive psychological analysis for all users in the database
 */

import { getAllUserProfiles } from '../src/database/userProfileService.js';
import { analyzeUser } from '../src/services/userProfileAnalysis.js';
import { initializeSchema } from '../src/database/schema.js';

async function main() {
  console.log('🔍 Starting analysis for all users...\n');

  try {
    // Initialize database schema
    console.log('📦 Initializing database schema...');
    await initializeSchema();
    console.log('✅ Database initialized\n');

    // Fetch all users
    console.log('👥 Fetching all user profiles...');
    const users = await getAllUserProfiles();
    console.log(`✅ Found ${users.length} users\n`);

    if (users.length === 0) {
      console.log('⚠️  No users found in database');
      process.exit(0);
    }

    // Analyze each user
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const progress = `[${i + 1}/${users.length}]`;

      console.log(`${progress} Analyzing ${user.username} (${user.user_id})...`);
      console.log(`   Message count: ${user.message_count}`);

      // Skip users with 0 messages (nothing to analyze)
      if (user.message_count === 0) {
        console.log(`   ⏭️  Skipped (no messages)\n`);
        skipCount++;
        continue;
      }

      try {
        // Run comprehensive analysis
        await analyzeUser(user.user_id, user.username);
        console.log(`   ✅ Analysis complete\n`);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Error analyzing user:`, error);
        console.error(`   ${error instanceof Error ? error.message : String(error)}\n`);
        errorCount++;
      }

      // Add small delay to avoid overwhelming the database
      if (i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Analysis Complete!\n');
    console.log(`Total users:     ${users.length}`);
    console.log(`✅ Analyzed:     ${successCount}`);
    console.log(`⏭️  Skipped:      ${skipCount} (no messages)`);
    console.log(`❌ Errors:       ${errorCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();
