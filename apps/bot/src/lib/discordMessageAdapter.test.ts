/**
 * Unit tests for Discord Message Adapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendMessage } from './discordMessageAdapter.js';
import type { TextBasedChannel, Message } from 'discord.js';

// Mock the errorLogger module
vi.mock('../utils/errorLogger.js', () => ({
  logError: vi.fn(),
}));

describe('discordMessageAdapter', () => {
  let mockChannel: TextBasedChannel;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks
    mockSend = vi.fn().mockResolvedValue({
      id: 'mock-message-id',
      content: '',
    } as Message);

    mockChannel = {
      id: 'test-channel-id',
      send: mockSend,
    } as unknown as TextBasedChannel;
  });

  describe('basic functionality', () => {
    it('should send a short message without chunking', async () => {
      const content = 'Hello, world!';

      const result = await sendMessage(mockChannel, content);

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(1);
      expect(result.chunks).toHaveLength(1);
      expect(result.metadata.chunkCount).toBe(1);
      expect(result.metadata.originalLength).toBe(content.length);
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith({
        content: 'Hello, world!',
      });
    });

    it('should split long messages into chunks', async () => {
      const content = 'a'.repeat(3000); // 3000 chars, should split into 2 chunks

      const result = await sendMessage(mockChannel, content);

      expect(result.success).toBe(true);
      expect(result.messages.length).toBeGreaterThan(1);
      expect(result.chunks.length).toBeGreaterThan(1);
      expect(result.metadata.chunkCount).toBeGreaterThan(1);
      expect(mockSend.mock.calls.length).toBeGreaterThan(1);
    });

    it('should add continuation markers to chunks', async () => {
      const content = 'a'.repeat(3000);

      const result = await sendMessage(mockChannel, content, {
        addContinuationMarkers: true,
      });

      expect(result.success).toBe(true);
      // Check that markers were added
      const firstChunk = mockSend.mock.calls[0][0].content;
      expect(firstChunk).toMatch(/^\*\*\(1\/\d+\)\*\*/);
    });

    it('should not add continuation markers when disabled', async () => {
      const content = 'a'.repeat(3000);

      const result = await sendMessage(mockChannel, content, {
        addContinuationMarkers: false,
      });

      expect(result.success).toBe(true);
      const firstChunk = mockSend.mock.calls[0][0].content;
      expect(firstChunk).not.toMatch(/^\*\*\(1\/\d+\)\*\*/);
    });

    it('should respect custom maxChunkSize', async () => {
      const content = 'a'.repeat(1000);

      const result = await sendMessage(mockChannel, content, {
        maxChunkSize: 500,
        addContinuationMarkers: false,
      });

      expect(result.success).toBe(true);
      // Should be split into at least 2 chunks
      expect(result.chunks.length).toBeGreaterThanOrEqual(2);
      // Each chunk should be <= 500 chars
      for (const chunk of result.chunks) {
        expect(chunk.length).toBeLessThanOrEqual(500);
      }
    });
  });

  describe('code fence preservation', () => {
    it('should preserve complete code fences within a chunk', async () => {
      const content = '```javascript\nconst x = 42;\n```';

      const result = await sendMessage(mockChannel, content);

      expect(result.success).toBe(true);
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0]).toContain('```javascript');
      expect(result.chunks[0]).toContain('```');
    });

    it('should split and close/reopen code fences across chunks', async () => {
      const longCode = 'a'.repeat(2000);
      const content = `Some text\n\`\`\`javascript\n${longCode}\n\`\`\`\n\nMore text`;

      const result = await sendMessage(mockChannel, content, {
        maxChunkSize: 1000,
        addContinuationMarkers: false,
      });

      expect(result.success).toBe(true);

      // Check that code fences are properly closed and reopened
      if (result.chunks.length > 1) {
        // Find chunks that contain code
        const chunksWithCode = result.chunks.filter(c => c.includes('```'));

        for (let i = 0; i < chunksWithCode.length; i++) {
          const chunk = chunksWithCode[i];
          // Count opening and closing fences
          const openFences = (chunk.match(/```\w*\n/g) || []).length;
          const closeFences = (chunk.match(/\n```/g) || []).length + (chunk.match(/```$/g) || []).length;

          // Each chunk should have balanced fences (or one more opening if it continues)
          expect(Math.abs(openFences - closeFences)).toBeLessThanOrEqual(1);
        }
      }
    });

    it('should handle multiple code fences in the same message', async () => {
      const content = `First block:
\`\`\`python
print("hello")
\`\`\`

Second block:
\`\`\`javascript
console.log("world");
\`\`\``;

      const result = await sendMessage(mockChannel, content);

      expect(result.success).toBe(true);
      // Short message should fit in one chunk
      expect(result.chunks).toHaveLength(1);
    });

    it('should handle code fences without language specifier', async () => {
      const content = '```\nsome code\n```';

      const result = await sendMessage(mockChannel, content);

      expect(result.success).toBe(true);
      expect(result.chunks[0]).toContain('```');
    });
  });

  describe('splitting behavior', () => {
    it('should prefer splitting at newlines', async () => {
      const lines = Array(100).fill('This is a line of text.').join('\n');

      const result = await sendMessage(mockChannel, lines, {
        maxChunkSize: 500,
        addContinuationMarkers: false,
      });

      expect(result.success).toBe(true);
      // Check that chunks end with complete lines
      for (const chunk of result.chunks) {
        if (chunk !== result.chunks[result.chunks.length - 1]) {
          // All but last chunk should end with newline
          expect(chunk.endsWith('\n') || chunk.endsWith('.')).toBe(true);
        }
      }
    });

    it('should handle content with no good split points', async () => {
      // Very long line with no spaces or newlines
      const content = 'a'.repeat(2500);

      const result = await sendMessage(mockChannel, content, {
        maxChunkSize: 1000,
        addContinuationMarkers: false,
      });

      expect(result.success).toBe(true);
      expect(result.chunks.length).toBeGreaterThan(1);
    });

    it('should not split words when possible', async () => {
      const content = 'word '.repeat(500); // Many words separated by spaces

      const result = await sendMessage(mockChannel, content, {
        maxChunkSize: 500,
        addContinuationMarkers: false,
      });

      expect(result.success).toBe(true);
      // Check that no chunk ends in the middle of "word"
      for (const chunk of result.chunks.slice(0, -1)) {
        const lastChar = chunk[chunk.length - 1];
        expect(lastChar === ' ' || lastChar === '\n' || lastChar === 'd').toBe(true);
      }
    });
  });

  describe('rate limiting and retries', () => {
    it('should retry on rate limit errors (429)', async () => {
      const rateLimitError = {
        code: 429,
        status: 429,
        retry_after: 100,
        message: 'Rate limited',
      };

      mockSend
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ id: 'mock-id', content: 'test' } as Message);

      const content = 'Test message';

      const result = await sendMessage(mockChannel, content, {
        maxRetries: 3,
        initialBackoffMs: 50,
      });

      expect(result.success).toBe(true);
      expect(result.metadata.retries).toBe(2);
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const rateLimitError = {
        code: 429,
        status: 429,
        retry_after: 10,
        message: 'Rate limited',
      };

      mockSend.mockRejectedValue(rateLimitError);

      const content = 'Test message';

      const result = await sendMessage(mockChannel, content, {
        maxRetries: 2,
        initialBackoffMs: 10,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockSend).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry on non-rate-limit errors', async () => {
      const genericError = new Error('Generic error');

      mockSend.mockRejectedValue(genericError);

      const content = 'Test message';

      const result = await sendMessage(mockChannel, content);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Generic error');
      expect(mockSend).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('metadata and logging', () => {
    it('should return comprehensive metadata', async () => {
      const content = 'a'.repeat(3000);

      const result = await sendMessage(mockChannel, content);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.originalLength).toBe(3000);
      expect(result.metadata.chunkCount).toBeGreaterThan(1);
      expect(result.metadata.channelId).toBe('test-channel-id');
      expect(result.metadata.messageIds).toHaveLength(result.messages.length);
      expect(result.metadata.timeTaken).toBeGreaterThanOrEqual(0);
      expect(result.metadata.retries).toBe(0);
    });

    it('should include sent message IDs', async () => {
      mockSend
        .mockResolvedValueOnce({ id: 'msg-1', content: '' } as Message)
        .mockResolvedValueOnce({ id: 'msg-2', content: '' } as Message);

      const content = 'a'.repeat(3000);

      const result = await sendMessage(mockChannel, content);

      expect(result.metadata.messageIds).toContain('msg-1');
      expect(result.metadata.messageIds).toContain('msg-2');
    });
  });

  describe('Discord options', () => {
    it('should pass through Discord options to first message only', async () => {
      const content = 'a'.repeat(3000);
      const mockFile = { name: 'test.txt', attachment: Buffer.from('test') };

      const result = await sendMessage(mockChannel, content, {
        discordOptions: {
          files: [mockFile as any],
        },
      });

      expect(result.success).toBe(true);
      // First message should have the file
      expect(mockSend.mock.calls[0][0]).toHaveProperty('files');
      // Subsequent messages should not
      if (mockSend.mock.calls.length > 1) {
        expect(mockSend.mock.calls[1][0]).not.toHaveProperty('files');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', async () => {
      const result = await sendMessage(mockChannel, '');

      expect(result.success).toBe(true);
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0]).toBe('');
    });

    it('should handle content exactly at chunk size', async () => {
      const content = 'a'.repeat(1900);

      const result = await sendMessage(mockChannel, content, {
        maxChunkSize: 1900,
      });

      expect(result.success).toBe(true);
      expect(result.chunks).toHaveLength(1);
    });

    it('should handle content one character over chunk size', async () => {
      const content = 'a'.repeat(1901);

      const result = await sendMessage(mockChannel, content, {
        maxChunkSize: 1900,
        addContinuationMarkers: false,
      });

      expect(result.success).toBe(true);
      expect(result.chunks.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle unclosed code fences gracefully', async () => {
      const content = '```javascript\nconst x = 42;\n// No closing fence';

      const result = await sendMessage(mockChannel, content);

      // Should still succeed even with malformed input
      expect(result.success).toBe(true);
    });
  });
});
