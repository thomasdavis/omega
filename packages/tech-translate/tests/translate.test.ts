import { describe, it, expect } from 'vitest';
import { translateTech, TechTranslationSpecSchema } from '../src/index.js';

describe('translateTech', () => {
  it('should return markdown by default', async () => {
    const result = await translateTech('add live status page');
    expect(typeof result).toBe('string');
    expect(result).toContain('# Technical Specification');
    expect(result).toContain('add live status page');
  });

  it('should return TechTranslationSpec object for json format', async () => {
    const result = await translateTech('add live status page', { format: 'json' });
    expect(typeof result).toBe('object');

    // Validate against Zod schema
    const parseResult = TechTranslationSpecSchema.safeParse(result);
    expect(parseResult.success).toBe(true);
  });

  it('should respect level option (mvp vs prod)', async () => {
    const mvpResult = await translateTech('add auth', { format: 'json', level: 'mvp' });
    const prodResult = await translateTech('add auth', { format: 'json', level: 'prod' });

    expect(mvpResult).toBeDefined();
    expect(prodResult).toBeDefined();

    // Both should be valid specs
    expect(TechTranslationSpecSchema.safeParse(mvpResult).success).toBe(true);
    expect(TechTranslationSpecSchema.safeParse(prodResult).success).toBe(true);
  });

  it('should respect include options', async () => {
    const result = await translateTech('add feature', {
      format: 'json',
      include: { db: false, devops: false, security: false, testing: false },
    });

    expect(typeof result).toBe('object');
    const spec = result as any;

    // Should have empty arrays/objects for excluded sections
    expect(spec.data_model.tables).toHaveLength(0);
    expect(spec.testing.unit_tests).toHaveLength(0);
  });

  it('should include all sections when specified', async () => {
    const result = await translateTech('add feature', {
      format: 'json',
      include: { db: true, devops: true, security: true, testing: true },
    });

    expect(typeof result).toBe('object');
    const spec = result as any;

    // Should have content for included sections
    expect(spec.data_model.tables.length).toBeGreaterThan(0);
    expect(spec.testing.unit_tests.length).toBeGreaterThan(0);
    expect(spec.security.data_protection.length).toBeGreaterThan(0);
  });
});
