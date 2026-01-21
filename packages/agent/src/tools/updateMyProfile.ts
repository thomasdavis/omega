/**
 * Update My Profile Tool
 * Allows users to update their profile information (username only for now)
 * Supports partial updates - only updates fields that are provided
 *
 * Note: Additional fields (avatar, bio, preferences) require database migration
 * See: packages/database/scripts/add-user-profile-basic-fields.sh
 */

import { tool } from 'ai';
import { z } from 'zod';
import { updateUserProfile, getOrCreateUserProfile } from '@repo/database';

export const updateMyProfileTool = tool({
  description: `Update the user's profile information in Omega. Currently supports updating username only.

  **What you can update:**
  - Username: Display name for the user

  **How it works:**
  - Partial updates supported - only provide fields you want to change
  - Creates profile if it doesn't exist
  - Updates timestamp automatically
  - Validates all inputs

  **Use when:**
  - User asks to "update my profile", "change my username"
  - User wants to modify their display name
  - User asks to "edit my profile information"

  **Example requests:**
  - "Update my username to JohnDoe"
  - "Change my display name to Alice"

  **Note:** Additional profile fields (avatar, bio, preferences) will be available after running database migration: packages/database/scripts/add-user-profile-basic-fields.sh`,

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
          message: 'Please provide username to update',
        };
      }

      // Get or create the user profile first
      const currentUsername = username || 'Unknown User';
      await getOrCreateUserProfile(userId, currentUsername);

      // Build the updates object (using snake_case for database)
      const updates: any = {};

      if (username !== undefined) {
        updates.username = username;
      }

      // Update the profile
      await updateUserProfile(userId, updates);

      console.log(`   ✅ Profile updated successfully!`);

      // Build response message
      const updatedFields: string[] = [];
      if (username) updatedFields.push(`username to "${username}"`);

      const message = `Profile updated successfully! Updated: ${updatedFields.join(', ')}.`;

      return {
        success: true,
        message,
        updatedFields: {
          username: username || null,
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
