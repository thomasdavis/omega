/**
 * Add Shared Link Tool - Automatically saves Discord links with AI-generated topic tags
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getPostgresPool } from '@repo/database';
import { randomUUID } from 'crypto';

interface LinkMetadata {
  tags: string[];
  title?: string;
  description?: string;
  category?: string;
}

/**
 * Extract URLs from text using regex
 */
function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex) || [];
  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Use AI to generate topic tags and metadata for a URL
 */
async function generateLinkMetadata(url: string, messageContent: string): Promise<LinkMetadata> {
  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        tags: z.array(z.string()).min(1).max(10).describe('Relevant topic tags (e.g., "AI", "programming", "tutorial")'),
        title: z.string().optional().describe('Short title for the link'),
        description: z.string().optional().describe('Brief description of the content'),
        category: z.enum(['article', 'video', 'documentation', 'tool', 'tutorial', 'research', 'social', 'other']).describe('Content category'),
      }),
      prompt: `Analyze this URL and the message context to generate relevant metadata:

URL: ${url}
Message: ${messageContent}

Generate:
1. Topic tags (relevant keywords, technologies, concepts)
2. A short descriptive title
3. A brief description
4. Content category

Be specific and use lowercase for tags (e.g., "typescript", "react", "machine-learning").`,
    });

    return result.object;
  } catch (error) {
    console.error('❌ Failed to generate link metadata:', error);
    // Fallback: basic tags from URL domain
    const domain = new URL(url).hostname.replace('www.', '');
    return {
      tags: [domain, 'link'],
      category: 'other',
    };
  }
}

export const addSharedLinkTool = tool({
  description: `Save a link to the shared links collection with AI-generated topic tags.

Use this when:
- User shares a URL they want to save
- A message contains links worth bookmarking
- User explicitly asks to save/bookmark a link
- Links are posted in channels being monitored

The tool automatically:
- Extracts metadata from the URL
- Generates relevant topic tags using AI
- Categorizes the content type
- Stores with full context (user, channel, message)

Examples:
- "Save this link: https://example.com/article"
- "Bookmark the GitHub repo I just posted"
- "Add this to shared links"`,

  inputSchema: z.object({
    url: z.string().url().describe('The URL to save'),
    userId: z.string().describe('Discord user ID who shared the link'),
    username: z.string().describe('Discord username'),
    channelId: z.string().describe('Discord channel ID where link was shared'),
    channelName: z.string().describe('Discord channel name'),
    guildId: z.string().optional().describe('Discord guild/server ID'),
    messageId: z.string().describe('Discord message ID containing the link'),
    messageContent: z.string().describe('Full message content for context'),
    manualTags: z.array(z.string()).optional().describe('Optional manual tags to add'),
  }),

  execute: async ({
    url,
    userId,
    username,
    channelId,
    channelName,
    guildId,
    messageId,
    messageContent,
    manualTags = [],
  }) => {
    console.log(`🔗 [Add Shared Link] Saving URL: ${url}`);

    try {
      // Generate AI metadata
      const metadata = await generateLinkMetadata(url, messageContent);

      // Combine AI tags with manual tags
      const allTags = [...new Set([...metadata.tags, ...manualTags])];

      // Insert into database
      const pool = await getPostgresPool();
      const id = randomUUID();
      const now = Date.now();

      const sql = `
        INSERT INTO shared_links (
          id, url, title, description, tags,
          user_id, username, channel_id, channel_name, guild_id,
          message_id, message_content, metadata,
          is_archived, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5::jsonb,
          $6, $7, $8, $9, $10,
          $11, $12, $13::jsonb,
          $14, $15, $16
        )
        ON CONFLICT (id) DO NOTHING
        RETURNING id, url, title, tags
      `;

      const values = [
        id,
        url,
        metadata.title || null,
        metadata.description || null,
        JSON.stringify(allTags),
        userId,
        username,
        channelId,
        channelName,
        guildId || null,
        messageId,
        messageContent,
        JSON.stringify({ category: metadata.category }),
        false, // is_archived
        now,
        now,
      ];

      const result = await pool.query(sql, values);

      console.log(`✅ [Add Shared Link] Saved successfully with ${allTags.length} tags`);

      return {
        success: true,
        link: {
          id: result.rows[0]?.id || id,
          url,
          title: metadata.title,
          description: metadata.description,
          tags: allTags,
          category: metadata.category,
        },
        message: `Saved link with ${allTags.length} topic tags: ${allTags.slice(0, 5).join(', ')}${allTags.length > 5 ? '...' : ''}`,
      };
    } catch (error) {
      console.error(`❌ [Add Shared Link] Failed:`, error);
      return {
        success: false,
        error: 'SAVE_FAILED',
        message: `Failed to save link: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

/**
 * Helper function to extract and save all links from a message
 * Can be called from message handler
 */
export async function extractAndSaveLinks(
  messageContent: string,
  userId: string,
  username: string,
  channelId: string,
  channelName: string,
  messageId: string,
  guildId?: string
): Promise<{ savedCount: number; urls: string[] }> {
  const urls = extractUrls(messageContent);

  if (urls.length === 0) {
    return { savedCount: 0, urls: [] };
  }

  let savedCount = 0;

  for (const url of urls) {
    try {
      const result = await addSharedLinkTool.execute(
        {
          url,
          userId,
          username,
          channelId,
          channelName,
          guildId,
          messageId,
          messageContent,
        },
        {
          toolCallId: randomUUID(),
          messages: [],
        }
      );
      if (result.success) {
        savedCount++;
      }
    } catch (error) {
      console.error(`Failed to save URL ${url}:`, error);
    }
  }

  return { savedCount, urls };
}
