/**
 * Conversation to Slidev Tool - Converts Discord conversations to Slidev presentation format
 * Transforms chat history into engaging slide decks for presentations and retrospectives
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { Message } from 'discord.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Artifacts directory - use the same pattern as artifact.ts
const ARTIFACTS_DIR = process.env.NODE_ENV === 'production' && existsSync('/data/artifacts')
  ? '/data/artifacts'
  : join(__dirname, '../../../artifacts');

// Ensure artifacts directory exists
if (!existsSync(ARTIFACTS_DIR)) {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

// Extended message type with timestamp
interface SlidevMessage {
  username: string;
  content: string;
  timestamp: string;
  id: string;
}

// Artifact metadata interface
interface ArtifactMetadata {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  filename: string;
}

/**
 * Save Slidev artifact to filesystem and return metadata
 */
function saveSlidevArtifact(
  content: string,
  title: string,
  description: string
): ArtifactMetadata {
  const id = randomUUID();
  const filename = `${id}.md`;
  const filepath = join(ARTIFACTS_DIR, filename);

  // Save the Slidev markdown file
  writeFileSync(filepath, content, 'utf-8');

  // Save metadata
  const metadata: ArtifactMetadata = {
    id,
    type: 'slidev',
    title,
    description,
    createdAt: new Date().toISOString(),
    filename,
  };

  const metadataPath = join(ARTIFACTS_DIR, `${id}.json`);
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  return metadata;
}

// Store the current Discord message context (set by messageHandler)
let currentMessageContext: Message | null = null;

/**
 * Set the current message context for the Slidev tool
 * This should be called from the message handler before running the agent
 */
export function setSlidevMessageContext(message: Message) {
  currentMessageContext = message;
}

/**
 * Clear the message context after agent execution
 */
export function clearSlidevMessageContext() {
  currentMessageContext = null;
}

export const conversationToSlidevTool = tool({
  description: 'Convert Discord conversation history to Slidev presentation format. Creates engaging slide decks from chat logs with timestamps and usernames. Perfect for retrospectives, meeting summaries, or presenting conversation highlights. Automatically saves the presentation as an artifact and returns a shareable link along with the formatted Slidev Markdown.',
  inputSchema: z.object({
    limit: z.number().min(1).max(100).default(20).describe('Number of messages to include (1-100, default: 20)'),
    theme: z.enum(['default', 'seriph', 'apple-basic', 'shibainu']).default('default').describe('Slidev theme to use'),
    title: z.string().default('Discord Conversation').describe('Presentation title'),
    groupByUser: z.boolean().default(false).describe('Group consecutive messages from the same user into single slides'),
    messagesPerSlide: z.number().min(1).max(10).default(1).describe('Number of messages per slide (1-10, default: 1)'),
  }),
  execute: async ({ limit, theme, title, groupByUser, messagesPerSlide }) => {
    try {
      console.log(`🎨 Converting conversation to Slidev format (limit: ${limit})`);

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
          message: 'Cannot fetch messages from this type of channel.',
        };
      }

      // Fetch messages
      console.log(`📥 Fetching up to ${limit} messages from channel...`);
      const fetchedMessages = await channel.messages.fetch({
        limit,
        before: currentMessageContext.id
      });

      // Convert to array and sort by timestamp (oldest first)
      const messages: SlidevMessage[] = Array.from(fetchedMessages.values())
        .map(msg => ({
          username: msg.author.username,
          content: msg.content,
          timestamp: msg.createdAt.toISOString(),
          id: msg.id,
        }))
        .reverse();

      // Generate Slidev Markdown
      const slidevMarkdown = generateSlidevMarkdown(messages, {
        channelName: channel.isDMBased() ? 'Direct Message' : (channel as any).name,
        theme,
        title,
        groupByUser,
        messagesPerSlide,
      });

      console.log(`✅ Converted ${messages.length} messages to Slidev format`);

      // Save as artifact and generate shareable link
      const channelName = channel.isDMBased() ? 'Direct Message' : (channel as any).name;
      const description = `Slidev presentation with ${messages.length} messages from #${channelName}`;
      const metadata = saveSlidevArtifact(slidevMarkdown, title, description);

      // Get server URL from environment or use default
      const serverUrl = process.env.ARTIFACT_SERVER_URL
        || (process.env.NODE_ENV === 'production' ? 'https://omega-production-5b33.up.railway.app' : 'http://localhost:3001');
      const artifactUrl = `${serverUrl}/artifacts/${metadata.id}`;

      console.log(`📦 Saved artifact: ${artifactUrl}`);

      return {
        success: true,
        message: `Successfully converted ${messages.length} messages to Slidev presentation format and saved as artifact.`,
        slidevMarkdown,
        messageCount: messages.length,
        slideCount: countSlides(slidevMarkdown),
        theme,
        exportDate: new Date().toISOString(),
        artifactId: metadata.id,
        artifactUrl,
        downloadUrl: `${serverUrl}/artifacts/${metadata.id}`,
      };
    } catch (error) {
      console.error('❌ Error converting to Slidev:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Conversion failed',
        message: 'Failed to convert conversation to Slidev. Make sure the bot has permission to read message history.',
      };
    }
  },
});

/**
 * Count the number of slides in the generated Slidev markdown
 */
function countSlides(markdown: string): number {
  // Each slide is separated by ---
  const slides = markdown.split(/\n---\n/);
  return slides.length;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-NZ', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Escape special characters for Slidev
 */
function escapeContent(content: string): string {
  // Escape backticks and other special markdown characters
  return content
    .replace(/`/g, '\\`')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}');
}

/**
 * Generate Slidev Markdown from messages
 */
function generateSlidevMarkdown(
  messages: SlidevMessage[],
  options: {
    channelName: string;
    theme: string;
    title: string;
    groupByUser: boolean;
    messagesPerSlide: number;
  }
): string {
  const { channelName, theme, title, groupByUser, messagesPerSlide } = options;

  // Frontmatter configuration
  let markdown = `---
theme: ${theme}
background: https://source.unsplash.com/collection/94734566/1920x1080
class: text-center
highlighter: shiki
lineNumbers: false
info: |
  ## ${title}
  Discord conversation from #${channelName}

  Exported: ${new Date().toLocaleString('en-NZ')}
drawings:
  persist: false
transition: slide-left
title: ${title}
mdc: true
---

# ${title}

<div class="pt-12">
  <span class="px-2 py-1 rounded cursor-pointer" hover="bg-white bg-opacity-10">
    Discord Conversation from #${channelName}
  </span>
</div>

<div class="pt-12">
  <span class="text-sm opacity-50">
    ${messages.length} messages · Exported ${new Date().toLocaleDateString('en-NZ')}
  </span>
</div>

<div class="abs-br m-6 flex gap-2">
  <a href="https://github.com/slidevjs/slidev" target="_blank" alt="Slidev"
    class="text-xl slidev-icon-btn opacity-50 !border-none !hover:text-white">
    <carbon-logo-github />
  </a>
</div>

`;

  if (groupByUser) {
    // Group consecutive messages by user
    const groupedMessages: Array<{ username: string; messages: SlidevMessage[] }> = [];

    for (const msg of messages) {
      const lastGroup = groupedMessages[groupedMessages.length - 1];

      if (lastGroup && lastGroup.username === msg.username) {
        lastGroup.messages.push(msg);
      } else {
        groupedMessages.push({
          username: msg.username,
          messages: [msg],
        });
      }
    }

    // Create slides from grouped messages
    for (const group of groupedMessages) {
      markdown += `---\nlayout: quote\n---\n\n`;
      markdown += `# @${group.username}\n\n`;

      for (const msg of group.messages) {
        markdown += `<div class="text-left mb-4">\n\n`;
        markdown += `**${formatTimestamp(msg.timestamp)}**\n\n`;
        markdown += `${escapeContent(msg.content)}\n\n`;
        markdown += `</div>\n\n`;
      }
    }
  } else {
    // Create slides with messagesPerSlide messages each
    for (let i = 0; i < messages.length; i += messagesPerSlide) {
      const slideMessages = messages.slice(i, i + messagesPerSlide);

      markdown += `---\nlayout: default\n---\n\n`;

      for (const msg of slideMessages) {
        markdown += `# @${msg.username}\n\n`;
        markdown += `<div class="text-sm opacity-70 mb-2">\n${formatTimestamp(msg.timestamp)}\n</div>\n\n`;

        // Handle message content - wrap in quote style
        const content = escapeContent(msg.content);
        if (content.length > 200) {
          // Long messages get smaller text
          markdown += `<div class="text-base leading-relaxed">\n\n${content}\n\n</div>\n\n`;
        } else {
          markdown += `<div class="text-xl leading-relaxed">\n\n${content}\n\n</div>\n\n`;
        }

        if (slideMessages.length > 1 && msg !== slideMessages[slideMessages.length - 1]) {
          markdown += `<div class="h-px bg-gray-300 my-4"></div>\n\n`;
        }
      }
    }
  }

  // Add final slide
  markdown += `---
layout: end
class: text-center
---

# Thank You!

<div class="pt-12">
  <span class="text-sm opacity-50">
    Generated by Omega Discord Bot
  </span>
</div>
`;

  return markdown;
}
