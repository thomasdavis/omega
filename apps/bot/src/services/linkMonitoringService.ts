/**
 * Link Monitoring Service - Automatically extracts and saves links from Discord messages
 */

import { extractAndSaveLinks } from '@repo/agent/tools/addSharedLink';

/**
 * Channels to monitor for link collection
 * Can be configured via environment variable or defaults
 */
const MONITORED_CHANNELS = process.env.LINK_MONITOR_CHANNELS?.split(',') || [
  // Add default channels here, or leave empty to monitor all channels
];

/**
 * Whether to monitor all channels (when MONITORED_CHANNELS is empty)
 */
const MONITOR_ALL_CHANNELS = MONITORED_CHANNELS.length === 0;

/**
 * Extract URLs from text using regex
 */
function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex) || [];
  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Check if a channel should be monitored for links
 */
function shouldMonitorChannel(channelId: string, channelName: string): boolean {
  if (MONITOR_ALL_CHANNELS) {
    return true;
  }

  return MONITORED_CHANNELS.some(pattern => {
    // Support both channel ID and channel name patterns
    return channelId === pattern || channelName.includes(pattern);
  });
}

/**
 * Monitor a message for links and automatically save them
 *
 * @param messageContent - The message text content
 * @param userId - Discord user ID
 * @param username - Discord username
 * @param channelId - Discord channel ID
 * @param channelName - Discord channel name
 * @param messageId - Discord message ID
 * @param guildId - Discord guild/server ID (optional)
 * @returns Object with savedCount and urls
 */
export async function monitorMessageForLinks(
  messageContent: string,
  userId: string,
  username: string,
  channelId: string,
  channelName: string,
  messageId: string,
  guildId?: string
): Promise<{ savedCount: number; urls: string[] }> {
  try {
    // Check if this channel should be monitored
    if (!shouldMonitorChannel(channelId, channelName)) {
      return { savedCount: 0, urls: [] };
    }

    // Extract URLs from message
    const urls = extractUrls(messageContent);

    if (urls.length === 0) {
      return { savedCount: 0, urls: [] };
    }

    console.log(`🔗 [Link Monitor] Found ${urls.length} link(s) in message from ${username} in #${channelName}`);

    // Use the extractAndSaveLinks helper from the tool
    const result = await extractAndSaveLinks(
      messageContent,
      userId,
      username,
      channelId,
      channelName,
      messageId,
      guildId
    );

    if (result.savedCount > 0) {
      console.log(`✅ [Link Monitor] Saved ${result.savedCount} link(s) to shared collection`);
    }

    return result;
  } catch (error) {
    console.error(`❌ [Link Monitor] Failed to process links:`, error);
    return { savedCount: 0, urls: [] };
  }
}

/**
 * Get the list of monitored channels (for debugging/info)
 */
export function getMonitoredChannels(): { monitorAll: boolean; channels: string[] } {
  return {
    monitorAll: MONITOR_ALL_CHANNELS,
    channels: MONITORED_CHANNELS,
  };
}
