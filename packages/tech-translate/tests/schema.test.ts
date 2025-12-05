import { describe, it, expect } from 'vitest';
import {
  TechTranslationSpecSchema,
  OutputFormatSchema,
  ProviderConfigSchema,
  TranslationTargetSchema,
} from '../src/types.js';

describe('Schema Validation', () => {
  describe('OutputFormatSchema', () => {
    it('should accept valid formats', () => {
      expect(() => OutputFormatSchema.parse('markdown')).not.toThrow();
      expect(() => OutputFormatSchema.parse('json')).not.toThrow();
    });

    it('should reject invalid formats', () => {
      expect(() => OutputFormatSchema.parse('xml')).toThrow();
      expect(() => OutputFormatSchema.parse('html')).toThrow();
    });
  });

  describe('ProviderConfigSchema', () => {
    it('should accept valid provider config', () => {
      const config = {
        name: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-test',
        baseUrl: 'https://api.openai.com',
      };
      expect(() => ProviderConfigSchema.parse(config)).not.toThrow();
    });

    it('should accept minimal provider config', () => {
      const config = { name: 'stub' };
      expect(() => ProviderConfigSchema.parse(config)).not.toThrow();
    });
  });

  describe('TranslationTargetSchema', () => {
    it('should accept valid translation target', () => {
      const target = {
        language: 'es',
        technicalLevel: 'intermediate' as const,
        audience: 'software developers',
      };
      expect(() => TranslationTargetSchema.parse(target)).not.toThrow();
    });

    it('should require language field', () => {
      const target = {
        technicalLevel: 'beginner' as const,
      };
      expect(() => TranslationTargetSchema.parse(target)).toThrow();
    });

    it('should accept all technical levels', () => {
      const levels = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
      levels.forEach((level) => {
        const target = { language: 'en', technicalLevel: level };
        expect(() => TranslationTargetSchema.parse(target)).not.toThrow();
      });
    });
  });

  describe('TechTranslationSpecSchema', () => {
    it('should accept valid complete specification', () => {
      const spec = {
        input: 'Test content to translate',
        sourceLanguage: 'en',
        target: {
          language: 'fr',
          technicalLevel: 'advanced' as const,
          audience: 'DevOps engineers',
        },
        outputFormat: 'markdown' as const,
        provider: {
          name: 'openai',
          model: 'gpt-4',
        },
        preserveCodeBlocks: true,
        preserveLinks: true,
        preserveFormatting: true,
      };
      expect(() => TechTranslationSpecSchema.parse(spec)).not.toThrow();
    });

    it('should accept minimal specification', () => {
      const spec = {
        input: 'Test content',
        target: {
          language: 'es',
        },
      };
      const parsed = TechTranslationSpecSchema.parse(spec);
      expect(parsed.outputFormat).toBe('markdown'); // default
      expect(parsed.preserveCodeBlocks).toBe(true); // default
      expect(parsed.preserveLinks).toBe(true); // default
      expect(parsed.preserveFormatting).toBe(true); // default
    });

    it('should require input field', () => {
      const spec = {
        target: {
          language: 'de',
        },
      };
      expect(() => TechTranslationSpecSchema.parse(spec)).toThrow();
    });

    it('should require target field', () => {
      const spec = {
        input: 'Test content',
      };
      expect(() => TechTranslationSpecSchema.parse(spec)).toThrow();
    });

    it('should validate nested target object', () => {
      const spec = {
        input: 'Test content',
        target: {
          // missing language field
          technicalLevel: 'beginner' as const,
        },
      };
      expect(() => TechTranslationSpecSchema.parse(spec)).toThrow();
    });
  });
});
