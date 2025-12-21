/**
 * Val Town Update Val Tool
 * Allows AI to update existing vals on Val Town
 */

import { tool } from 'ai';
import { z } from 'zod';
import { updateVal, type UpdateValRequest } from '../services/valTownService.js';

export const valTownUpdateValTool = tool({
  description: `Update an existing val on Val Town.

Use this when:
- User wants to modify the code of an existing val
- User wants to change privacy settings
- User wants to update documentation (README)
- User wants to fix bugs or add features to a deployed val

Note: You need the val ID to update it. Use valTownListVals to find the ID first.`,

  parameters: z.object({
    valId: z.string().describe('Val ID (get from valTownListVals or valTownCreateVal)'),
    code: z.string().optional().describe('Updated JavaScript/TypeScript code'),
    privacy: z
      .enum(['public', 'unlisted', 'private'])
      .optional()
      .describe('Updated privacy level'),
    readme: z.string().optional().describe('Updated README documentation'),
  }),

  execute: async ({ valId, code, privacy, readme }) => {
    console.log(`🔄 Updating Val Town val: ${valId}`);

    const request: UpdateValRequest = {
      code,
      privacy,
      readme,
    };

    const result = await updateVal(valId, request);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to update val',
        code: result.code,
      };
    }

    const val = result.data!;
    const valUrl = val.public_suffix_domain
      ? `https://${val.public_suffix_domain}`
      : `https://${val.author.username}-${val.name}.web.val.run`;

    return {
      success: true,
      message: `Val updated successfully! ✨`,
      val: {
        id: val.id,
        name: val.name,
        url: valUrl,
        privacy: val.privacy,
        version: val.version,
        updatedAt: val.updatedAt,
      },
      instructions: [
        `View your updated val at: ${valUrl}`,
        `Edit on Val Town: https://val.town/v/${val.author.username}/${val.name}`,
      ],
    };
  },
});
