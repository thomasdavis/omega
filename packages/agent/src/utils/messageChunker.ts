/**
 * Discord Message Chunker
 *
 * Automatically splits long messages into valid chunks that respect Discord's 2000 character limit.
 * Preserves markdown formatting and code blocks as much as possible.
 */

const DISCORD_MAX_LENGTH = 2000;
const CHUNK_SAFETY_MARGIN = 50; // Leave some buffer for safety
const MAX_CHUNK_LENGTH = DISCORD_MAX_LENGTH - CHUNK_SAFETY_MARGIN;

/**
 * Split a message into chunks that fit within Discord's character limit
 *
 * @param message - The message to split
 * @param maxLength - Maximum length per chunk (default: 1950 to leave safety margin)
 * @returns Array of message chunks
 */
export function chunkMessage(
  message: string,
  maxLength: number = MAX_CHUNK_LENGTH
): string[] {
  // If message fits within limit, return as-is
  if (message.length <= maxLength) {
    return [message];
  }

  const chunks: string[] = [];
  let currentChunk = '';
  let inCodeBlock = false;
  let codeBlockLanguage = '';

  // Split by lines to preserve formatting
  const lines = message.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineWithNewline = i === lines.length - 1 ? line : line + '\n';

    // Detect code block boundaries
    const codeBlockMatch = line.match(/^```(\w*)/);
    if (codeBlockMatch) {
      if (!inCodeBlock) {
        // Starting a code block
        inCodeBlock = true;
        codeBlockLanguage = codeBlockMatch[1] || '';
      } else {
        // Ending a code block
        inCodeBlock = false;
      }
    }

    // Check if adding this line would exceed the limit
    if (currentChunk.length + lineWithNewline.length > maxLength) {
      // If we're in a code block, close it before chunking
      if (inCodeBlock) {
        currentChunk += '```\n';
      }

      // Save current chunk
      chunks.push(currentChunk.trimEnd());

      // Start new chunk
      currentChunk = '';

      // If we're in a code block, reopen it in the new chunk
      if (inCodeBlock) {
        currentChunk = '```' + codeBlockLanguage + '\n';
      }

      // If the line itself is too long, split it by words
      if (lineWithNewline.length > maxLength) {
        const words = line.split(' ');
        let wordChunk = inCodeBlock ? currentChunk : '';

        for (const word of words) {
          const wordWithSpace = word + ' ';

          if (wordChunk.length + wordWithSpace.length > maxLength) {
            // Close code block if needed
            if (inCodeBlock && !wordChunk.endsWith('```\n')) {
              wordChunk += '```\n';
            }

            chunks.push(wordChunk.trimEnd());

            // Start new chunk, reopen code block if needed
            wordChunk = inCodeBlock ? '```' + codeBlockLanguage + '\n' + wordWithSpace : wordWithSpace;
          } else {
            wordChunk += wordWithSpace;
          }
        }

        currentChunk = wordChunk.trimEnd() + '\n';
      } else {
        currentChunk += lineWithNewline;
      }
    } else {
      currentChunk += lineWithNewline;
    }
  }

  // Add the last chunk if it has content
  if (currentChunk.trim().length > 0) {
    // Close any open code block
    if (inCodeBlock && !currentChunk.trimEnd().endsWith('```')) {
      currentChunk += '```';
    }
    chunks.push(currentChunk.trimEnd());
  }

  return chunks;
}

/**
 * Send a message in chunks if it exceeds Discord's limit
 *
 * @param message - The message to send
 * @param sendFn - Function to send a single message (should return a Promise)
 * @param maxLength - Maximum length per chunk (default: 1950)
 * @returns Promise that resolves when all chunks are sent
 */
export async function sendChunkedMessage(
  message: string,
  sendFn: (chunk: string) => Promise<any>,
  maxLength: number = MAX_CHUNK_LENGTH
): Promise<void> {
  const chunks = chunkMessage(message, maxLength);

  for (let i = 0; i < chunks.length; i++) {
    await sendFn(chunks[i]);

    // Add a small delay between chunks to avoid rate limiting
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
