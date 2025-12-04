/**
 * Discord Webhook Service
 *
 * Utilities for posting messages and images to Discord via webhooks or Discord client
 */

import { FormData } from 'undici';
import { Client, GatewayIntentBits, TextChannel, AttachmentBuilder } from 'discord.js';

export interface DiscordWebhookMessage {
  content?: string;
  files?: Array<{
    name: string;
    data: Buffer;
  }>;
}

/**
 * Send a message with optional image to a Discord webhook
 */
export async function sendDiscordWebhook(
  webhookUrl: string,
  message: DiscordWebhookMessage
): Promise<{ success: boolean; error?: string }> {
  try {
    const formData = new FormData();

    // Build payload
    const payload: any = {};
    if (message.content) {
      payload.content = message.content;
    }

    formData.append('payload_json', JSON.stringify(payload));

    // Add files if present
    if (message.files && message.files.length > 0) {
      for (let i = 0; i < message.files.length; i++) {
        const file = message.files[i];
        const blob = new Blob([file.data], {
          type: 'image/png',
        });
        formData.append(`files[${i}]`, blob, file.name);
      }
    }

    // Send webhook request
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData as any,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Discord webhook failed: ${response.status} - ${errorText}`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending Discord webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Post a generated comic image to Discord via webhook
 */
export async function postComicToDiscord(
  imageBuffer: Buffer,
  issueNumber: number,
  issueTitle: string,
  issueUrl: string
): Promise<{ success: boolean; error?: string }> {
  const DISCORD_COMIC_WEBHOOK_URL = process.env.DISCORD_COMIC_WEBHOOK_URL;

  if (!DISCORD_COMIC_WEBHOOK_URL) {
    return {
      success: false,
      error: 'DISCORD_COMIC_WEBHOOK_URL is not configured',
    };
  }

  const filename = `comic-issue-${issueNumber}.png`;

  return sendDiscordWebhook(DISCORD_COMIC_WEBHOOK_URL, {
    content: `🎨 **Comic Generated for Issue #${issueNumber}**\n${issueTitle}\n🔗 ${issueUrl}`,
    files: [
      {
        name: filename,
        data: imageBuffer,
      },
    ],
  });
}

/**
 * Post content to Discord using Discord client (more reliable than webhooks)
 * Creates a temporary Discord client, posts the message, then disconnects
 */
export async function postToDiscordChannel(options: {
  channelId: string;
  content: string;
  imageBuffer?: Buffer;
  imageName?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { channelId, content, imageBuffer, imageName } = options;
  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

  if (!DISCORD_BOT_TOKEN) {
    console.error('❌ [postToDiscordChannel] DISCORD_BOT_TOKEN not configured');
    return {
      success: false,
      error: 'DISCORD_BOT_TOKEN is not configured',
    };
  }

  if (!channelId) {
    console.error('❌ [postToDiscordChannel] Channel ID not provided');
    return {
      success: false,
      error: 'Channel ID is required',
    };
  }

  console.log(`🤖 [postToDiscordChannel] Creating Discord client...`);

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ],
  });

  try {
    // Wait for client to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Discord client connection timeout'));
      }, 30000); // 30 second timeout

      client.once('ready', () => {
        clearTimeout(timeout);
        console.log(`✅ [postToDiscordChannel] Discord bot connected as ${client.user?.tag}`);
        resolve();
      });

      client.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      client.login(DISCORD_BOT_TOKEN);
    });

    console.log(`📤 [postToDiscordChannel] Fetching channel ${channelId}...`);

    // Fetch the channel
    const channel = await client.channels.fetch(channelId);

    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    if (!channel.isTextBased() || !(channel instanceof TextChannel)) {
      throw new Error(`Channel ${channelId} is not a text channel`);
    }

    console.log(`✅ [postToDiscordChannel] Channel fetched successfully`);

    // Build message payload
    const messagePayload: any = {
      content,
    };

    // Add image attachment if provided
    if (imageBuffer) {
      const attachment = new AttachmentBuilder(imageBuffer, {
        name: imageName || 'image.png',
      });
      messagePayload.files = [attachment];
      console.log(`📎 [postToDiscordChannel] Attaching image: ${imageName || 'image.png'} (${imageBuffer.length} bytes)`);
    }

    console.log(`📤 [postToDiscordChannel] Sending message...`);

    // Send the message
    const message = await channel.send(messagePayload);

    console.log(`✅ [postToDiscordChannel] Message sent successfully (ID: ${message.id})`);

    return {
      success: true,
      messageId: message.id,
    };
  } catch (error) {
    console.error('❌ [postToDiscordChannel] Error posting to Discord:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    // Always cleanup the client
    console.log(`🔌 [postToDiscordChannel] Disconnecting Discord client...`);
    await client.destroy();
    console.log(`✅ [postToDiscordChannel] Discord client disconnected`);
  }
}
