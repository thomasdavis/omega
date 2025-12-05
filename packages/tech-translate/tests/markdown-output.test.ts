import { describe, it, expect } from 'vitest';
import { TechTranslator } from '../src/translator.js';
import type { TechTranslationSpec } from '../src/types.js';

describe('Markdown Output Snapshots', () => {
  it('should generate consistent markdown output for basic translation', async () => {
    const translator = new TechTranslator();
    const spec: TechTranslationSpec = {
      input: `# Introduction to TypeScript

TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.

## Key Features

- Static typing
- Enhanced IDE support
- Modern JavaScript features`,
      target: {
        language: 'es',
        technicalLevel: 'intermediate',
      },
      outputFormat: 'markdown',
      preserveCodeBlocks: true,
      preserveLinks: true,
      preserveFormatting: true,
    };

    const result = await translator.translate(spec);

    // Snapshot testing for consistent output
    expect(result.translatedContent).toMatchSnapshot();
  });

  it('should generate consistent markdown with code blocks', async () => {
    const translator = new TechTranslator();
    const spec: TechTranslationSpec = {
      input: `# Code Example

Here's a simple function:

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

This function takes a name and returns a greeting.`,
      target: {
        language: 'fr',
        technicalLevel: 'beginner',
        audience: 'junior developers',
      },
      outputFormat: 'markdown',
      preserveCodeBlocks: true,
      preserveLinks: true,
      preserveFormatting: true,
    };

    const result = await translator.translate(spec);

    expect(result.translatedContent).toMatchSnapshot();
  });
});
