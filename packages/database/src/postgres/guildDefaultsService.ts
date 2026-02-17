/**
 * Guild Defaults Service
 * Manages default Discord guild IDs per server for channel listing and guild-specific commands
 */

import { getPostgresPool } from './client.js';

export interface GuildDefaultRecord {
  id: number;
  server_id: string | null;
  user_id: string | null;
  guild_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface SetGuildDefaultParams {
  serverId: string;
  guildId: string;
  userId?: string;
}

/**
 * Set or update the default guild ID for a Discord server
 */
export async function setGuildDefault(params: SetGuildDefaultParams): Promise<GuildDefaultRecord> {
  const pool = await getPostgresPool();

  // Delete existing default for this server/user combination, then insert
  await pool.query(
    `DELETE FROM discord_guild_defaults
     WHERE (server_id = $1 OR (server_id IS NULL AND $1 IS NULL))
     AND (user_id = $2 OR (user_id IS NULL AND $2 IS NULL))`,
    [params.serverId || null, params.userId || null]
  );

  const result = await pool.query(
    `INSERT INTO discord_guild_defaults (server_id, user_id, guild_id, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     RETURNING *`,
    [params.serverId || null, params.userId || null, params.guildId]
  );

  return result.rows[0];
}

/**
 * Get the default guild ID for a Discord server
 */
export async function getGuildDefault(serverId: string): Promise<GuildDefaultRecord | null> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `SELECT * FROM discord_guild_defaults
     WHERE server_id = $1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [serverId]
  );

  return result.rows[0] || null;
}

/**
 * Remove the default guild ID for a Discord server
 */
export async function removeGuildDefault(serverId: string): Promise<boolean> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `DELETE FROM discord_guild_defaults
     WHERE server_id = $1
     RETURNING id`,
    [serverId]
  );

  return result.rows.length > 0;
}

/**
 * List all configured guild defaults
 */
export async function listGuildDefaults(): Promise<GuildDefaultRecord[]> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `SELECT * FROM discord_guild_defaults
     ORDER BY updated_at DESC`
  );

  return result.rows;
}

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
    console.error(`[GuildDefaults] Failed to get default guild:`, error);
    return null;
  }
}
