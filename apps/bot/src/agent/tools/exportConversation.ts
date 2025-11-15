/**
 * Export Conversation Tool - Downloads Discord conversation history as Markdown
 * Allows users to archive and share conversation history with filtering options
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { Message } from 'discord.js';

// Extended message type with timestamp
interface ExportMessage {
  username: string;
  content: string;
  timestamp: string;
  id: string;
}

// Store the current Discord message context (set by messageHandler)
let currentMessageContext: Message | null = null;

/**
 * Set the current message context for the export tool
 * This should be called from the message handler before running the agent
 */
export function setExportMessageContext(message: Message) {
  currentMessageContext = message;
}

/**
 * Clear the message context after agent execution
 */
export function clearExportMessageContext() {
  currentMessageContext = null;
}

export const exportConversationTool = tool({
  description: 'Export Discord conversation history as Markdown. Captures messages with timestamps, usernames, and content. Supports filtering by date range or specific users. Use this when users want to download, archive, or save conversation history.',
  parameters: z.object({
    limit: z.number().min(1).max(100).default(50).describe('Number of messages to export (1-100, default: 50)'),
    username: z.string().optional().describe('Optional: Filter messages by specific username'),
    beforeDate: z.string().optional().describe('Optional: Only include messages before this date (ISO 8601 format)'),
    afterDate: z.string().optional().describe('Optional: Only include messages after this date (ISO 8601 format)'),
  }),
  execute: async ({ limit, username, beforeDate, afterDate }) => {
    try {
      console.log(`📝 Exporting conversation history (limit: ${limit})`);

      if (!currentMessageContext) {
        return {
          success: false,
          error: 'no_context',
          message: 'Unable to access Discord channel context. This feature requires active message context.',
        };
      }

      const channel = currentMessageContext.channel;

      // Check if we can fetch messages from this channel
      if (!('messages' in channel)) {
        return {
          success: false,
          error: 'unsupported_channel',
          message: 'Cannot export messages from this type of channel.',
        };
      }

      // Fetch messages
      console.log(`📥 Fetching up to ${limit} messages from channel...`);
      const fetchedMessages = await channel.messages.fetch({
        limit,
        before: currentMessageContext.id
      });

      // Convert to array and sort by timestamp (oldest first)
      let messages: ExportMessage[] = Array.from(fetchedMessages.values())
        .map(msg => ({
          username: msg.author.username,
          content: msg.content,
          timestamp: msg.createdAt.toISOString(),
          id: msg.id,
        }))
        .reverse();

      // Apply filters
      if (username) {
        messages = messages.filter(msg =>
          msg.username.toLowerCase().includes(username.toLowerCase())
        );
      }

      if (beforeDate) {
        const before = new Date(beforeDate);
        messages = messages.filter(msg => new Date(msg.timestamp) < before);
      }

      if (afterDate) {
        const after = new Date(afterDate);
        messages = messages.filter(msg => new Date(msg.timestamp) > after);
      }

      // Generate Markdown
      const markdown = generateMarkdown(messages, {
        channelName: channel.isDMBased() ? 'Direct Message' : (channel as any).name,
        limit,
        username,
        beforeDate,
        afterDate,
      });

      console.log(`✅ Exported ${messages.length} messages as Markdown`);

      return {
        success: true,
        message: `Successfully exported ${messages.length} messages as Markdown.`,
        markdown,
        messageCount: messages.length,
        exportDate: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Error exporting conversation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
        message: 'Failed to export conversation history. Make sure the bot has permission to read message history.',
      };
    }
  },
});

/**
 * Generate formatted Markdown from messages
 */
function generateMarkdown(
  messages: ExportMessage[],
  options: {
    channelName: string;
    limit: number;
    username?: string;
    beforeDate?: string;
    afterDate?: string;
  }
): string {
  const filters = [];
  if (options.username) filters.push(`User: ${options.username}`);
  if (options.beforeDate) filters.push(`Before: ${options.beforeDate}`);
  if (options.afterDate) filters.push(`After: ${options.afterDate}`);

  const filterText = filters.length > 0 ? `\n- Filters: ${filters.join(', ')}` : '';

  let markdown = `# Discord Conversation Export

**Channel:** #${options.channelName}
**Export Settings:**
- Message Limit: ${options.limit}
- Messages Exported: ${messages.length}${filterText}
- Export Date: ${new Date().toISOString()}

---

## Messages

`;

  // Add each message
  for (const msg of messages) {
    const timestamp = new Date(msg.timestamp).toLocaleString('en-NZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    markdown += `### [${timestamp}] @${msg.username}\n`;

    // Preserve message content formatting
    // Escape any markdown that might break the structure
    const content = msg.content || '_No text content_';
    markdown += `${content}\n\n`;
  }

  markdown += `---

*Exported by Omega Discord Bot*
`;

  return markdown;
}
