import { describe, it, expect } from 'vitest';
import { TechTranslator } from '../translator.js';
import type { TechTranslationSpec } from '../types.js';

describe('Markdown Output Snapshots', () => {
  const translator = new TechTranslator();

  it('should match snapshot for simple markdown translation', async () => {
    const spec: TechTranslationSpec = {
      sourceText: '# Hello World\n\nThis is a test document.',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      tone: 'professional',
      preserveCodeBlocks: true,
      preserveUrls: true,
      outputFormat: 'markdown',
    };

    const result = await translator.translate(spec);
    expect(result.translatedText).toMatchSnapshot();
  });

  it('should match snapshot for technical content with code blocks', async () => {
    const sourceText = `# Installation Guide

To install the package, run:

\`\`\`bash
npm install @repo/tech-translate
\`\`\`

Visit https://example.com for more info.`;

    const spec: TechTranslationSpec = {
      sourceText,
      sourceLanguage: 'en',
      targetLanguage: 'fr',
      tone: 'technical',
      preserveCodeBlocks: true,
      preserveUrls: true,
      outputFormat: 'markdown',
    };

    const result = await translator.translate(spec);
    expect(result.translatedText).toMatchSnapshot();
  });

  it('should match snapshot for casual tone', async () => {
    const spec: TechTranslationSpec = {
      sourceText: 'Hey there! Check out this cool feature.',
      sourceLanguage: 'en',
      targetLanguage: 'de',
      tone: 'casual',
      preserveCodeBlocks: true,
      preserveUrls: true,
      outputFormat: 'markdown',
    };

    const result = await translator.translate(spec);
    expect(result.translatedText).toMatchSnapshot();
  });

  it('should match snapshot for formal tone', async () => {
    const spec: TechTranslationSpec = {
      sourceText:
        'Please refer to the documentation for further information.',
      sourceLanguage: 'en',
      targetLanguage: 'ja',
      tone: 'formal',
      preserveCodeBlocks: true,
      preserveUrls: true,
      outputFormat: 'markdown',
    };

    const result = await translator.translate(spec);
    expect(result.translatedText).toMatchSnapshot();
  });
});
