import { describe, it, expect } from 'vitest';
import { extractLargeCodeBlocks } from './codeBlockExtractor.js';

describe('extractLargeCodeBlocks', () => {
  it('should not extract small code blocks', () => {
    const message = `Here's a small code example:

\`\`\`javascript
console.log('Hello world');
\`\`\`

That's all!`;

    const result = extractLargeCodeBlocks(message);

    expect(result.codeBlocks).toHaveLength(0);
    expect(result.message).toBe(message);
  });

  it('should extract large code blocks based on character threshold', () => {
    // Create a code block with >1500 characters
    const largeCode = 'console.log("line");\n'.repeat(100);
    const message = `Here's a large code example:

\`\`\`javascript
${largeCode}\`\`\`

That's all!`;

    const result = extractLargeCodeBlocks(message);

    expect(result.codeBlocks).toHaveLength(1);
    expect(result.codeBlocks[0].language).toBe('javascript');
    expect(result.codeBlocks[0].filename).toBe('javascript_1.js');
    expect(result.codeBlocks[0].content).toBe(largeCode);
    expect(result.message).toContain('Code file attached:');
    expect(result.message).toContain('javascript_1.js');
  });

  it('should extract large code blocks based on line threshold', () => {
    // Create a code block with >50 lines but <1500 chars
    const largeCode = 'x\n'.repeat(60);
    const message = `Here's code with many lines:

\`\`\`python
${largeCode}\`\`\`

Done!`;

    const result = extractLargeCodeBlocks(message);

    expect(result.codeBlocks).toHaveLength(1);
    expect(result.codeBlocks[0].language).toBe('python');
    expect(result.codeBlocks[0].filename).toBe('python_1.py');
    expect(result.codeBlocks[0].lineCount).toBeGreaterThan(50);
  });

  it('should handle multiple large code blocks', () => {
    const largeCode1 = 'console.log("line");\n'.repeat(100);
    const largeCode2 = 'print("line")\n'.repeat(100);
    const message = `First block:

\`\`\`javascript
${largeCode1}\`\`\`

Second block:

\`\`\`python
${largeCode2}\`\`\`

Done!`;

    const result = extractLargeCodeBlocks(message);

    expect(result.codeBlocks).toHaveLength(2);
    expect(result.codeBlocks[0].language).toBe('javascript');
    expect(result.codeBlocks[0].filename).toBe('javascript_1.js');
    expect(result.codeBlocks[1].language).toBe('python');
    expect(result.codeBlocks[1].filename).toBe('python_2.py');
  });

  it('should handle code blocks without language specifier', () => {
    const largeCode = 'some code here\n'.repeat(100);
    const message = `Code without language:

\`\`\`
${largeCode}\`\`\`

Done!`;

    const result = extractLargeCodeBlocks(message);

    expect(result.codeBlocks).toHaveLength(1);
    expect(result.codeBlocks[0].language).toBe('text');
    expect(result.codeBlocks[0].filename).toBe('text_1.txt');
  });

  it('should preserve small code blocks in the message', () => {
    const smallCode = 'console.log("small");';
    const largeCode = 'console.log("line");\n'.repeat(100);
    const message = `Small block:

\`\`\`javascript
${smallCode}
\`\`\`

Large block:

\`\`\`javascript
${largeCode}\`\`\`

Done!`;

    const result = extractLargeCodeBlocks(message);

    expect(result.codeBlocks).toHaveLength(1);
    expect(result.message).toContain(smallCode);
    expect(result.message).toContain('Code file attached:');
  });

  it('should correctly map language extensions', () => {
    const largeCode = 'code\n'.repeat(60);

    const languages = [
      { lang: 'typescript', ext: 'ts' },
      { lang: 'python', ext: 'py' },
      { lang: 'java', ext: 'java' },
      { lang: 'rust', ext: 'rs' },
      { lang: 'go', ext: 'go' },
      { lang: 'cpp', ext: 'cpp' },
      { lang: 'c', ext: 'c' },
    ];

    languages.forEach(({ lang, ext }) => {
      const message = `\`\`\`${lang}\n${largeCode}\`\`\``;
      const result = extractLargeCodeBlocks(message);

      expect(result.codeBlocks).toHaveLength(1);
      expect(result.codeBlocks[0].filename).toBe(`${lang}_1.${ext}`);
    });
  });

  it('should include metadata in replacement text', () => {
    const largeCode = 'console.log("line");\n'.repeat(100);
    const message = `\`\`\`javascript\n${largeCode}\`\`\``;

    const result = extractLargeCodeBlocks(message);

    expect(result.message).toContain('📎');
    expect(result.message).toContain('Code file attached:');
    expect(result.message).toContain('lines');
    expect(result.message).toContain('characters');
  });
});
