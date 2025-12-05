import { describe, it, expect } from 'vitest';
import { TechTranslator } from '../src/translator.js';
import type { TechTranslationSpec } from '../src/types.js';

describe('TechTranslator', () => {
  it('should translate basic content', async () => {
    const translator = new TechTranslator();
    const spec: TechTranslationSpec = {
      input: 'Hello, world! This is a test.',
      target: {
        language: 'es',
      },
      outputFormat: 'markdown',
      preserveCodeBlocks: true,
      preserveLinks: true,
      preserveFormatting: true,
    };

    const result = await translator.translate(spec);

    expect(result).toBeDefined();
    expect(result.translatedContent).toContain('[STUB TRANSLATION]');
    expect(result.translatedContent).toContain('es');
    expect(result.metadata.targetLanguage).toBe('es');
    expect(result.metadata.provider).toBe('stub');
  });

  it('should handle technical level in translation', async () => {
    const translator = new TechTranslator();
    const spec: TechTranslationSpec = {
      input: 'Technical documentation content',
      target: {
        language: 'fr',
        technicalLevel: 'expert',
      },
      outputFormat: 'markdown',
      preserveCodeBlocks: true,
      preserveLinks: true,
      preserveFormatting: true,
    };

    const result = await translator.translate(spec);

    expect(result.translatedContent).toContain('expert');
    expect(result.metadata.targetLanguage).toBe('fr');
  });

  it('should validate correct specification', () => {
    const translator = new TechTranslator();
    const spec: TechTranslationSpec = {
      input: 'Test content',
      target: {
        language: 'de',
      },
      outputFormat: 'markdown',
      preserveCodeBlocks: true,
      preserveLinks: true,
      preserveFormatting: true,
    };

    const validation = translator.validateSpec(spec);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toBeUndefined();
  });

  it('should reject invalid specification', () => {
    const translator = new TechTranslator();
    const invalidSpec = {
      input: 'Test content',
      // Missing required 'target' field
      outputFormat: 'invalid-format',
    };

    const validation = translator.validateSpec(invalidSpec);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toBeDefined();
    expect(validation.errors!.length).toBeGreaterThan(0);
  });

  it('should output JSON format when specified', async () => {
    const translator = new TechTranslator();
    const spec: TechTranslationSpec = {
      input: 'Test content for JSON output',
      target: {
        language: 'ja',
      },
      outputFormat: 'json',
      preserveCodeBlocks: true,
      preserveLinks: true,
      preserveFormatting: true,
    };

    const result = await translator.translate(spec);

    expect(() => JSON.parse(result.translatedContent)).not.toThrow();
    const parsed = JSON.parse(result.translatedContent);
    expect(parsed).toHaveProperty('content');
    expect(parsed).toHaveProperty('metadata');
  });
});
