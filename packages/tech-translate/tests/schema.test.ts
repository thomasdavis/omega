import { describe, it, expect } from 'vitest';
import {
  TechTranslationSpecSchema,
  TranslationResultSchema,
  ConcernAreaSchema,
  LevelSchema,
  FormatSchema,
} from '../src/types.js';

describe('Schema validation', () => {
  describe('TechTranslationSpecSchema', () => {
    it('should validate valid spec', () => {
      const valid = {
        input: 'Add user authentication',
        options: {
          format: 'md' as const,
          level: 'prod' as const,
          include: ['db' as const, 'security' as const],
        },
      };

      expect(() => TechTranslationSpecSchema.parse(valid)).not.toThrow();
    });

    it('should reject empty input', () => {
      const invalid = {
        input: '',
      };

      expect(() => TechTranslationSpecSchema.parse(invalid)).toThrow();
    });

    it('should accept minimal spec', () => {
      const minimal = {
        input: 'Test',
      };

      expect(() => TechTranslationSpecSchema.parse(minimal)).not.toThrow();
    });
  });

  describe('TranslationResultSchema', () => {
    it('should validate complete result', () => {
      const result = {
        metadata: {
          timestamp: new Date().toISOString(),
          version: '0.1.0',
          level: 'prod' as const,
          format: 'json' as const,
          concerns: ['db' as const],
        },
        specification: {
          summary: 'Test',
          requirements: ['Req 1', 'Req 2'],
          database: {
            tables: ['users'],
            migrations: ['001_initial.sql'],
          },
        },
      };

      expect(() => TranslationResultSchema.parse(result)).not.toThrow();
    });

    it('should validate minimal result', () => {
      const minimal = {
        metadata: {
          timestamp: new Date().toISOString(),
          version: '0.1.0',
          level: 'mvp' as const,
          format: 'json' as const,
        },
        specification: {
          summary: 'Test',
          requirements: [],
        },
      };

      expect(() => TranslationResultSchema.parse(minimal)).not.toThrow();
    });
  });

  describe('Enum schemas', () => {
    it('should validate concern areas', () => {
      expect(() => ConcernAreaSchema.parse('db')).not.toThrow();
      expect(() => ConcernAreaSchema.parse('devops')).not.toThrow();
      expect(() => ConcernAreaSchema.parse('security')).not.toThrow();
      expect(() => ConcernAreaSchema.parse('testing')).not.toThrow();
      expect(() => ConcernAreaSchema.parse('invalid')).toThrow();
    });

    it('should validate levels', () => {
      expect(() => LevelSchema.parse('mvp')).not.toThrow();
      expect(() => LevelSchema.parse('prod')).not.toThrow();
      expect(() => LevelSchema.parse('invalid')).toThrow();
    });

    it('should validate formats', () => {
      expect(() => FormatSchema.parse('md')).not.toThrow();
      expect(() => FormatSchema.parse('json')).not.toThrow();
      expect(() => FormatSchema.parse('invalid')).toThrow();
    });
  });
});
