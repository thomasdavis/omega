/**
 * Delete My Profile Tool
 * Implements "right to be forgotten" — allows users to delete their own profile
 * and all associated data from the database.
 *
 * Access control: Only the profile owner can request deletion.
 * Requires explicit confirmation to prevent accidental deletions.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { deleteUserProfile } from '@repo/database';

export const deleteMyProfileTool = tool({
  description: `Permanently delete a user's profile and ALL associated data from Omega's database.
  This implements the "right to be forgotten" — complete removal of all user data.

  **What gets deleted:**
  - User profile and analysis history
  - Documents created by the user
  - Document collaborations
  - Messages and conversations
  - Feelings and mood records
  - Generated images
  - User affinities and collaboration data
  - Scripts, todos, music, and media files
  - Database queries

  **Important:**
  - This action is PERMANENT and IRREVERSIBLE
  - Only the profile owner can delete their own profile
  - An audit log entry is created for compliance
  - The user must explicitly confirm with confirmDeletion=true

  **Use when:**
  - User says "delete my profile", "forget me", "remove my data"
  - User invokes their "right to be forgotten"
  - User wants to erase all their data from Omega`,

  inputSchema: z.object({
    userId: z.string().describe('Discord user ID of the profile to delete (must be the requesting user)'),
    requestingUserId: z.string().describe('Discord user ID of the person requesting the deletion (must match userId)'),
    confirmDeletion: z.boolean().describe('Must be true to confirm deletion. This action is permanent and irreversible.'),
  }),

  execute: async ({ userId, requestingUserId, confirmDeletion }) => {
    console.log(`Deletion requested for user ${userId} by ${requestingUserId}`);

    if (!confirmDeletion) {
      return {
        success: false,
        error: 'Deletion not confirmed',
        message: 'You must set confirmDeletion to true to proceed. This action is permanent and irreversible — all your data will be deleted from Omega.',
      };
    }

    try {
      const result = await deleteUserProfile(userId, requestingUserId);

      const totalRecords = Object.values(result.recordsDeleted).reduce((sum, count) => sum + count, 0);

      return {
        success: true,
        message: `Profile for "${result.username}" has been permanently deleted. ${totalRecords} records removed across ${result.tablesAffected.length} tables.`,
        auditId: result.auditId,
        tablesAffected: result.tablesAffected,
        recordsDeleted: result.recordsDeleted,
        totalRecordsDeleted: totalRecords,
      };
    } catch (error) {
      console.error('Failed to delete user profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to delete profile. Please try again or contact an administrator.',
      };
    }
  },
});
