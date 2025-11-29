/**
 * Discord Message Search Service
 * Searches Discord channels for messages related to GitHub issues/PRs
 */

import { Client, TextChannel, Collection, Message } from 'discord.js';

interface DiscordSearchResult {
  username: string;
  content: string;
  timestamp: Date;
  channelName: string;
}

/**
 * Extract keywords from GitHub issue/PR content
 */
export function extractKeywords(title: string, body: string): string[] {
  const text = `${title} ${body}`.toLowerCase();

  // Remove common words and extract meaningful keywords
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'can', 'may', 'might', 'must', 'this', 'that', 'these', 'those',
    'it', 'its', 'i', 'you', 'he', 'she', 'we', 'they', 'them', 'their',
  ]);

  // Extract words (3+ characters, alphanumeric)
  const words = text
    .match(/\b[a-z0-9]{3,}\b/g) || [];

  // Filter out common words and get unique keywords
  const keywords = [...new Set(words)]
    .filter(word => !commonWords.has(word))
    .slice(0, 10); // Limit to top 10 keywords

  return keywords;
}

/**
 * Search Discord channels for messages containing keywords
 */
export async function searchDiscordMessages(
  client: Client,
  keywords: string[],
  options: {
    channelIds?: string[];
    guildId?: string;
    maxMessages?: number;
    daysBack?: number;
  } = {}
): Promise<DiscordSearchResult[]> {
  const {
    channelIds,
    guildId,
    maxMessages = 100,
    daysBack = 30,
  } = options;

  const results: DiscordSearchResult[] = [];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  try {
    // Get channels to search
    const channelsToSearch: TextChannel[] = [];

    if (channelIds && channelIds.length > 0) {
      // Search specific channels
      for (const channelId of channelIds) {
        try {
          const channel = await client.channels.fetch(channelId);
          if (channel?.isTextBased() && !channel.isDMBased()) {
            channelsToSearch.push(channel as TextChannel);
          }
        } catch (error) {
          console.warn(`Could not fetch channel ${channelId}:`, error);
        }
      }
    } else if (guildId) {
      // Search all text channels in the guild
      try {
        const guild = await client.guilds.fetch(guildId);
        const channels = await guild.channels.fetch();

        channels.forEach(channel => {
          if (channel?.isTextBased() && !channel.isDMBased()) {
            channelsToSearch.push(channel as TextChannel);
          }
        });
      } catch (error) {
        console.warn(`Could not fetch guild ${guildId}:`, error);
      }
    }

    console.log(`🔍 Searching ${channelsToSearch.length} channels for keywords: ${keywords.join(', ')}`);

    // Search each channel for messages containing keywords
    for (const channel of channelsToSearch) {
      try {
        let fetchedMessages: Collection<string, Message> | undefined;
        let lastMessageId: string | undefined;
        let totalFetched = 0;

        // Fetch messages in batches (Discord limit is 100 per request)
        while (totalFetched < maxMessages) {
          const fetchLimit = Math.min(100, maxMessages - totalFetched);

          const options: { limit: number; before?: string } = { limit: fetchLimit };
          if (lastMessageId) {
            options.before = lastMessageId;
          }

          fetchedMessages = await channel.messages.fetch(options);

          if (fetchedMessages.size === 0) {
            break; // No more messages
          }

          // Check each message for keyword matches
          for (const [, message] of fetchedMessages) {
            // Skip if message is too old
            if (message.createdAt < cutoffDate) {
              continue;
            }

            // Skip bot messages
            if (message.author.bot) {
              continue;
            }

            // Check if message contains any of the keywords
            const lowerContent = message.content.toLowerCase();
            const hasKeyword = keywords.some(keyword =>
              lowerContent.includes(keyword.toLowerCase())
            );

            if (hasKeyword) {
              results.push({
                username: message.author.username,
                content: message.content,
                timestamp: message.createdAt,
                channelName: channel.name,
              });
            }
          }

          totalFetched += fetchedMessages.size;
          lastMessageId = fetchedMessages.last()?.id;

          // If we fetched less than requested, we've reached the end
          if (fetchedMessages.size < fetchLimit) {
            break;
          }
        }
      } catch (error) {
        console.warn(`Error searching channel ${channel.name}:`, error);
      }
    }

    // Sort by timestamp (most recent first)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    console.log(`✅ Found ${results.length} relevant Discord messages`);

    return results;
  } catch (error) {
    console.error('Error searching Discord messages:', error);
    return [];
  }
}

/**
 * Format Discord search results for comic generation context
 */
export function formatDiscordResults(results: DiscordSearchResult[]): string {
  if (results.length === 0) {
    return '';
  }

  const parts: string[] = [
    '',
    `Discord Conversations (${results.length} messages):`,
  ];

  // Group messages by user to show diverse perspectives
  const messagesByUser = new Map<string, DiscordSearchResult[]>();

  for (const result of results) {
    if (!messagesByUser.has(result.username)) {
      messagesByUser.set(result.username, []);
    }
    messagesByUser.get(result.username)!.push(result);
  }

  // Include up to 3 messages per user to show diversity
  for (const [username, messages] of messagesByUser) {
    const messagesToInclude = messages.slice(0, 3);
    for (const msg of messagesToInclude) {
      // Include more content (up to 500 chars instead of 200)
      const content = msg.content.length > 500
        ? msg.content.substring(0, 500) + '...'
        : msg.content;

      parts.push(`- ${username} (in #${msg.channelName}): ${content}`);
    }
  }

  return parts.join('\n');
}
