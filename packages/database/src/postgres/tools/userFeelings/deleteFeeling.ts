/**
 * Delete User Feeling Tool
 * Deletes a feeling entry
 */

import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '../../prismaClient.js';

export const deleteFeelingTool = tool({
  description: `Delete a feeling entry.

Use this when:
- User wants to remove a logged feeling
- User wants to delete a mood entry
- User made a mistake logging a feeling

Examples:
- "Delete feeling ID abc123"
- "Remove my last mood entry"
- "Delete that feeling I just logged"`,

  inputSchema: z.object({
    id: z.string().describe('Feeling entry ID to delete'),
  }),

  execute: async ({ id }) => {
    console.log(`🗑️ [UserFeeling] Deleting feeling: ${id}`);

    try {
      await prisma.userFeeling.delete({
        where: { id },
      });

      console.log(`✅ [UserFeeling] Deleted feeling: ${id}`);

      return {
        success: true,
        id,
        message: 'Feeling entry deleted successfully',
      };
    } catch (error) {
      console.error(`❌ [UserFeeling] Failed to delete feeling:`, error);
      return {
        success: false,
        error: 'DELETE_FAILED',
        message: `Failed to delete feeling: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
