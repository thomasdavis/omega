/**
 * Update My Profile Tool
 * Allows users to update their profile information
 * Supports partial updates - only updates fields that are provided
 */

import { tool } from 'ai';
import { z } from 'zod';
import { updateUserProfile, getOrCreateUserProfile } from '@repo/database';

export const updateMyProfileTool = tool({
  description: `Update the user's profile information in Omega.

  **Fields you can update:**
  - username: Display name for the user
  - bio: Free-text biography or description (use this for any text the user wants on their profile)
  - avatarUrl: URL to the user's avatar/profile picture

  **How it works:**
  - Partial updates supported - only provide fields you want to change
  - Creates profile if it doesn't exist
  - Updates timestamp automatically

  **Use when:**
  - User asks to "update my profile", "change my username", "set my bio"
  - User wants to add text/description to their profile
  - User asks to "edit my profile information"
  - User wants something added to their profile (use the bio field)

  **Example requests:**
  - "Update my username to JohnDoe" → set username
  - "Add 'loves cats' to my profile" → set bio
  - "Put this on my profile: ..." → set bio

  **Important:** You must provide at least one field to update (username, bio, or avatarUrl) in addition to userId.`,

  inputSchema: z.object({
    userId: z.string().describe('Discord user ID'),
    username: z.string().optional().describe('New username/display name'),
    bio: z.string().optional().describe('Free-text biography, description, or any text the user wants on their profile'),
    avatarUrl: z.string().url().optional().describe('URL to avatar/profile picture'),
  }),

  execute: async ({ userId, username, bio, avatarUrl }) => {
    console.log(`🔧 Updating profile for user ${userId}`);

    try {
      // Validate that at least one update field is provided
      const hasUpdates = username !== undefined || bio !== undefined || avatarUrl !== undefined;
      if (!hasUpdates) {
        return {
          success: false,
          error: 'No updates provided. You must provide at least one of: username, bio, or avatarUrl.',
          message: 'Please specify what to update. Available fields: username (display name), bio (text/description), avatarUrl (profile picture URL).',
        };
      }

      // Get or create the user profile first
      const currentUsername = username || 'Unknown User';
      await getOrCreateUserProfile(userId, currentUsername);

      // Build the updates object
      const updates: Record<string, string> = {};

      if (username !== undefined) {
        updates.username = username;
      }
      if (bio !== undefined) {
        updates.bio = bio;
      }
      if (avatarUrl !== undefined) {
        updates.avatarUrl = avatarUrl;
      }

      // Update the profile
      await updateUserProfile(userId, updates);

      console.log(`   ✅ Profile updated successfully!`);

      // Build response message
      const updatedFields: string[] = [];
      if (username) updatedFields.push(`username to "${username}"`);
      if (bio) updatedFields.push(`bio to "${bio}"`);
      if (avatarUrl) updatedFields.push(`avatar URL`);

      const message = `Profile updated successfully! Updated: ${updatedFields.join(', ')}.`;

      return {
        success: true,
        message,
        updatedFields: {
          username: username || null,
          bio: bio || null,
          avatarUrl: avatarUrl || null,
        },
      };
    } catch (error) {
      console.error('Failed to update user profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to update profile. Please try again.',
      };
    }
  },
});
