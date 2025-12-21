/**
 * Discord Channel Description Manager Tool
 * Fetches channel information, checks pinned messages, and manages channel descriptions
 * via pinned messages in Discord servers
 */

import { tool } from 'ai';
import { z } from 'zod';
import { Client, GatewayIntentBits, Guild, TextChannel, NewsChannel, ForumChannel } from 'discord.js';

interface ChannelInfo {
  id: string;
  name: string;
  type: string;
  topic: string | null;
  pinnedMessages: Array<{
    id: string;
    content: string;
    author: string;
    createdAt: string;
  }>;
}

interface DiscordClientResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Create and initialize a Discord client
 */
async function createDiscordClient(): Promise<Client> {
  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

  if (!DISCORD_BOT_TOKEN) {
    throw new Error('DISCORD_BOT_TOKEN is not configured');
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Discord client connection timeout'));
    }, 30000); // 30 second timeout

    client.once('ready', () => {
      clearTimeout(timeout);
      console.log(`✅ Discord bot connected as ${client.user?.tag}`);
      resolve();
    });

    client.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    client.login(DISCORD_BOT_TOKEN);
  });

  return client;
}

/**
 * Fetch all channels in a guild with their topics and pinned messages
 */
async function fetchGuildChannels(guildId: string): Promise<DiscordClientResult<ChannelInfo[]>> {
  let client: Client | null = null;

  try {
    client = await createDiscordClient();

    // Fetch the guild
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      throw new Error(`Guild ${guildId} not found`);
    }

    // Fetch all channels
    const channels = await guild.channels.fetch();
    const channelInfos: ChannelInfo[] = [];

    for (const [channelId, channel] of channels) {
      if (!channel) continue;

      // Only process text-based channels
      if (channel instanceof TextChannel || channel instanceof NewsChannel) {
        const pinnedMessages = await channel.messages.fetchPinned();

        channelInfos.push({
          id: channel.id,
          name: channel.name,
          type: channel.type.toString(),
          topic: channel.topic,
          pinnedMessages: pinnedMessages.map(msg => ({
            id: msg.id,
            content: msg.content.substring(0, 200), // Truncate long messages
            author: msg.author.tag,
            createdAt: msg.createdAt.toISOString(),
          })),
        });
      }
    }

    return {
      success: true,
      data: channelInfos,
    };
  } catch (error) {
    console.error('❌ Error fetching guild channels:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (client) {
      await client.destroy();
      console.log('✅ Discord client disconnected');
    }
  }
}

/**
 * Pin a description message to a specific channel
 */
async function pinDescriptionMessage(
  channelId: string,
  description: string,
  updateExisting: boolean = false
): Promise<DiscordClientResult<{ messageId: string; channelName: string }>> {
  let client: Client | null = null;

  try {
    client = await createDiscordClient();

    // Fetch the channel
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    if (!(channel instanceof TextChannel) && !(channel instanceof NewsChannel)) {
      throw new Error(`Channel ${channelId} is not a text channel`);
    }

    // Check existing pinned messages if updateExisting is true
    if (updateExisting) {
      const pinnedMessages = await channel.messages.fetchPinned();
      const botMessages = pinnedMessages.filter(
        msg => msg.author.id === client.user?.id
      );

      // Unpin existing bot messages
      for (const msg of botMessages.values()) {
        await msg.unpin();
        console.log(`📌 Unpinned existing message ${msg.id}`);
      }
    }

    // Send and pin the new description message
    const message = await channel.send(description);
    await message.pin();

    console.log(`✅ Pinned description message to #${channel.name}`);

    return {
      success: true,
      data: {
        messageId: message.id,
        channelName: channel.name,
      },
    };
  } catch (error) {
    console.error('❌ Error pinning description message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (client) {
      await client.destroy();
      console.log('✅ Discord client disconnected');
    }
  }
}

export const discordChannelDescriptionManagerTool = tool({
  description: `Manage Discord channel descriptions through pinned messages.

  **Capabilities:**
  - Fetch all channels with their names, topics, and current pinned messages
  - Pin description messages to channels (with optional update of existing pins)
  - Identify channels missing descriptions or pinned messages

  **Use Cases:**
  - "fetch all channel names and descriptions in my Discord server"
  - "pin a description message in channel #general"
  - "update the pinned description in #announcements"
  - "show me channels missing descriptions"

  **Actions:**
  - list: Fetch all channels with their current state
  - pin: Pin a description message to a specific channel

  Note: Requires DISCORD_BOT_TOKEN to be configured and proper bot permissions.`,

  inputSchema: z.object({
    action: z
      .enum(['list', 'pin'])
      .describe('Action to perform: "list" to fetch channels, "pin" to add/update pinned description'),

    guildId: z
      .string()
      .optional()
      .describe('Discord server (guild) ID - required for "list" action'),

    channelId: z
      .string()
      .optional()
      .describe('Specific channel ID - required for "pin" action'),

    description: z
      .string()
      .optional()
      .describe('Description message to pin - required for "pin" action'),

    updateExisting: z
      .boolean()
      .optional()
      .default(false)
      .describe('If true, unpin existing bot messages before pinning new one'),
  }),

  execute: async ({ action, guildId, channelId, description, updateExisting }) => {
    try {
      // Validate environment
      if (!process.env.DISCORD_BOT_TOKEN) {
        return {
          success: false,
          error: 'DISCORD_BOT_TOKEN is not configured',
        };
      }

      // LIST ACTION: Fetch all channels
      if (action === 'list') {
        if (!guildId) {
          return {
            success: false,
            error: 'guildId is required for "list" action',
          };
        }

        console.log(`📋 Fetching channels for guild ${guildId}...`);
        const result = await fetchGuildChannels(guildId);

        if (!result.success || !result.data) {
          return {
            success: false,
            error: result.error || 'Failed to fetch channels',
          };
        }

        // Format the results
        const channels = result.data;
        const channelsWithoutTopic = channels.filter(ch => !ch.topic);
        const channelsWithoutPins = channels.filter(ch => ch.pinnedMessages.length === 0);

        const summary = `Found ${channels.length} text channels in the server:

**All Channels:**
${channels.map(ch => `- #${ch.name} (${ch.id})
  Topic: ${ch.topic || '❌ No topic set'}
  Pinned Messages: ${ch.pinnedMessages.length}`).join('\n')}

**Channels Without Topic:** ${channelsWithoutTopic.length}
${channelsWithoutTopic.map(ch => `- #${ch.name} (${ch.id})`).join('\n')}

**Channels Without Pinned Messages:** ${channelsWithoutPins.length}
${channelsWithoutPins.map(ch => `- #${ch.name} (${ch.id})`).join('\n')}`;

        return {
          success: true,
          data: {
            channels,
            summary,
            stats: {
              totalChannels: channels.length,
              channelsWithoutTopic: channelsWithoutTopic.length,
              channelsWithoutPins: channelsWithoutPins.length,
            },
          },
          message: summary,
        };
      }

      // PIN ACTION: Pin description message
      if (action === 'pin') {
        if (!channelId) {
          return {
            success: false,
            error: 'channelId is required for "pin" action',
          };
        }

        if (!description) {
          return {
            success: false,
            error: 'description is required for "pin" action',
          };
        }

        console.log(`📌 Pinning description to channel ${channelId}...`);
        const result = await pinDescriptionMessage(channelId, description, updateExisting);

        if (!result.success || !result.data) {
          return {
            success: false,
            error: result.error || 'Failed to pin message',
          };
        }

        return {
          success: true,
          data: result.data,
          message: `Successfully pinned description message to #${result.data.channelName}`,
        };
      }

      return {
        success: false,
        error: `Unknown action: ${action}`,
      };
    } catch (error) {
      console.error('❌ Error in Discord Channel Description Manager:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
