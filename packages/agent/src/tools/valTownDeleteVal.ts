/**
 * Val Town Delete Val Tool
 * Allows AI to delete vals on Val Town
 */

import { tool } from 'ai';
import { z } from 'zod';
import { deleteVal } from '../services/valTownService.js';

export const valTownDeleteValTool = tool({
  description: `Delete a val on Val Town permanently.

Use this when:
- User wants to remove an old or test val
- User wants to clean up unused deployments
- User wants to delete a val before recreating it with the same name
- User explicitly requests deletion of a val

⚠️ WARNING: This operation is permanent and cannot be undone!

Note: You need the val ID to delete it. Use valTownListVals to find the ID first.`,

  inputSchema: z.object({
    valId: z
      .string()
      .describe('Val ID to delete (get from valTownListVals or valTownGetVal)'),
    confirm: z
      .boolean()
      .default(false)
      .describe(
        'Confirmation flag - must be true to actually delete the val'
      ),
  }),

  execute: async ({ valId, confirm }) => {
    console.log(`🗑️  Deleting Val Town val: ${valId}`);

    if (!confirm) {
      return {
        success: false,
        error:
          'Deletion not confirmed. Set confirm=true to actually delete the val.',
        warning:
          '⚠️ Deletion is permanent and cannot be undone. Use confirm=true to proceed.',
      };
    }

    const result = await deleteVal(valId);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to delete val',
        code: result.code,
      };
    }

    return {
      success: true,
      message: `Val deleted successfully! 🗑️`,
      valId,
      warning: 'This operation is permanent and cannot be undone.',
    };
  },
});
