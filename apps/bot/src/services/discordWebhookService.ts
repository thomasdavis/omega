/**
 * Discord Webhook Service
 *
 * Utilities for posting messages and images to Discord via webhooks
 */

import { FormData } from 'undici';

export interface DiscordWebhookMessage {
  content?: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    color?: number;
    url?: string;
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
  }>;
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
    if (message.embeds) {
      payload.embeds = message.embeds;
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
 * Post a generated comic image to Discord
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
    embeds: [
      {
        title: `🎨 Comic Generated for Issue #${issueNumber}`,
        description: issueTitle,
        color: 0x5865f2, // Discord blurple
        url: issueUrl,
      },
    ],
    files: [
      {
        name: filename,
        data: imageBuffer,
      },
    ],
  });
}
