/**
 * Get Default Guild Tool
 * Retrieves the default Discord guild ID for a server or user
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool } from '../../client.js';

export const getDefaultGuildTool = tool({
  description: `Get the default Discord guild ID for channel listing and guild-specific commands.

Use this when:
- You need a guild ID for a Discord operation but the user didn't specify one
- User asks "what is my default guild" or similar
- Before executing guild-specific commands to check if a default is configured

Returns the most specific default available: per-user first, then per-server, then global.`,

  inputSchema: z.object({
    serverId: z.string().optional().describe('The Discord server ID to look up the default for'),
    userId: z.string().optional().describe('The Discord user ID to look up a per-user default for'),
  }),

  execute: async ({ serverId, userId }) => {
    console.log(`🔍 [GuildDefaults] Looking up default guild for server=${serverId || 'any'}, user=${userId || 'any'}`);

    try {
      const pool = await getPostgresPool();

      // Look up defaults in priority order: user+server specific > server-wide > global
      const result = await pool.query(
        `SELECT guild_id, server_id, user_id, updated_at
         FROM discord_guild_defaults
         WHERE (server_id = $1 OR server_id IS NULL)
         AND (user_id = $2 OR user_id IS NULL)
         ORDER BY
           CASE WHEN user_id IS NOT NULL AND server_id IS NOT NULL THEN 1
                WHEN server_id IS NOT NULL THEN 2
                ELSE 3
           END
         LIMIT 1`,
        [serverId || null, userId || null]
      );

      if (result.rows.length === 0) {
        console.log(`ℹ️ [GuildDefaults] No default guild found`);
        return {
          success: true,
          found: false,
          guildId: null,
          message: 'No default guild ID configured. Use setDefaultGuild to set one.',
        };
      }

      const row = result.rows[0];
      console.log(`✅ [GuildDefaults] Found default guild: ${row.guild_id}`);

      return {
        success: true,
        found: true,
        guildId: row.guild_id,
        serverId: row.server_id,
        userId: row.user_id,
        updatedAt: row.updated_at,
        message: `Default guild ID is ${row.guild_id}`,
      };
    } catch (error) {
      console.error(`❌ [GuildDefaults] Failed to get default guild:`, error);
      return {
        success: false,
        found: false,
        guildId: null,
        error: 'GET_FAILED',
        message: `Failed to get default guild: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
