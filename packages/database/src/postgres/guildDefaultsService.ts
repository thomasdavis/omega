/**
 * Guild Defaults Service
 * Service layer for querying default guild IDs
 */

import { getPostgresPool } from './client.js';

/**
 * Get the default guild ID for a given server and/or user.
 * Returns the most specific match: user+server > server-wide > global.
 * Returns null if no default is configured.
 */
export async function getDefaultGuildId(
  serverId?: string | null,
  userId?: string | null
): Promise<string | null> {
  try {
    const pool = await getPostgresPool();

    const result = await pool.query(
      `SELECT guild_id
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

    return result.rows.length > 0 ? result.rows[0].guild_id : null;
  } catch (error) {
    console.error(`❌ [GuildDefaults] Failed to get default guild:`, error);
    return null;
  }
}
