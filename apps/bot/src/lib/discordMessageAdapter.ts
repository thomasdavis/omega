/**
 * Discord Message Adapter
 *
 * Centralized adapter for sending messages to Discord with automatic chunking,
 * code fence preservation, rate limit handling, and retry logic.
 *
 * Features:
 * - Automatically chunks messages longer than 2000 characters
 * - Preserves code fences (triple backticks) across chunks
 * - Splits at newline/word boundaries when possible
 * - Adds continuation markers (e.g., "1/3")
 * - Handles Discord rate limits with exponential backoff
 * - Logs all operations for debugging
 */

import type { TextBasedChannel, MessageCreateOptions, Message } from 'discord.js';
import { logError } from '../utils/errorLogger.js';

export interface SendMessageOptions {
  /**
   * Maximum chunk size in characters (default: 1900 to leave room for markers)
   */
  maxChunkSize?: number;

  /**
   * Whether to add continuation markers like "(1/3)" to each chunk
   */
  addContinuationMarkers?: boolean;

  /**
   * Maximum number of retry attempts for rate limiting
   */
  maxRetries?: number;

  /**
   * Initial backoff delay in milliseconds for retries
   */
  initialBackoffMs?: number;

  /**
   * Additional Discord.js message options (files, embeds, etc.)
   */
  discordOptions?: Omit<MessageCreateOptions, 'content'>;
}

export interface SendMessageResult {
  success: boolean;
  messages: Message[];
  chunks: string[];
  metadata: {
    originalLength: number;
    chunkCount: number;
    channelId: string;
    messageIds: string[];
    timeTaken: number;
    retries: number;
  };
  error?: string;
}

interface CodeFence {
  start: number;
  end: number;
  language: string;
}

/**
 * Find all code fence pairs in the content
 */
function findCodeFences(content: string): CodeFence[] {
  const fences: CodeFence[] = [];
  const fenceRegex = /```(\w*)\n/g;
  let match;
  const openFences: Array<{ index: number; language: string }> = [];

  // Find all fence markers
  while ((match = fenceRegex.exec(content)) !== null) {
    const language = match[1] || '';
    const index = match.index;

    if (openFences.length > 0) {
      // This is a closing fence
      const openFence = openFences.pop()!;
      fences.push({
        start: openFence.index,
        end: index + match[0].length,
        language: openFence.language,
      });
    } else {
      // This is an opening fence
      openFences.push({ index, language });
    }
  }

  // If there are unclosed fences, log a warning
  if (openFences.length > 0) {
    console.warn(`⚠️ Found ${openFences.length} unclosed code fence(s) in message`);
  }

  return fences;
}

/**
 * Check if a position is inside a code fence
 */
function isInsideCodeFence(position: number, fences: CodeFence[]): CodeFence | null {
  for (const fence of fences) {
    if (position >= fence.start && position < fence.end) {
      return fence;
    }
  }
  return null;
}

/**
 * Find the best split position in the content, preferring newlines and word boundaries
 */
function findBestSplitPosition(content: string, maxLength: number, fences: CodeFence[]): number {
  // Don't split if content fits
  if (content.length <= maxLength) {
    return content.length;
  }

  // Start looking for split point from maxLength backwards
  let splitPos = maxLength;

  // First, try to find a newline
  for (let i = splitPos; i > maxLength * 0.7; i--) {
    if (content[i] === '\n' && !isInsideCodeFence(i, fences)) {
      return i + 1; // Include the newline in the chunk
    }
  }

  // Next, try to find a space (word boundary)
  for (let i = splitPos; i > maxLength * 0.7; i--) {
    if (content[i] === ' ' && !isInsideCodeFence(i, fences)) {
      return i + 1; // Include the space
    }
  }

  // If we can't find a good split point, check if we're inside a code fence
  const fenceAtSplit = isInsideCodeFence(splitPos, fences);
  if (fenceAtSplit) {
    // If we're inside a code fence, split at the start of the fence
    console.warn('⚠️ Forced to split inside code fence, splitting at fence boundary');
    return fenceAtSplit.start;
  }

  // Last resort: force split at maxLength
  console.warn('⚠️ Could not find good split position, forcing split at maxLength');
  return splitPos;
}

/**
 * Split content into chunks while preserving code fences
 */
function splitIntoChunks(content: string, maxChunkSize: number): string[] {
  if (content.length <= maxChunkSize) {
    return [content];
  }

  const chunks: string[] = [];
  let remaining = content;
  const fences = findCodeFences(content);
  let processedLength = 0;

  while (remaining.length > 0) {
    // Adjust fences for current position
    const adjustedFences = fences
      .filter(f => f.start >= processedLength)
      .map(f => ({
        start: f.start - processedLength,
        end: f.end - processedLength,
        language: f.language,
      }));

    // Find best split position
    const splitPos = findBestSplitPosition(remaining, maxChunkSize, adjustedFences);
    let chunk = remaining.substring(0, splitPos);

    // Check if we're splitting a code fence
    const fenceAtEnd = adjustedFences.find(f => splitPos > f.start && splitPos < f.end);
    if (fenceAtEnd) {
      // Close the fence at the end of this chunk
      chunk += '\n```';
    }

    chunks.push(chunk);
    remaining = remaining.substring(splitPos);
    processedLength += splitPos;

    // If next chunk starts inside a code fence, open it
    if (remaining.length > 0 && fenceAtEnd) {
      const language = fenceAtEnd.language;
      remaining = '```' + language + '\n' + remaining;
      // Adjust processed length to account for added fence
      processedLength -= ('```' + language + '\n').length;
    }
  }

  return chunks;
}

/**
 * Add continuation markers to chunks
 */
function addContinuationMarkers(chunks: string[]): string[] {
  if (chunks.length <= 1) {
    return chunks;
  }

  return chunks.map((chunk, index) => {
    const marker = `**(${index + 1}/${chunks.length})**\n`;
    return marker + chunk;
  });
}

/**
 * Send a message with retry logic for rate limiting
 */
async function sendWithRetry(
  channel: TextBasedChannel,
  content: string,
  options: MessageCreateOptions,
  maxRetries: number,
  initialBackoffMs: number,
  retryCount: { value: number }
): Promise<Message> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const message = await channel.send({ ...options, content });
      return message;
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error (429)
      if (error?.code === 429 || error?.status === 429) {
        retryCount.value++;
        const retryAfter = error?.retry_after || Math.pow(2, attempt) * initialBackoffMs;

        console.log(`⏳ Rate limited, retrying after ${retryAfter}ms (attempt ${attempt + 1}/${maxRetries})`);

        await new Promise(resolve => setTimeout(resolve, retryAfter));
      } else {
        // Non-rate-limit error, don't retry
        throw error;
      }
    }
  }

  // All retries exhausted
  throw new Error(`Failed to send message after ${maxRetries} retries: ${lastError?.message}`);
}

/**
 * Send a message to a Discord channel with automatic chunking and error handling
 *
 * @param channel - The Discord channel to send the message to
 * @param content - The message content to send
 * @param options - Optional configuration for chunking and retry behavior
 * @returns SendMessageResult with success status, sent messages, and metadata
 */
export async function sendMessage(
  channel: TextBasedChannel,
  content: string,
  options: SendMessageOptions = {}
): Promise<SendMessageResult> {
  const startTime = Date.now();
  const {
    maxChunkSize = 1900,
    addContinuationMarkers: shouldAddMarkers = true,
    maxRetries = 3,
    initialBackoffMs = 1000,
    discordOptions = {},
  } = options;

  const retryCount = { value: 0 };
  const sentMessages: Message[] = [];
  let chunks: string[] = [];

  try {
    // Split content into chunks
    chunks = splitIntoChunks(content, maxChunkSize);

    // Add continuation markers if needed
    if (shouldAddMarkers && chunks.length > 1) {
      chunks = addContinuationMarkers(chunks);
    }

    // Log chunking info
    if (chunks.length > 1) {
      console.log(`📦 Split message into ${chunks.length} chunks (original: ${content.length} chars)`);
    }

    // Send each chunk with retry logic
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Only attach files/embeds to the first message
      const messageOptions: MessageCreateOptions = i === 0 ? discordOptions : {};

      const message = await sendWithRetry(
        channel,
        chunk,
        messageOptions,
        maxRetries,
        initialBackoffMs,
        retryCount
      );

      sentMessages.push(message);

      // Small delay between chunks to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const timeTaken = Date.now() - startTime;

    return {
      success: true,
      messages: sentMessages,
      chunks,
      metadata: {
        originalLength: content.length,
        chunkCount: chunks.length,
        channelId: channel.id,
        messageIds: sentMessages.map(m => m.id),
        timeTaken,
        retries: retryCount.value,
      },
    };
  } catch (error) {
    const timeTaken = Date.now() - startTime;

    // Log error with context
    logError(error, {
      operation: 'Discord message send',
      additionalInfo: {
        originalLength: content.length,
        chunkCount: chunks.length,
        sentMessages: sentMessages.length,
        retries: retryCount.value,
      },
    });

    return {
      success: false,
      messages: sentMessages,
      chunks,
      metadata: {
        originalLength: content.length,
        chunkCount: chunks.length,
        channelId: channel.id,
        messageIds: sentMessages.map(m => m.id),
        timeTaken,
        retries: retryCount.value,
      },
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
