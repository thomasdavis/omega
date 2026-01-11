/**
 * Val Town Get Val Tool
 * Allows AI to get details of a specific val on Val Town
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getVal } from '../services/valTownService.js';

export const valTownGetValTool = tool({
  description: `Get details of a specific val on Val Town by its ID.

Use this when:
- User wants to inspect a val's current code or configuration
- User wants to check a val's privacy settings
- User wants to see when a val was last updated
- User needs to verify a val exists before updating or deleting it

Returns full val details including code, privacy, version, author, and timestamps.`,

  inputSchema: z.object({
    valId: z
      .string()
      .describe('Val ID (get from valTownListVals or valTownCreateVal)'),
  }),

  execute: async ({ valId }) => {
    console.log(`🔍 Fetching Val Town val: ${valId}`);

    const result = await getVal(valId);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to get val',
        code: result.code,
      };
    }

    const val = result.data!;
    const valUrl = val.public_suffix_domain
      ? `https://${val.public_suffix_domain}`
      : `https://${val.author.username}-${val.name}.web.val.run`;

    return {
      success: true,
      message: `Val fetched successfully`,
      val: {
        id: val.id,
        name: val.name,
        code: val.code,
        privacy: val.privacy,
        version: val.version,
        author: {
          id: val.author.id,
          username: val.author.username,
        },
        url: valUrl,
        editUrl: `https://val.town/v/${val.author.username}/${val.name}`,
        readme: val.readme,
        createdAt: val.createdAt,
        updatedAt: val.updatedAt,
        runStartAt: val.runStartAt,
        runEndAt: val.runEndAt,
      },
    };
  },
});
