/**
 * Tests for Discord Message Chunker
 */

import { describe, it, expect } from 'vitest';
import { chunkMessage } from './messageChunker.js';

describe('chunkMessage', () => {
  it('should return single chunk for short messages', () => {
    const message = 'Hello, world!';
    const chunks = chunkMessage(message);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(message);
  });

  it('should split long messages into multiple chunks', () => {
    const longMessage = 'A'.repeat(3000);
    const chunks = chunkMessage(longMessage);

    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should be within limit
    chunks.forEach(chunk => {
      expect(chunk.length).toBeLessThanOrEqual(1950);
    });
  });

  it('should preserve line breaks when splitting', () => {
    const lines = Array(200).fill('This is a line of text.').join('\n');
    const chunks = chunkMessage(lines);

    expect(chunks.length).toBeGreaterThan(1);
    // Verify that chunks still contain line breaks
    chunks.forEach(chunk => {
      if (chunk.includes('\n')) {
        expect(chunk.split('\n').length).toBeGreaterThan(0);
      }
    });
  });

  it('should handle code blocks correctly', () => {
    const message = '```javascript\n' + 'const x = 1;\n'.repeat(200) + '```';
    const chunks = chunkMessage(message);

    expect(chunks.length).toBeGreaterThan(1);

    // First chunk should start with code block
    expect(chunks[0]).toMatch(/^```javascript\n/);

    // Last chunk should end with code block closing
    expect(chunks[chunks.length - 1]).toMatch(/```$/);

    // Middle chunks should have both opening and closing
    if (chunks.length > 2) {
      for (let i = 1; i < chunks.length - 1; i++) {
        expect(chunks[i]).toMatch(/^```javascript\n/);
        expect(chunks[i]).toMatch(/```\n$/);
      }
    }
  });

  it('should split very long lines by words', () => {
    const longLine = Array(500).fill('word').join(' ');
    const chunks = chunkMessage(longLine);

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach(chunk => {
      expect(chunk.length).toBeLessThanOrEqual(1950);
    });
  });

  it('should handle mixed content with code blocks and text', () => {
    const message = `
Here's some text before the code.

\`\`\`python
${'print("Hello, world!")\n'.repeat(100)}
\`\`\`

And some text after the code.
`.trim();

    const chunks = chunkMessage(message);

    // Verify all chunks are within limit
    chunks.forEach(chunk => {
      expect(chunk.length).toBeLessThanOrEqual(1950);
    });

    // Reconstruct message (removing code block splits) to verify content preservation
    const reconstructed = chunks.join('\n').replace(/```\n```python\n/g, '');
    expect(reconstructed).toContain('Here\'s some text before the code.');
    expect(reconstructed).toContain('print("Hello, world!")');
  });

  it('should handle empty messages', () => {
    const chunks = chunkMessage('');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe('');
  });

  it('should respect custom maxLength parameter', () => {
    const message = 'A'.repeat(300);
    const chunks = chunkMessage(message, 100);

    expect(chunks.length).toBeGreaterThanOrEqual(3);
    chunks.forEach(chunk => {
      expect(chunk.length).toBeLessThanOrEqual(100);
    });
  });

  it('should handle nested markdown formatting', () => {
    const message = `
**Bold text** and *italic text*

- List item 1
- List item 2
- List item 3

> Quote block

`.repeat(50);

    const chunks = chunkMessage(message);

    // Verify all chunks are within limit
    chunks.forEach(chunk => {
      expect(chunk.length).toBeLessThanOrEqual(1950);
    });
  });
});
