/**
 * Discord Message Adapter
 *
 * Unified utility for sending Discord messages with intelligent handling of:
 * - Character limits (2000 for messages, 4096 for embeds)
 * - Smart JSON chunking (preserves object boundaries)
 * - Code block preservation
 * - Embed building with spoiler tags
 * - Color coding for success/failure
 *
 * Best practices:
 * - Embeds for structure and higher char limits
 * - Spoiler tags to hide verbose debugging info
 * - Smart chunking to never break JSON syntax
 * - Type-safe with full TypeScript support
 */

import { EmbedBuilder, Colors, type TextBasedChannel, type ColorResolvable } from 'discord.js';

// Character limits (with safety margins)
const MESSAGE_CHAR_LIMIT = 1990; // Discord limit: 2000
const EMBED_DESCRIPTION_LIMIT = 4000; // Discord limit: 4096
const EMBED_FIELD_LIMIT = 1000; // Discord limit: 1024
const EMBED_TOTAL_LIMIT = 5900; // Discord limit: 6000

/**
 * Options for chunking text
 */
export interface ChunkOptions {
  maxLength: number;
  preserveCodeBlocks?: boolean;
  addContinuationMarkers?: boolean;
}

/**
 * Tool call information for formatting
 */
export interface ToolCallInfo {
  toolName: string;
  args?: any;
  result?: any;
  success?: boolean;
  duration?: number;
  jobId?: string;
  index?: number;
  total?: number;
}

/**
 * Options for sending messages
 */
export interface SendOptions {
  useEmbed?: boolean;
  useSpoilers?: boolean;
  color?: ColorResolvable;
}

/**
 * Discord Message Adapter - Handles all message sending operations
 */
export class DiscordMessageAdapter {
  /**
   * Chunk text intelligently, respecting line boundaries
   */
  chunkText(text: string, options: ChunkOptions): string[] {
    const { maxLength, addContinuationMarkers = true } = options;

    // If text fits, return as-is
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    let currentChunk = '';
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineWithNewline = line + '\n';

      // Check if adding this line would exceed limit
      const wouldExceed = (currentChunk + lineWithNewline).length > maxLength;

      if (wouldExceed && currentChunk.length > 0) {
        // Save current chunk
        let chunkToSave = currentChunk.trim();
        if (addContinuationMarkers && chunks.length > 0) {
          chunkToSave = '...continued\n\n' + chunkToSave;
        }
        if (addContinuationMarkers && i < lines.length - 1) {
          chunkToSave = chunkToSave + '\n\n...';
        }
        chunks.push(chunkToSave);
        currentChunk = '';
      }

      // Handle single line exceeding limit
      if (line.length > maxLength) {
        // Split the line itself
        const words = line.split(' ');
        let tempLine = '';

        for (const word of words) {
          if ((tempLine + ' ' + word).length > maxLength) {
            if (tempLine) {
              chunks.push(tempLine.trim());
              tempLine = '';
            }
            // If single word is too long, force split it
            if (word.length > maxLength) {
              chunks.push(word.substring(0, maxLength));
              tempLine = word.substring(maxLength);
            } else {
              tempLine = word;
            }
          } else {
            tempLine += (tempLine ? ' ' : '') + word;
          }
        }

        if (tempLine) {
          currentChunk = tempLine + '\n';
        }
      } else {
        currentChunk += lineWithNewline;
      }
    }

    // Add remaining chunk
    if (currentChunk.length > 0) {
      let chunkToSave = currentChunk.trim();
      if (addContinuationMarkers && chunks.length > 0) {
        chunkToSave = '...continued\n\n' + chunkToSave;
      }
      chunks.push(chunkToSave);
    }

    return chunks;
  }

  /**
   * Chunk JSON intelligently, preserving object boundaries
   */
  chunkJSON(json: any, maxChars: number = EMBED_FIELD_LIMIT): string[] {
    const jsonString = JSON.stringify(json, null, 2);

    // If fits in one chunk, return as-is
    if (jsonString.length <= maxChars) {
      return [jsonString];
    }

    const chunks: string[] = [];

    // If it's an object, split by top-level keys
    if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
      let currentChunk: any = {};

      for (const [key, value] of Object.entries(json)) {
        const tentativeChunk = { ...currentChunk, [key]: value };
        const serialized = JSON.stringify(tentativeChunk, null, 2);

        if (serialized.length > maxChars && Object.keys(currentChunk).length > 0) {
          // Current chunk is full, save it and start new one
          chunks.push(JSON.stringify(currentChunk, null, 2));
          currentChunk = { [key]: value };
        } else {
          currentChunk[key] = value;
        }
      }

      // Add remaining chunk
      if (Object.keys(currentChunk).length > 0) {
        chunks.push(JSON.stringify(currentChunk, null, 2));
      }
    }
    // If it's an array, split by elements
    else if (Array.isArray(json)) {
      let currentChunk: any[] = [];

      for (const item of json) {
        const tentativeChunk = [...currentChunk, item];
        const serialized = JSON.stringify(tentativeChunk, null, 2);

        if (serialized.length > maxChars && currentChunk.length > 0) {
          // Current chunk is full, save it and start new one
          chunks.push(JSON.stringify(currentChunk, null, 2));
          currentChunk = [item];
        } else {
          currentChunk.push(item);
        }
      }

      // Add remaining chunk
      if (currentChunk.length > 0) {
        chunks.push(JSON.stringify(currentChunk, null, 2));
      }
    }
    // Fallback: primitive or string, use text chunking
    else {
      return this.chunkText(jsonString, { maxLength: maxChars, addContinuationMarkers: true });
    }

    return chunks;
  }

  /**
   * Wrap content in spoiler tags
   */
  wrapInSpoilers(content: string): string {
    return `||${content}||`;
  }

  /**
   * Suppress Discord embeds by wrapping URLs in <>
   */
  suppressEmbeds(text: string): string {
    return text.replace(/(https?:\/\/[^\s<>]+)/g, '<$1>');
  }

  /**
   * Truncate text with ellipsis
   */
  truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Format JSON content with code blocks
   */
  formatJSON(json: any, maxLength: number = EMBED_FIELD_LIMIT): string {
    if (json === null || json === undefined) {
      return '`null`';
    }

    const jsonString = typeof json === 'string'
      ? json
      : JSON.stringify(json, null, 2);

    // If it fits, return with code block
    if (jsonString.length + 10 <= maxLength) { // +10 for ```json\n and \n```
      return '```json\n' + jsonString + '\n```';
    }

    // If too long, chunk it
    const chunks = this.chunkJSON(typeof json === 'string' ? JSON.parse(json) : json, maxLength - 10);

    // Return first chunk with indicator
    const firstChunk = chunks[0];
    const indicator = chunks.length > 1 ? '\n... (truncated)' : '';
    return '```json\n' + firstChunk + indicator + '\n```';
  }

  /**
   * Format text content with code blocks
   */
  formatText(text: string, maxLength: number = EMBED_FIELD_LIMIT): string {
    // Suppress URLs to prevent embeds
    const cleanText = this.suppressEmbeds(text);

    // If it fits, return with code block
    if (cleanText.length + 8 <= maxLength) { // +8 for ```\n and \n```
      return '```\n' + cleanText + '\n```';
    }

    // If too long, truncate
    const availableSpace = maxLength - 20; // -20 for code blocks and ellipsis
    return '```\n' + this.truncate(cleanText, availableSpace) + '\n```';
  }

  /**
   * Build an embed for a tool call result
   */
  buildToolEmbed(toolCall: ToolCallInfo, options: SendOptions = {}): EmbedBuilder {
    const {
      toolName,
      args,
      result,
      success = true,
      duration,
      jobId,
      index,
      total
    } = toolCall;

    const { useSpoilers = true, color } = options;

    // Determine color
    let embedColor: ColorResolvable = Colors.Blue;
    if (color) {
      embedColor = color;
    } else if (success !== undefined) {
      embedColor = success ? Colors.Green : Colors.Red;
    }

    // Build title
    const toolTitle = index && total
      ? `🔧 ${index}/${total}: ${toolName}`
      : `🔧 ${toolName}`;

    // Build description (status line)
    const statusEmoji = success ? '✅' : '❌';
    const statusText = success ? 'Success' : 'Failed';
    const durationText = duration ? ` • ${duration.toFixed(2)}s` : '';
    const description = `${statusEmoji} ${statusText}${durationText}`;

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(toolTitle)
      .setDescription(description)
      .setTimestamp();

    // Add arguments field if present
    if (args && Object.keys(args).length > 0) {
      let argsContent = this.formatJSON(args, EMBED_FIELD_LIMIT - 50); // -50 for spoiler tags and field name

      if (useSpoilers) {
        argsContent = this.wrapInSpoilers(argsContent);
      }

      embed.addFields({
        name: '📥 Arguments',
        value: argsContent,
        inline: false
      });
    }

    // Add result field if present
    if (result !== undefined && result !== null) {
      let resultContent: string;

      // Format based on result type
      if (typeof result === 'object') {
        resultContent = this.formatJSON(result, EMBED_FIELD_LIMIT - 50);
      } else if (typeof result === 'string') {
        resultContent = this.formatText(result, EMBED_FIELD_LIMIT - 50);
      } else {
        resultContent = '`' + String(result) + '`';
      }

      if (useSpoilers) {
        resultContent = this.wrapInSpoilers(resultContent);
      }

      embed.addFields({
        name: '📤 Result',
        value: resultContent,
        inline: false
      });
    }

    // Add footer with job ID if present
    if (jobId) {
      const footerText = index && total
        ? `Tool ${index} of ${total} • Job: ${jobId}`
        : `Job: ${jobId}`;
      embed.setFooter({ text: footerText });
    } else if (index && total) {
      embed.setFooter({ text: `Tool ${index} of ${total}` });
    }

    return embed;
  }

  /**
   * Send a message with automatic chunking if needed
   */
  async sendMessage(
    channel: TextBasedChannel,
    content: string,
    options: SendOptions = {}
  ): Promise<void> {
    // Type guard: ensure channel has send method
    if (!('send' in channel)) {
      console.error('Channel does not support sending messages');
      return;
    }

    const { useEmbed = false } = options;

    if (useEmbed) {
      // Send as embed
      const embed = new EmbedBuilder()
        .setDescription(content)
        .setColor(options.color || Colors.Blue)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } else {
      // Send as regular message with chunking
      if (content.length <= MESSAGE_CHAR_LIMIT) {
        await channel.send({ content });
      } else {
        // Chunk and send multiple messages
        const chunks = this.chunkText(content, {
          maxLength: MESSAGE_CHAR_LIMIT,
          addContinuationMarkers: true
        });

        for (const chunk of chunks) {
          await channel.send({ content: chunk });
        }
      }
    }
  }

  /**
   * Send tool reports as embeds
   */
  async sendToolReports(
    channel: TextBasedChannel,
    toolCalls: ToolCallInfo[],
    options: SendOptions = {}
  ): Promise<void> {
    // Type guard: ensure channel has send method
    if (!('send' in channel)) {
      console.error('Channel does not support sending messages');
      return;
    }

    const total = toolCalls.length;

    for (let i = 0; i < toolCalls.length; i++) {
      const toolCall = {
        ...toolCalls[i],
        index: i + 1,
        total: total
      };

      const embed = this.buildToolEmbed(toolCall, options);

      try {
        await channel.send({ embeds: [embed] });
      } catch (error) {
        console.error(`Failed to send tool report embed for ${toolCall.toolName}:`, error);

        // Fallback: send as text
        const fallbackContent = this.formatToolReportAsText(toolCall, options);
        await this.sendMessage(channel, fallbackContent, { useEmbed: false });
      }
    }
  }

  /**
   * Format tool report as text (fallback)
   */
  private formatToolReportAsText(toolCall: ToolCallInfo, options: SendOptions = {}): string {
    const { toolName, args, result, success, duration, jobId, index, total } = toolCall;
    const { useSpoilers = true } = options;

    let content = '';

    // Header
    if (index && total) {
      content += `**🔧 Tool ${index}/${total}: ${toolName}**\n`;
    } else {
      content += `**🔧 ${toolName}**\n`;
    }

    // Status
    const statusEmoji = success ? '✅' : '❌';
    const statusText = success ? 'Success' : 'Failed';
    const durationText = duration ? ` • ${duration.toFixed(2)}s` : '';
    content += `${statusEmoji} ${statusText}${durationText}\n\n`;

    // Arguments
    if (args && Object.keys(args).length > 0) {
      let argsContent = '📥 **Arguments:**\n' + this.formatJSON(args, MESSAGE_CHAR_LIMIT - 100);
      if (useSpoilers) {
        argsContent = this.wrapInSpoilers(argsContent);
      }
      content += argsContent + '\n\n';
    }

    // Result
    if (result !== undefined && result !== null) {
      let resultContent: string;

      if (typeof result === 'object') {
        resultContent = '📤 **Result:**\n' + this.formatJSON(result, MESSAGE_CHAR_LIMIT - 100);
      } else if (typeof result === 'string') {
        resultContent = '📤 **Result:**\n' + this.formatText(result, MESSAGE_CHAR_LIMIT - 100);
      } else {
        resultContent = '📤 **Result:**\n`' + String(result) + '`';
      }

      if (useSpoilers) {
        resultContent = this.wrapInSpoilers(resultContent);
      }

      content += resultContent;
    }

    // Footer
    if (jobId) {
      content += `\n\n_Job: ${jobId}_`;
    }

    return content;
  }
}

/**
 * Singleton instance for easy import
 */
export const messageAdapter = new DiscordMessageAdapter();
