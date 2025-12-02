/**
 * Fetch Durable Attachments
 * Re-fetches messages via REST API with with_application_state=true
 * to get stable, non-ephemeral attachment URLs that won't 404
 */

import { Message, Client } from 'discord.js';
import { Routes } from 'discord-api-types/v10';

interface DurableAttachment {
  id: string;
  filename: string;
  url: string; // Stable URL with longer TTL
  proxy_url: string;
  size: number;
  content_type?: string;
  width?: number;
  height?: number;
}

interface RESTMessage {
  id: string;
  channel_id: string;
  attachments: DurableAttachment[];
  [key: string]: any;
}

/**
 * Fetch message via REST API with durable attachment URLs
 *
 * Gateway attachment URLs can be ephemeral (0-5 second TTL) when:
 * - Server has "Media Security" enabled
 * - Message is from DM or secure channel
 * - Bot lacks proper permissions
 *
 * Solution: Re-fetch via REST with with_application_state=true
 * This returns fresh, stable URLs that last minutes/hours
 */
export async function fetchMessageWithDurableAttachments(
  client: Client,
  message: Message
): Promise<RESTMessage | null> {
  try {
    console.log(`🔄 Re-fetching message ${message.id} via REST for durable attachment URLs...`);
    console.log(`   Channel: ${message.channelId}`);

    // Use REST API with the critical flag
    // Note: Discord.js REST client expects query as a plain object or URLSearchParams
    const restMessage = await client.rest.get(
      Routes.channelMessage(message.channelId, message.id),
      {
        query: new URLSearchParams({
          with_application_state: 'true'
        })
      }
    ) as RESTMessage;

    console.log(`✅ Got REST message with ${restMessage.attachments?.length || 0} attachment(s)`);

    if (restMessage.attachments && restMessage.attachments.length > 0) {
      console.log(`   Durable URLs obtained for ${restMessage.attachments.length} attachment(s)`);
      restMessage.attachments.forEach((att, i) => {
        console.log(`   [${i + 1}] ${att.filename} - ID: ${att.id}`);
      });
    }

    return restMessage;
  } catch (error) {
    console.error('❌ Failed to fetch message via REST:', error);
    console.error('   This will cause attachment caching to fail - tools won\'t have access to attachments');
    return null;
  }
}

/**
 * Download attachment from durable URL
 */
export async function downloadDurableAttachment(
  attachment: DurableAttachment
): Promise<{ buffer: Buffer; mimeType: string }> {
  console.log(`   Downloading ${attachment.filename} from durable URL...`);

  const response = await fetch(attachment.url);

  if (!response.ok) {
    throw new Error(
      `Failed to download attachment: HTTP ${response.status}. ` +
      `This shouldn't happen with durable URLs from REST API.`
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get('content-type') || attachment.content_type || 'application/octet-stream';

  console.log(`   ✅ Downloaded ${(buffer.length / 1024).toFixed(2)} KB`);

  return { buffer, mimeType };
}
