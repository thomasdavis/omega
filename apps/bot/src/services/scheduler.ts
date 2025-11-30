/**
 * Task Scheduler
 * Schedules daily blog generation and behavioral prediction updates using node-cron
 */

import cron from 'node-cron';
import { generateDailyBlog } from './dailyBlogService.js';
import { batchUpdatePredictions } from './behavioralPredictionService.js';

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
