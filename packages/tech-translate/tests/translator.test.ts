import { describe, it, expect } from 'vitest';
import { translateTech } from '../src/translator.js';
import type { TranslationResult } from '../src/types.js';

describe('translateTech', () => {
  describe('Markdown output', () => {
    it('should generate markdown by default', async () => {
      const result = await translateTech('Add user authentication');

      expect(typeof result).toBe('string');
      expect(result).toContain('# Technical Specification');
      expect(result).toContain('Add user authentication');
      expect(result).toContain('PROD');
    });

    it('should generate MVP level markdown', async () => {
      const result = await translateTech('Add user authentication', {
        level: 'mvp',
      });

      expect(typeof result).toBe('string');
      expect(result).toContain('MVP');
      expect(result).toContain('Minimum Viable Product');
    });

    it('should include database section when requested', async () => {
      const result = await translateTech('Add user authentication', {
        include: ['db'],
      });

      expect(typeof result).toBe('string');
      expect(result).toContain('## Database');
      expect(result).toContain('### Tables');
      expect(result).toContain('### Migrations');
    });

    it('should include multiple concern sections', async () => {
      const result = await translateTech('Build API server', {
        include: ['db', 'devops', 'security', 'testing'],
      });

      expect(typeof result).toBe('string');
      expect(result).toContain('## Database');
      expect(result).toContain('## DevOps');
      expect(result).toContain('## Security');
      expect(result).toContain('## Testing');
    });
  });

  describe('JSON output', () => {
    it('should generate JSON when format is json', async () => {
      const result = await translateTech('Add user authentication', {
        format: 'json',
      });

      expect(typeof result).toBe('object');
      const jsonResult = result as TranslationResult;

      expect(jsonResult.metadata).toBeDefined();
      expect(jsonResult.metadata.version).toBe('0.1.0');
      expect(jsonResult.metadata.format).toBe('json');
      expect(jsonResult.metadata.level).toBe('prod');

      expect(jsonResult.specification).toBeDefined();
      expect(jsonResult.specification.summary).toContain('Add user authentication');
    });

    it('should include database in JSON when requested', async () => {
      const result = await translateTech('Add user authentication', {
        format: 'json',
        include: ['db'],
      });

      const jsonResult = result as TranslationResult;
      expect(jsonResult.specification.database).toBeDefined();
      expect(jsonResult.specification.database?.tables).toContain('users');
      expect(jsonResult.specification.database?.migrations).toBeInstanceOf(Array);
    });

    it('should include security in JSON when requested', async () => {
      const result = await translateTech('Add user authentication', {
        format: 'json',
        include: ['security'],
      });

      const jsonResult = result as TranslationResult;
      expect(jsonResult.specification.security).toBeDefined();
      expect(jsonResult.specification.security?.considerations).toBeInstanceOf(Array);
      expect(jsonResult.specification.security?.authentication).toBeDefined();
    });

    it('should include all concerns in metadata', async () => {
      const result = await translateTech('Build API', {
        format: 'json',
        include: ['db', 'devops'],
      });

      const jsonResult = result as TranslationResult;
      expect(jsonResult.metadata.concerns).toEqual(['db', 'devops']);
    });
  });

  describe('Input validation', () => {
    it('should reject empty input', async () => {
      await expect(translateTech('')).rejects.toThrow();
    });

    it('should accept valid concern areas', async () => {
      const result = await translateTech('Test', {
        include: ['db', 'devops', 'security', 'testing'],
      });

      expect(result).toBeDefined();
    });
  });
});
