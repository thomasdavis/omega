/**
 * Update My Profile Tool
 * Allows users to update their profile information (username, avatar, bio, preferences)
 * Supports partial updates - only updates fields that are provided
 */

import { tool } from 'ai';
import { z } from 'zod';
import { updateUserProfile, getOrCreateUserProfile } from '@repo/database';

export const updateMyProfileTool = tool({
  description: `Update the user's profile information in Omega. Supports updating username, avatar URL, bio, and preferences.

  **What you can update:**
  - Username: Display name for the user
  - Avatar URL: URL to user's profile picture/avatar
  - Bio: User biography or description
  - Preferences: User preferences as a JSON object (e.g., theme, notifications, etc.)

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
    avatarUrl: z.string().url().optional().describe('URL to avatar/profile picture (optional)'),
    bio: z.string().optional().describe('User biography/description (optional)'),
    preferences: z.record(z.any()).optional().describe('User preferences as key-value pairs (optional)'),
  }),

  execute: async ({ userId, username, avatarUrl, bio, preferences }) => {
    console.log(`🔧 Updating profile for user ${userId}`);

    try {
      // Validate that at least one field is provided
      if (!username && !avatarUrl && !bio && !preferences) {
        return {
          success: false,
          error: 'No updates provided',
          message: 'Please provide at least one field to update (username, avatarUrl, bio, or preferences)',
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

      if (avatarUrl !== undefined) {
        updates.avatar_url = avatarUrl;
      }

      if (bio !== undefined) {
        updates.bio = bio;
      }

      if (preferences !== undefined) {
        // Merge with existing preferences if needed
        updates.preferences = preferences;
      }

      // Update the profile
      await updateUserProfile(userId, updates);

      console.log(`   ✅ Profile updated successfully!`);

      // Build response message
      const updatedFields: string[] = [];
      if (username) updatedFields.push(`username to "${username}"`);
      if (avatarUrl) updatedFields.push('avatar URL');
      if (bio) updatedFields.push('bio');
      if (preferences) updatedFields.push('preferences');

      const message = `Profile updated successfully! Updated: ${updatedFields.join(', ')}.`;

      return {
        success: true,
        message,
        updatedFields: {
          username: username || null,
          avatarUrl: avatarUrl || null,
          bio: bio || null,
          preferences: preferences || null,
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
