/**
 * Task Scheduler
 * Schedules daily blog generation, behavioral prediction updates, and user analysis using node-cron
 */

import cron from 'node-cron';
import { generateDailyBlog } from './dailyBlogService.js';
import { batchUpdatePredictions } from './behavioralPredictionService.js';
import { getAllUserProfiles } from '@repo/database';
import { analyzeUser } from './userProfileAnalysis.js';

/**
 * Initialize scheduled tasks
 */
export function initializeScheduler(): void {
  console.log('⏰ Initializing task scheduler...');

  // Schedule daily blog generation at 9:00 AM UTC every day
  // Cron format: minute hour day month weekday
  const dailyBlogSchedule = '0 9 * * *'; // 9:00 AM UTC daily

  cron.schedule(dailyBlogSchedule, async () => {
    console.log('⏰ Cron job triggered: Daily blog generation');

    try {
      const result = await generateDailyBlog();

      if (result.success) {
        console.log(`✅ Daily blog generated successfully: ${result.filename}`);
      } else {
        console.error(`❌ Daily blog generation failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error in daily blog cron job:', error);
    }
  });

  console.log('✅ Scheduler initialized - Daily blog will be generated at 9:00 AM UTC');
  console.log(`   Next run: ${getNextRunTime()}`);

  // Schedule behavioral prediction updates every 6 hours
  // This allows the system to regularly revise predictions and adjust models
  const predictionSchedule = '0 */6 * * *'; // Every 6 hours

  cron.schedule(predictionSchedule, async () => {
    console.log('⏰ Cron job triggered: Behavioral prediction updates');

    try {
      await batchUpdatePredictions(100); // Update up to 100 users per run
      console.log('✅ Behavioral prediction update completed');
    } catch (error) {
      console.error('❌ Error in behavioral prediction cron job:', error);
    }
  });

  console.log('✅ Behavioral prediction updates scheduled every 6 hours');

  // Schedule user analysis at 00:00 UTC daily
  const userAnalysisSchedule = '0 0 * * *'; // Midnight UTC daily

  cron.schedule(userAnalysisSchedule, async () => {
    console.log('⏰ Cron job triggered: Daily user analysis');

    try {
      await runUserAnalysis();
      console.log('✅ Daily user analysis completed');
    } catch (error) {
      console.error('❌ Error in daily user analysis cron job:', error);
    }
  });

  console.log('✅ Daily user analysis scheduled at 00:00 UTC');
}

/**
 * Run comprehensive analysis for all users
 */
async function runUserAnalysis(): Promise<void> {
  console.log('🔍 Starting analysis for all users...\n');

  try {
    // Fetch all users
    const users = await getAllUserProfiles();
    console.log(`👥 Found ${users.length} users\n`);

    if (users.length === 0) {
      console.log('⚠️  No users found in database');
      return;
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
    console.log('🎉 User Analysis Complete!\n');
    console.log(`Total users:     ${users.length}`);
    console.log(`✅ Analyzed:     ${successCount}`);
    console.log(`⏭️  Skipped:      ${skipCount} (no messages)`);
    console.log(`❌ Errors:       ${errorCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('❌ Fatal error in user analysis:', error);
    throw error;
  }
}

/**
 * Get human-readable time until next run
 */
function getNextRunTime(): string {
  const now = new Date();
  const next = new Date();

  next.setUTCHours(9, 0, 0, 0);

  // If we've already passed 9 AM UTC today, schedule for tomorrow
  if (now.getUTCHours() >= 9) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next.toISOString();
}

/**
 * Manual trigger for testing (can be called via Discord command or API)
 */
export async function triggerDailyBlogNow(): Promise<{ success: boolean; filename?: string; error?: string }> {
  console.log('🔨 Manual trigger: Generating daily blog now...');
  return await generateDailyBlog();
}

/**
 * Manual trigger for behavioral predictions (can be called via Discord command or API)
 */
export async function triggerPredictionUpdateNow(): Promise<void> {
  console.log('🔨 Manual trigger: Updating behavioral predictions now...');
  await batchUpdatePredictions(100);
}

/**
 * Manual trigger for user analysis (can be called via Discord command or API)
 */
export async function triggerUserAnalysisNow(): Promise<void> {
  console.log('🔨 Manual trigger: Running user analysis now...');
  await runUserAnalysis();
}
