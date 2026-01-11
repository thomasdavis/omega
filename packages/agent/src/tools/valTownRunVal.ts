/**
 * Val Town Run Val Tool
 * Allows AI to execute/trigger HTTP vals on Val Town
 */

import { tool } from 'ai';
import { z } from 'zod';
import { runVal } from '../services/valTownService.js';

export const valTownRunValTool = tool({
  description: `Execute an HTTP val on Val Town and get the response.

Use this when:
- User wants to test a deployed val
- User wants to trigger a val's functionality programmatically
- User wants to see what a val returns
- User wants to execute a val with specific parameters

This tool calls the val's public URL and returns the response.

Note: This only works for HTTP vals (not script, email, or interval vals).`,

  inputSchema: z.object({
    username: z
      .string()
      .describe(
        'Val Town username (owner of the val, e.g., "yourusername")'
      ),
    valName: z
      .string()
      .describe('Val name (e.g., "discord_bookmarks" or "myApiEndpoint")'),
    params: z
      .record(z.any())
      .optional()
      .describe(
        'Optional query parameters to pass to the val as key-value pairs'
      ),
  }),

  execute: async ({ username, valName, params }) => {
    console.log(`▶️  Running Val Town val: ${username}/${valName}`);

    const result = await runVal(username, valName, params);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to run val',
      };
    }

    const valUrl = `https://${username}-${valName}.web.val.run`;
    const editUrl = `https://val.town/v/${username}/${valName}`;

    return {
      success: true,
      message: `Val executed successfully`,
      val: {
        username,
        name: valName,
        url: valUrl,
        editUrl,
      },
      params: params || {},
      response: result.data,
      instructions: [
        `View the val at: ${valUrl}`,
        `Edit on Val Town: ${editUrl}`,
        params
          ? `Executed with params: ${JSON.stringify(params)}`
          : 'Executed without params',
      ],
    };
  },
});
