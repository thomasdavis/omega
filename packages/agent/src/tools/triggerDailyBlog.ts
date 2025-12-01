/**
 * Trigger Daily Blog Tool - Manual trigger for daily blog generation
 * Allows users to manually generate a daily blog post for testing
 */

import { tool } from 'ai';
import { z } from 'zod';
import { triggerDailyBlogNow } from '../services/scheduler.js';

export const triggerDailyBlogTool = tool({
  description: `Manually trigger the daily blog generation process.

  This generates a blog post combining:
  - The most philosophically interesting Hacker News article of the day
  - Realpolitik-based global market predictions
  - Synthesis connecting philosophical insights with economic/geopolitical analysis

  The blog post is automatically saved to the blog directory and will appear at /blog.

  This is primarily for testing - the normal flow uses a scheduled cron job that runs daily at 9 AM UTC.`,

  inputSchema: z.object({}),

  execute: async () => {
    console.log('🔨 Manual trigger: Generating daily blog post...');

    try {
      const result = await triggerDailyBlogNow();

      if (result.success) {
        // Get server URL from environment
        const serverUrl = process.env.ARTIFACT_SERVER_URL
          || (process.env.NODE_ENV === 'production' ? 'https://omegaai.dev' : 'http://localhost:3001');

        const slug = result.filename?.replace(/\.md$/, '') || '';
        const blogUrl = `${serverUrl}/blog/${slug}`;

        return {
          success: true,
          filename: result.filename,
          url: blogUrl,
          message: `✅ Daily blog post generated successfully!\n\nFilename: ${result.filename}\nURL: ${blogUrl}\n\nThe blog combines:\n- Top philosophical HN article\n- Realpolitik market predictions\n- Intellectual synthesis\n\nView it now at the URL above!`,
        };
      } else {
        return {
          success: false,
          error: result.error || 'Unknown error',
          message: `❌ Failed to generate daily blog: ${result.error}`,
        };
      }
    } catch (error) {
      console.error('❌ Error in triggerDailyBlog tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `❌ Error generating daily blog: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});
