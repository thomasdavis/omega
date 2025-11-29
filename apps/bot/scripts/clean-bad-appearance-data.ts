/**
 * Clean Bad Appearance Data
 * Removes OpenAI refusal messages from ai_appearance_description fields
 */

import { getAllUserProfiles, updateUserProfile } from '../src/database/userProfileService.js';
import { initializeSchema } from '../src/database/schema.js';

async function main() {
  console.log('🧹 Cleaning bad appearance data...\n');

  try {
    // Initialize database
    await initializeSchema();

    // Get all profiles
    const profiles = await getAllUserProfiles();

    let cleanedCount = 0;
    const badPatterns = [
      "I'm sorry",
      "I cannot",
      "I can't",
      "I apologize",
    ];

    for (const profile of profiles) {
      const description = profile.ai_appearance_description;

      if (description) {
        // Check if description contains any bad patterns
        const isBad = badPatterns.some(pattern => description.includes(pattern));

        if (isBad) {
          console.log(`❌ Found bad data for ${profile.username}:`);
          console.log(`   "${description.substring(0, 80)}..."`);

          // Clear the bad data
          await updateUserProfile(profile.user_id, {
            ai_appearance_description: null,
            appearance_confidence: null,
            ai_detected_gender: null,
            gender_confidence: null,
          });

          console.log(`   ✅ Cleaned\n`);
          cleanedCount++;
        }
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎉 Cleanup Complete!`);
    console.log(`Cleaned ${cleanedCount} profile(s)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
