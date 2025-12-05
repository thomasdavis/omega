import { describe, it, expect } from 'vitest';
import { TechSpecSchema, DOMAINS, STYLE_PRESETS, DEPTH_LEVELS } from './index.js';

describe('TechSpec Schema', () => {
  it('should validate a minimal spec', () => {
    const minimalSpec = {
      summary: 'Test summary',
      requirements: {
        functional: ['Feature 1', 'Feature 2'],
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0',
      },
    };

    const result = TechSpecSchema.safeParse(minimalSpec);
    expect(result.success).toBe(true);
  });

  it('should validate a complete spec', () => {
    const completeSpec = {
      summary: 'Complete test summary',
      assumptions: ['Assumption 1', 'Assumption 2'],
      requirements: {
        functional: ['Feature 1'],
        nonFunctional: ['Performance requirement'],
        constraints: ['Budget constraint'],
      },
      apiInterfaces: {
        endpoints: [
          {
            method: 'GET',
            path: '/api/users',
            description: 'List users',
          },
        ],
      },
      dataModel: {
        entities: [
          {
            name: 'User',
            description: 'User entity',
            fields: [
              {
                name: 'id',
                type: 'string',
                required: true,
                description: 'User ID',
              },
            ],
          },
        ],
      },
      risks: [
        {
          description: 'Data loss',
          severity: 'high',
          mitigation: 'Regular backups',
        },
      ],
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0',
      },
    };

    const result = TechSpecSchema.safeParse(completeSpec);
    expect(result.success).toBe(true);
  });

  it('should reject invalid severity levels', () => {
    const invalidSpec = {
      summary: 'Test',
      requirements: { functional: [] },
      risks: [
        {
          description: 'Risk',
          severity: 'invalid',
          mitigation: 'Fix',
        },
      ],
      metadata: {
        generatedAt: new Date().toISOString(),
      },
    };

    const result = TechSpecSchema.safeParse(invalidSpec);
    expect(result.success).toBe(false);
  });
});

describe('Constants', () => {
  it('should export DOMAINS', () => {
    expect(DOMAINS).toContain('web');
    expect(DOMAINS).toContain('api');
    expect(DOMAINS).toContain('database');
  });

  it('should export STYLE_PRESETS', () => {
    expect(STYLE_PRESETS).toContain('enterprise');
    expect(STYLE_PRESETS).toContain('startup');
  });

  it('should export DEPTH_LEVELS', () => {
    expect(DEPTH_LEVELS).toContain('low');
    expect(DEPTH_LEVELS).toContain('medium');
    expect(DEPTH_LEVELS).toContain('high');
  });
});
