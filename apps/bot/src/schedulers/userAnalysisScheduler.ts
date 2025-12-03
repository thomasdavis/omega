/**
 * User Analysis Scheduler
 *
 * Schedules daily automatic analysis of all users using node-cron.
 * Runs at 00:00 UTC every day.
 *
 * This provides in-app scheduling as a fallback to Railway cron jobs.
 */

import cron from 'node-cron';
import { getAllUserProfiles } from '../database/userProfileService.js';
import { analyzeUser } from '../services/userProfileAnalysis.js';

let isRunning = false;
let scheduledTask: cron.ScheduledTask | null = null;

/**
 * Runs the user analysis job
 */
async function runUserAnalysis(): Promise<void> {
  // Prevent overlapping executions
  if (isRunning) {
    console.log('⏭️  User analysis already running, skipping this execution');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Starting scheduled user analysis...');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Fetch all users
    const users = await getAllUserProfiles();
    console.log(`👥 Found ${users.length} users\n`);

    if (users.length === 0) {
      console.log('⚠️  No users found in database\n');
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

      // Skip users with 0 messages
      if (user.message_count === 0) {
        console.log(`   ⏭️  Skipped (no messages)\n`);
        skipCount++;
        continue;
      }

      try {
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
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Scheduled User Analysis Complete!\n');
    console.log(`Total users:     ${users.length}`);
    console.log(`✅ Analyzed:     ${successCount}`);
    console.log(`⏭️  Skipped:      ${skipCount} (no messages)`);
    console.log(`❌ Errors:       ${errorCount}`);
    console.log(`⏱️  Duration:     ${duration}s`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Log errors to help with monitoring
    if (errorCount > 0) {
      console.error(`⚠️  ${errorCount} users failed analysis - check logs above for details`);
    }
  } catch (error) {
    console.error('❌ Fatal error in scheduled user analysis:', error);
    throw error;
  } finally {
    isRunning = false;
  }
}

/**
 * Starts the user analysis scheduler
 * Runs daily at 00:00 UTC
 */
export function startUserAnalysisScheduler(): void {
  if (scheduledTask) {
    console.log('⚠️  User analysis scheduler already running');
    return;
  }

  // Schedule for 00:00 UTC daily
  // Cron format: minute hour day month dayOfWeek
  scheduledTask = cron.schedule('0 0 * * *', async () => {
    console.log('⏰ Triggered scheduled user analysis (00:00 UTC)');
    try {
      await runUserAnalysis();
    } catch (error) {
      console.error('❌ Scheduled user analysis failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('✅ User analysis scheduler started (runs daily at 00:00 UTC)');
}

/**
 * Stops the user analysis scheduler
 */
export function stopUserAnalysisScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('🛑 User analysis scheduler stopped');
  }
}

/**
 * Manually trigger user analysis (for testing)
 */
export async function triggerManualAnalysis(): Promise<void> {
  console.log('🔧 Manual user analysis triggered');
  await runUserAnalysis();
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
  isRunning: boolean;
  isScheduled: boolean;
  nextRun: string | null;
} {
  return {
    isRunning,
    isScheduled: scheduledTask !== null,
    nextRun: scheduledTask ? '00:00 UTC daily' : null
  };
}
