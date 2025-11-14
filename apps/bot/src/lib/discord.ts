import { InteractionResponseType } from '../types/discord';
import type {
  DiscordInteractionResponseData,
  DiscordEmbed,
} from '../types/discord';
import { DiscordAPIError } from '../utils/errors';

/**
 * Discord API base URL
 */
const DISCORD_API_BASE = 'https://discord.com/api/v10';

/**
 * Get required environment variables
 */
function getConfig() {
  const appId = process.env.DISCORD_APP_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!appId || !botToken) {
    throw new Error('Discord configuration is missing');
  }

  return { appId, botToken };
}

/**
 * Send a deferred response to Discord
 * This tells Discord "I received your request, give me time to process it"
 * You have 15 minutes to edit the deferred response
 */
export async function deferResponse(
  appId: string,
  interactionToken: string,
  ephemeral: boolean = false
): Promise<void> {
  const url = `${DISCORD_API_BASE}/webhooks/${appId}/${interactionToken}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      data: ephemeral ? { flags: 64 } : undefined, // 64 = ephemeral
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new DiscordAPIError(`Failed to defer response: ${error}`, response.status);
  }
}

/**
 * Edit the original deferred response
 * This updates the "thinking..." message with your actual response
 */
export async function editResponse(
  appId: string,
  interactionToken: string,
  content: string,
  embeds?: DiscordEmbed[]
): Promise<void> {
  const url = `${DISCORD_API_BASE}/webhooks/${appId}/${interactionToken}/messages/@original`;

  const body: DiscordInteractionResponseData = { content };
  if (embeds) {
    body.embeds = embeds;
  }

  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new DiscordAPIError(`Failed to edit response: ${error}`, response.status);
  }
}

/**
 * Edit response with only embeds (no content)
 */
export async function editResponseWithEmbeds(
  appId: string,
  interactionToken: string,
  embeds: DiscordEmbed[]
): Promise<void> {
  const url = `${DISCORD_API_BASE}/webhooks/${appId}/${interactionToken}/messages/@original`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new DiscordAPIError(`Failed to edit response: ${error}`, response.status);
  }
}

/**
 * Send a follow-up message (creates a new message)
 */
export async function sendFollowup(
  appId: string,
  interactionToken: string,
  content: string,
  ephemeral: boolean = false
): Promise<void> {
  const url = `${DISCORD_API_BASE}/webhooks/${appId}/${interactionToken}`;

  const body: DiscordInteractionResponseData = { content };
  if (ephemeral) {
    body.flags = 64; // Ephemeral flag
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new DiscordAPIError(`Failed to send follow-up: ${error}`, response.status);
  }
}

/**
 * Delete the original response
 */
export async function deleteResponse(
  appId: string,
  interactionToken: string
): Promise<void> {
  const url = `${DISCORD_API_BASE}/webhooks/${appId}/${interactionToken}/messages/@original`;

  const response = await fetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new DiscordAPIError(`Failed to delete response: ${error}`, response.status);
  }
}

/**
 * Register application commands globally
 */
export async function registerGlobalCommands(
  commands: any[]
): Promise<any> {
  const { appId, botToken } = getConfig();
  const url = `${DISCORD_API_BASE}/applications/${appId}/commands`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${botToken}`,
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new DiscordAPIError(`Failed to register commands: ${error}`, response.status);
  }

  return await response.json();
}

/**
 * Register application commands for a specific guild (faster updates)
 */
export async function registerGuildCommands(
  guildId: string,
  commands: any[]
): Promise<any> {
  const { appId, botToken } = getConfig();
  const url = `${DISCORD_API_BASE}/applications/${appId}/guilds/${guildId}/commands`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${botToken}`,
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new DiscordAPIError(`Failed to register guild commands: ${error}`, response.status);
  }

  return await response.json();
}

/**
 * Get user ID from interaction
 */
export function getUserId(interaction: any): string {
  return interaction.member?.user?.id || interaction.user?.id || 'unknown';
}

/**
 * Get username from interaction
 */
export function getUsername(interaction: any): string {
  const user = interaction.member?.user || interaction.user;
  return user?.username || 'Unknown User';
}
