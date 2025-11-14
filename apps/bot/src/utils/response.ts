import type { DiscordEmbed, DiscordInteractionResponseData } from '../types/discord';

/**
 * Utility functions for building Discord response data
 */

export function createEmbed(
  title: string,
  description: string,
  color: number = 0x5865F2 // Discord blurple
): DiscordEmbed {
  return {
    title,
    description,
    color,
    timestamp: new Date().toISOString(),
  };
}

export function createErrorEmbed(message: string): DiscordInteractionResponseData {
  return {
    embeds: [createEmbed('❌ Error', message, 0xED4245)], // Discord red
  };
}

export function createSuccessEmbed(message: string): DiscordInteractionResponseData {
  return {
    embeds: [createEmbed('✅ Success', message, 0x57F287)], // Discord green
  };
}

export function createInfoEmbed(title: string, message: string): DiscordInteractionResponseData {
  return {
    embeds: [createEmbed(title, message, 0x5865F2)], // Discord blurple
  };
}

export function createWarningEmbed(message: string): DiscordInteractionResponseData {
  return {
    embeds: [createEmbed('⚠️ Warning', message, 0xFEE75C)], // Discord yellow
  };
}

/**
 * Truncates text to fit Discord's 2000 character limit
 */
export function truncateText(text: string, maxLength: number = 2000): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '....js';
}

/**
 * Splits long text into multiple messages
 */
export function splitText(text: string, maxLength: number = 2000): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Try to split at last newline before maxLength
    let splitIndex = remaining.lastIndexOf('\n', maxLength);

    // If no newline, try to split at last space
    if (splitIndex === -1) {
      splitIndex = remaining.lastIndexOf(' ', maxLength);
    }

    // If no space, just hard split
    if (splitIndex === -1) {
      splitIndex = maxLength;
    }

    chunks.push(remaining.substring(0, splitIndex));
    remaining = remaining.substring(splitIndex + 1);
  }

  return chunks;
}
