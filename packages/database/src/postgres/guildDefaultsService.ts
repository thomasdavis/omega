/**
 * Guild Defaults Service
 * Manages default Discord guild IDs per server for channel listing and guild-specific commands
 */

import { prisma } from './prismaClient.js';

export interface GuildDefaultRecord {
  id: number;
  server_id: string;
  guild_id: string;
  guild_name: string | null;
  set_by_user_id: string | null;
  set_by_username: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SetGuildDefaultParams {
  serverId: string;
  guildId: string;
  guildName?: string;
  setByUserId?: string;
  setByUsername?: string;
}

/**
 * Set or update the default guild ID for a Discord server
 */
export async function setGuildDefault(params: SetGuildDefaultParams): Promise<GuildDefaultRecord> {
  const result = await prisma.$queryRaw<GuildDefaultRecord[]>`
    INSERT INTO discord_guild_defaults (
      server_id,
      guild_id,
      guild_name,
      set_by_user_id,
      set_by_username,
      created_at,
      updated_at
    ) VALUES (
      ${params.serverId},
      ${params.guildId},
      ${params.guildName || null},
      ${params.setByUserId || null},
      ${params.setByUsername || null},
      NOW(),
      NOW()
    )
    ON CONFLICT (server_id) DO UPDATE SET
      guild_id = EXCLUDED.guild_id,
      guild_name = EXCLUDED.guild_name,
      set_by_user_id = EXCLUDED.set_by_user_id,
      set_by_username = EXCLUDED.set_by_username,
      updated_at = NOW()
    RETURNING *
  `;

  return result[0];
}

/**
 * Get the default guild ID for a Discord server
 */
export async function getGuildDefault(serverId: string): Promise<GuildDefaultRecord | null> {
  const results = await prisma.$queryRaw<GuildDefaultRecord[]>`
    SELECT *
    FROM discord_guild_defaults
    WHERE server_id = ${serverId}
    LIMIT 1
  `;

  return results[0] || null;
}

/**
 * Remove the default guild ID for a Discord server
 */
export async function removeGuildDefault(serverId: string): Promise<boolean> {
  const result = await prisma.$queryRaw<Array<{ id: number }>>`
    DELETE FROM discord_guild_defaults
    WHERE server_id = ${serverId}
    RETURNING id
  `;

  return result.length > 0;
}

/**
 * List all configured guild defaults
 */
export async function listGuildDefaults(): Promise<GuildDefaultRecord[]> {
  const results = await prisma.$queryRaw<GuildDefaultRecord[]>`
    SELECT *
    FROM discord_guild_defaults
    ORDER BY updated_at DESC
  `;

  return results;
}
