import { describe, it, expect } from 'vitest';
import {
  TechTranslationSpecSchema,
  TranslationResultSchema,
  ToneSchema,
  OutputFormatSchema,
} from './types.js';

describe('ToneSchema', () => {
  it('should validate valid tones', () => {
    const validTones = [
      'formal',
      'casual',
      'technical',
      'friendly',
      'professional',
    ];
    validTones.forEach((tone) => {
      expect(() => ToneSchema.parse(tone)).not.toThrow();
    });
  });

  it('should reject invalid tones', () => {
    expect(() => ToneSchema.parse('invalid')).toThrow();
  });
});

describe('OutputFormatSchema', () => {
  it('should validate markdown and json formats', () => {
    expect(() => OutputFormatSchema.parse('markdown')).not.toThrow();
    expect(() => OutputFormatSchema.parse('json')).not.toThrow();
  });

  it('should reject invalid formats', () => {
    expect(() => OutputFormatSchema.parse('html')).toThrow();
  });
});

describe('TechTranslationSpecSchema', () => {
  it('should validate a minimal spec', () => {
    const spec = {
      sourceText: 'Hello world',
      targetLanguage: 'es',
    };
    const result = TechTranslationSpecSchema.parse(spec);
    expect(result.sourceText).toBe('Hello world');
    expect(result.targetLanguage).toBe('es');
    expect(result.sourceLanguage).toBe('en');
    expect(result.tone).toBe('professional');
    expect(result.preserveCodeBlocks).toBe(true);
    expect(result.preserveUrls).toBe(true);
    expect(result.outputFormat).toBe('markdown');
  });

  it('should validate a full spec', () => {
    const spec = {
      sourceText: 'Technical documentation',
      sourceLanguage: 'en',
      targetLanguage: 'fr',
      tone: 'technical' as const,
      preserveCodeBlocks: false,
      preserveUrls: false,
      outputFormat: 'json' as const,
    };
    const result = TechTranslationSpecSchema.parse(spec);
    expect(result).toEqual(spec);
  });

  it('should reject empty source text', () => {
    const spec = {
      sourceText: '',
      targetLanguage: 'es',
    };
    expect(() => TechTranslationSpecSchema.parse(spec)).toThrow();
  });

  it('should reject missing target language', () => {
    const spec = {
      sourceText: 'Hello',
    };
    expect(() => TechTranslationSpecSchema.parse(spec)).toThrow();
  });
});

describe('TranslationResultSchema', () => {
  it('should validate a translation result', () => {
    const result = {
      translatedText: 'Hola mundo',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      tone: 'professional' as const,
      metadata: {
        originalLength: 11,
        translatedLength: 10,
        codeBlocksPreserved: 0,
        urlsPreserved: 0,
      },
    };
    expect(() => TranslationResultSchema.parse(result)).not.toThrow();
  });

  it('should validate result without metadata', () => {
    const result = {
      translatedText: 'Hola mundo',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      tone: 'casual' as const,
    };
    expect(() => TranslationResultSchema.parse(result)).not.toThrow();
  });
});
