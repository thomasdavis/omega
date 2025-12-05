import { describe, it, expect } from 'vitest';
import { translateTech, setProvider, StubProvider } from '../src/index.js';
import { TechTranslationSpecSchema } from '../src/types/schema.js';

describe('translateTech', () => {
  it('should return markdown by default', async () => {
    const result = await translateTech('add live status page');
    expect(typeof result).toBe('string');
    expect(result).toContain('# Tech Translation Specification');
    expect(result).toContain('## Summary');
  });

  it('should return JSON when format is json', async () => {
    const result = await translateTech('add live status page', { format: 'json' });
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('assumptions');
    expect(result).toHaveProperty('risks');
  });

  it('should validate against schema in json mode', async () => {
    const result = await translateTech('add live status page', { format: 'json' });
    const parsed = TechTranslationSpecSchema.parse(result);
    expect(parsed).toBeDefined();
  });

  it('should respect level option', async () => {
    const result = await translateTech('add live status page', { level: 'mvp' });
    expect(typeof result).toBe('string');
    expect(result).toContain('mvp');
  });

  it('should respect include options', async () => {
    const resultWithDb = await translateTech('add live status page', {
      format: 'json',
      include: { db: true, devops: false, security: false, testing: false },
    });
    expect(resultWithDb).toHaveProperty('data_model');
    expect(resultWithDb).not.toHaveProperty('infra');

    const resultWithoutDb = await translateTech('add live status page', {
      format: 'json',
      include: { db: false, devops: true, security: false, testing: false },
    });
    expect(resultWithoutDb).not.toHaveProperty('data_model');
    expect(resultWithoutDb).toHaveProperty('infra');
  });

  it('should allow custom provider', async () => {
    const customProvider = new StubProvider();
    setProvider(customProvider);
    const result = await translateTech('test request');
    expect(result).toBeDefined();
  });
});

describe('markdown formatting', () => {
  it('should format all sections correctly', async () => {
    const result = await translateTech('add live status page', {
      format: 'markdown',
      include: { db: true, devops: true, security: true, testing: true },
    });

    expect(result).toContain('# Tech Translation Specification');
    expect(result).toContain('## Summary');
    expect(result).toContain('## Assumptions');
    expect(result).toContain('## Risks');
    expect(result).toContain('## Non-Goals');
    expect(result).toContain('## Data Model');
    expect(result).toContain('## Infrastructure');
    expect(result).toContain('## Security');
    expect(result).toContain('## Testing');
    expect(result).toContain('## Acceptance Criteria');
    expect(result).toContain('## Tasks');
  });
});
