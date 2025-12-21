/**
 * Val Town Bookmarks Integration
 * Extracts links from Discord messages and sends them to Val Town for storage
 */

interface BookmarkData {
  links: string[];
  userId: string;
  username: string;
  channelId: string;
  channelName: string;
  messageContent: string;
  timestamp: Date;
  messageId: string;
}

/**
 * Extract all URLs from a message
 */
export function extractLinks(content: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = content.match(urlRegex);
  return matches || [];
}

/**
 * Send extracted links to Val Town webhook
 * @param bookmarkData - Data about the links and context
 * @param valTownWebhookUrl - Your Val Town webhook endpoint (e.g., https://username-bookmarks.web.val.run/webhook)
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function sendToValTown(
  bookmarkData: BookmarkData,
  valTownWebhookUrl: string
): Promise<boolean> {
  // Skip if no links found
  if (bookmarkData.links.length === 0) {
    return false;
  }

  // Skip if webhook URL not configured
  if (!valTownWebhookUrl || valTownWebhookUrl.trim() === '') {
    console.log('   ⚠️  Val Town webhook URL not configured - skipping bookmark sync');
    return false;
  }

  try {
    console.log(`   🔖 Sending ${bookmarkData.links.length} link(s) to Val Town...`);

    const response = await fetch(valTownWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        links: bookmarkData.links,
        user: {
          id: bookmarkData.userId,
          username: bookmarkData.username,
        },
        channel: {
          id: bookmarkData.channelId,
          name: bookmarkData.channelName,
        },
        message: {
          id: bookmarkData.messageId,
          content: bookmarkData.messageContent,
          timestamp: bookmarkData.timestamp.toISOString(),
        },
      }),
      // Don't block message processing - use a reasonable timeout
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      console.log(`   ✅ Successfully sent ${bookmarkData.links.length} link(s) to Val Town`);
      return true;
    } else {
      console.error(`   ❌ Val Town webhook returned ${response.status}: ${response.statusText}`);
      return false;
    }
  } catch (error) {
    // Log but don't throw - we don't want Val Town failures to break Discord bot
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.error('   ⚠️  Val Town webhook timed out (5s) - continuing anyway');
    } else {
      console.error('   ⚠️  Error sending to Val Town:', error instanceof Error ? error.message : String(error));
    }
    return false;
  }
}

/**
 * Process a Discord message and extract/send links to Val Town
 * This is a convenience function that combines extraction and sending
 */
export async function processMessageForBookmarks(
  messageContent: string,
  userId: string,
  username: string,
  channelId: string,
  channelName: string,
  messageId: string,
  valTownWebhookUrl?: string
): Promise<void> {
  const links = extractLinks(messageContent);

  if (links.length === 0) {
    return; // No links to process
  }

  const webhookUrl = valTownWebhookUrl || process.env.VAL_TOWN_WEBHOOK_URL || '';

  await sendToValTown(
    {
      links,
      userId,
      username,
      channelId,
      channelName,
      messageContent,
      timestamp: new Date(),
      messageId,
    },
    webhookUrl
  );
}
