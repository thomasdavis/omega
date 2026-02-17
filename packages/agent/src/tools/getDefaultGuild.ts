/**
 * Get Default Guild Tool
 * Retrieves the currently configured default Discord guild ID for a server
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getGuildDefault } from '@repo/database';

export const getDefaultGuildTool = tool({
  description: `Get the currently configured default Discord guild ID for the current server. Returns the guild ID, name, and who set it. Useful for checking what guild ID is being used by default for Discord operations.`,

  inputSchema: z.object({
    serverId: z
      .string()
      .describe('The Discord server (guild) ID to look up the default for'),
  }),

  execute: async ({ serverId }) => {
    try {
      const result = await getGuildDefault(serverId);

      if (!result) {
        return {
          success: true,
          hasDefault: false,
          message: 'No default guild ID is configured for this server. Use setDefaultGuild to configure one.',
        };
      }

      return {
        success: true,
        hasDefault: true,
        data: {
          serverId: result.server_id,
          guildId: result.guild_id,
          guildName: result.guild_name,
          setBy: result.set_by_username,
          updatedAt: result.updated_at,
        },
        message: `Default guild: ${result.guild_id}${result.guild_name ? ` (${result.guild_name})` : ''}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
