/**
 * Toggle Feature Notifications Tool
 * Allows users to enable/disable notifications for completed features
 */

import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@repo/database';

export const toggleFeatureNotificationsTool = tool({
  description:
    'Toggle whether the user receives Discord notifications when their requested features are completed and merged. Users can enable or disable these notifications based on their preference.',
  inputSchema: z.object({
    userId: z.string().describe('Discord user ID'),
    username: z.string().describe('Discord username'),
    enabled: z
      .boolean()
      .describe('true to enable notifications, false to disable'),
  }),
  execute: async ({ userId, username, enabled }) => {
    try {
      // Check if user profile exists
      let profile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        return {
          success: false,
          error: 'USER_PROFILE_NOT_FOUND',
          message: `No profile found for user ${username}. A profile will be created when you interact with Omega more.`,
        };
      }

      // Update notification preference
      await prisma.userProfile.update({
        where: { userId },
        data: {
          notifyOnFeatureComplete: enabled,
          updatedAt: BigInt(Math.floor(Date.now() / 1000)),
        },
      });

      return {
        success: true,
        userId,
        username,
        notifyOnFeatureComplete: enabled,
        message: enabled
          ? `✅ Feature notifications are now **enabled**. You'll receive a Discord notification when your requested features are completed and merged.`
          : `🔕 Feature notifications are now **disabled**. You will not receive notifications when your requested features are completed.`,
      };
    } catch (error) {
      console.error('Error toggling feature notifications:', error);
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update notification preferences',
      };
    }
  },
});
