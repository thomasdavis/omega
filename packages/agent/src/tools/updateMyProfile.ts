/**
 * Update My Profile Tool
 * Allows users to update their profile information (username, avatar, bio, preferences)
 * Supports partial updates - only updates fields that are provided
 */

import { tool } from 'ai';
import { z } from 'zod';
import { updateUserProfile, getOrCreateUserProfile } from '@repo/database';

export const updateMyProfileTool = tool({
  description: `Update the user's profile information in Omega. Currently supports updating username only.

  **What you can update:**
  - Username: Display name for the user

  **Note:** Avatar URL, bio, and preferences fields are not yet available in the database schema.
  These fields will be added in a future update.

  **How it works:**
  - Partial updates supported - only provide fields you want to change
  - Creates profile if it doesn't exist
  - Updates timestamp automatically
  - Validates all inputs

  **Use when:**
  - User asks to "update my profile", "change my bio", "set my avatar"
  - User wants to modify their display name or profile picture
  - User needs to update their preferences or settings
  - User asks to "edit my profile information"

  **Example requests:**
  - "Update my bio to say I'm a software engineer"
  - "Change my avatar to https://example.com/avatar.png"
  - "Set my theme preference to dark mode"
  - "Update my username to JohnDoe"`,

  inputSchema: z.object({
    userId: z.string().describe('Discord user ID'),
    username: z.string().optional().describe('New username/display name (optional)'),
  }),

  execute: async ({ userId, username }) => {
    console.log(`🔧 Updating profile for user ${userId}`);

    try {
      // Validate that at least one field is provided
      if (!username) {
        return {
          success: false,
          error: 'No updates provided',
          message: 'Please provide a username to update',
        };
      }

      // Get or create the user profile first
      await getOrCreateUserProfile(userId, username);

      // Build the updates object
      const updates: any = {
        username,
      };

      // Update the profile
      await updateUserProfile(userId, updates);

      console.log(`   ✅ Profile updated successfully!`);

      const message = `Profile updated successfully! Updated username to "${username}".`;

      return {
        success: true,
        message,
        updatedFields: {
          username,
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
