/**
 * Set Default Guild Tool
 * Allows users to configure a default Discord guild ID for the current server
 */

import { tool } from 'ai';
import { z } from 'zod';
import { setGuildDefault } from '@repo/database';

export const setDefaultGuildTool = tool({
  description: `Set or update the default Discord guild ID for the current server. Once set, Discord commands that require a guild ID (like listing channels) will automatically use this default instead of requiring users to specify it every time.`,

  inputSchema: z.object({
    serverId: z
      .string()
      .describe('The Discord server (guild) ID where this default should apply. This is the server the user is currently in.'),
    guildId: z
      .string()
      .describe('The Discord guild ID to use as the default for guild-specific operations'),
    userId: z
      .string()
      .optional()
      .describe('The user ID of who set this default (optional, for per-user defaults)'),
  }),

  execute: async ({ serverId, guildId, userId }) => {
    try {
      const result = await setGuildDefault({
        serverId,
        guildId,
        userId,
      });

      return {
        success: true,
        message: `Default guild set to ${guildId} for this server.`,
        data: {
          serverId: result.server_id,
          guildId: result.guild_id,
          updatedAt: result.updated_at,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
