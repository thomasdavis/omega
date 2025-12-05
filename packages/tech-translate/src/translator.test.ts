import { describe, it, expect } from 'vitest';
import { TechTranslator } from './translator.js';
import type { TechTranslationSpec } from './types.js';

describe('TechTranslator', () => {
  const translator = new TechTranslator();

  it('should translate simple text', async () => {
    const spec: TechTranslationSpec = {
      sourceText: 'Hello world',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      tone: 'professional',
      preserveCodeBlocks: true,
      preserveUrls: true,
      outputFormat: 'markdown',
    };

    const result = await translator.translate(spec);

    expect(result.sourceLanguage).toBe('en');
    expect(result.targetLanguage).toBe('es');
    expect(result.tone).toBe('professional');
    expect(result.translatedText).toContain('Hello world');
    expect(result.metadata?.originalLength).toBe(11);
  });

  it('should handle different tones', async () => {
    const spec: TechTranslationSpec = {
      sourceText: 'Technical documentation',
      sourceLanguage: 'en',
      targetLanguage: 'fr',
      tone: 'technical',
      preserveCodeBlocks: true,
      preserveUrls: true,
      outputFormat: 'markdown',
    };

    const result = await translator.translate(spec);

    expect(result.tone).toBe('technical');
    expect(result.translatedText).toContain('technical');
  });

  it('should include metadata', async () => {
    const spec: TechTranslationSpec = {
      sourceText: 'Short text',
      sourceLanguage: 'en',
      targetLanguage: 'de',
      tone: 'casual',
      preserveCodeBlocks: false,
      preserveUrls: false,
      outputFormat: 'markdown',
    };

    const result = await translator.translate(spec);

    expect(result.metadata).toBeDefined();
    expect(result.metadata?.originalLength).toBe(10);
    expect(result.metadata?.translatedLength).toBeGreaterThan(0);
  });
});
