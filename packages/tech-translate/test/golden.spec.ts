import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runTechTranslate } from '../src/index.js';
import type { TechTranslateInput } from '../src/schema.js';
import { renderMarkdown } from '../src/renderers/markdown.js';

describe('Golden Fixture Tests', () => {
  it('should match golden output for simple-request', async () => {
    const inputPath = join(process.cwd(), 'test', 'fixtures', 'simple-request.input.json');
    const goldenPath = join(process.cwd(), 'test', 'fixtures', 'simple-request.output.md');

    const inputData = JSON.parse(readFileSync(inputPath, 'utf-8')) as TechTranslateInput;
    const expectedOutput = readFileSync(goldenPath, 'utf-8');

    const result = await runTechTranslate(inputData);
    const renderedOutput = renderMarkdown(result);

    expect(renderedOutput).toBe(expectedOutput);
  });
});
