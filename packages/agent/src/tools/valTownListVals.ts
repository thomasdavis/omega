/**
 * Val Town List Vals Tool
 * Allows AI to list user's vals on Val Town
 */

import { tool } from 'ai';
import { z } from 'zod';
import { listVals } from '../services/valTownService.js';

export const valTownListValsTool = tool({
  description: `List user's vals on Val Town.

Use this when:
- User wants to see their deployed vals
- User wants to find a val ID to update or delete
- User wants to check if a val already exists before creating a new one
- User asks about their Val Town deployments`,

  parameters: z.object({
    limit: z
      .number()
      .min(1)
      .max(100)
      .default(20)
      .describe('Maximum number of vals to return (default: 20, max: 100)'),
  }),

  execute: async ({ limit }) => {
    console.log(`📋 Listing Val Town vals (limit: ${limit})`);

    const result = await listVals(limit);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to list vals',
        code: result.code,
      };
    }

    const vals = result.data!;

    if (vals.length === 0) {
      return {
        success: true,
        message: 'No vals found. Create your first val with valTownCreateVal!',
        vals: [],
      };
    }

    const formattedVals = vals.map((val) => ({
      id: val.id,
      name: val.name,
      privacy: val.privacy,
      version: val.version,
      url: val.public_suffix_domain
        ? `https://${val.public_suffix_domain}`
        : `https://${val.author.username}-${val.name}.web.val.run`,
      editUrl: `https://val.town/v/${val.author.username}/${val.name}`,
      createdAt: val.createdAt,
      updatedAt: val.updatedAt,
    }));

    return {
      success: true,
      message: `Found ${vals.length} val(s)`,
      vals: formattedVals,
      count: vals.length,
    };
  },
});
