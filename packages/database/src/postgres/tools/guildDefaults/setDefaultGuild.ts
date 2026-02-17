/**
 * Set Default Guild Tool
 * Sets or updates the default Discord guild ID for a server or user
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool } from '../../client.js';

export const setDefaultGuildTool = tool({
  description: `Set the default Discord guild ID for channel listing and guild-specific commands.

Use this when:
- User wants to set a default guild/server for Discord operations
- User says "make that your default" or "set default guild"
- User wants to configure which guild to use by default
- User provides a guild ID and wants it remembered

The default can be set per-server (applies to all users in that Discord server) or per-user within a server.`,

  inputSchema: z.object({
    guildId: z.string().describe('The Discord guild ID to set as default'),
    serverId: z.string().optional().describe('The Discord server ID where this default applies (the channel/server the command was sent from)'),
    userId: z.string().optional().describe('The Discord user ID to set a per-user default for (optional, if not set applies server-wide)'),
  }),

  execute: async ({ guildId, serverId, userId }) => {
    console.log(`🏠 [GuildDefaults] Setting default guild ${guildId} for server=${serverId || 'global'}, user=${userId || 'all'}`);

    try {
      const pool = await getPostgresPool();

      // Delete existing default for this server/user combination, then insert
      await pool.query(
        `DELETE FROM discord_guild_defaults
         WHERE (server_id = $1 OR (server_id IS NULL AND $1 IS NULL))
         AND (user_id = $2 OR (user_id IS NULL AND $2 IS NULL))`,
        [serverId || null, userId || null]
      );

      await pool.query(
        `INSERT INTO discord_guild_defaults (server_id, user_id, guild_id)
         VALUES ($1, $2, $3)`,
        [serverId || null, userId || null, guildId]
      );

      console.log(`✅ [GuildDefaults] Default guild set to ${guildId}`);

      return {
        success: true,
        guildId,
        serverId: serverId || null,
        userId: userId || null,
        message: `Default guild ID set to ${guildId}${serverId ? ` for server ${serverId}` : ''}${userId ? ` for user ${userId}` : ' (server-wide)'}`,
      };
    } catch (error) {
      console.error(`❌ [GuildDefaults] Failed to set default guild:`, error);
      return {
        success: false,
        error: 'SET_FAILED',
        message: `Failed to set default guild: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
