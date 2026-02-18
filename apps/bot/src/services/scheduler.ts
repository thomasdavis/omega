/**
 * Task Scheduler
 * Schedules daily blog generation using node-cron
 * Note: User analysis and behavioral predictions are handled by GitHub Actions
 * (see .github/workflows/profile-analysis.yml)
 */

import cron from 'node-cron';
import { generateDailyBlog } from './dailyBlogService.js';

/**
 * Initialize scheduled tasks
 */
export function initializeScheduler(): void {
  console.log('⏰ Initializing task scheduler...');

  // Schedule daily blog generation at 9:00 AM UTC every day
  const dailyBlogSchedule = '0 9 * * *';

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
  console.log('ℹ️  User analysis & predictions handled by GitHub Actions (profile-analysis.yml)');
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
