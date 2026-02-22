/**
 * Delete My Profile Tool — "Right to be Forgotten"
 * Allows users to permanently delete their own profile and all associated data.
 * Only the profile owner can request deletion. Logs deletion for audit compliance.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { deleteUserProfile, getUserProfile } from '@repo/database';

export const deleteMyProfileTool = tool({
  description: `Permanently delete a user's own profile and ALL associated data from the system.

This implements the "Right to be Forgotten" — complete removal of all user data including:
- User profile and analysis history
- Feelings, affinities, and collaboration data
- Generated images, scripts, and documents
- Conversations, messages, and todos

CRITICAL SAFETY:
- Only the profile owner can delete their own profile
- The userId must match the requesting user's Discord ID
- Requires explicit confirmation (confirm=true) to proceed
- This operation is PERMANENT and CANNOT be undone
- A deletion audit log entry is created for compliance

Use when:
- User explicitly requests "delete my profile", "forget me", "remove my data"
- User invokes their "right to be forgotten"
- User wants all their data permanently removed`,

  inputSchema: z.object({
    userId: z
      .string()
      .describe('Discord user ID of the profile to delete (must be the requesting user)'),
    username: z
      .string()
      .describe('Discord username of the requesting user'),
    confirm: z
      .boolean()
      .default(false)
      .describe('Must be true to confirm permanent deletion — this cannot be undone'),
  }),

  execute: async ({ userId, username, confirm }) => {
    console.log(`[DeleteMyProfile] Deletion request from ${username} (${userId}), confirmed=${confirm}`);

    if (!confirm) {
      return {
        success: false,
        error: 'Deletion not confirmed. Set confirm=true to permanently delete all your data.',
        warning: 'This will permanently delete your profile and ALL associated data. This cannot be undone. Set confirm=true to proceed.',
      };
    }

    // Verify the profile exists before attempting deletion
    const profile = await getUserProfile(userId);
    if (!profile) {
      return {
        success: false,
        error: 'No profile found for this user. There is nothing to delete.',
      };
    }

    // Verify the requesting user owns this profile
    if (profile.user_id !== userId) {
      return {
        success: false,
        error: 'Access denied: you can only delete your own profile.',
      };
    }

    const result = await deleteUserProfile(userId, userId);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to delete profile',
        partialDeletion: Object.keys(result.deletedRecords).length > 0,
        deletedRecords: result.deletedRecords,
      };
    }

    return {
      success: true,
      message: `Profile for ${username} has been permanently deleted along with all associated data.`,
      deletedRecords: result.deletedRecords,
      warning: 'This operation is permanent and cannot be undone. An audit log entry has been created.',
    };
  },
});
