/**
 * Tests for core translator functionality
 */

import { describe, it, expect, vi } from 'vitest';
import { translateTech } from '../src/core/translator.js';
import type { TranslateInput, TranslateOptions } from '../src/types/index.js';

// Mock provider for testing
vi.mock('../src/providers/index.js', () => ({
  createProvider: () => ({
    name: 'mock',
    generate: async () => ({
      text: JSON.stringify({
        summary: {
          title: 'Test Project',
          overview: 'A test project for validation',
          objectives: ['Objective 1', 'Objective 2'],
          scope: 'Test scope',
        },
        assumptions: {
          assumptions: ['Assumption 1'],
          constraints: ['Constraint 1'],
          dependencies: ['Dependency 1'],
        },
        requirements: {
          functional: [
            {
              id: 'FR-001',
              description: 'Test requirement',
              priority: 'must',
            },
          ],
          nonFunctional: [
            {
              category: 'performance',
              requirement: 'Fast response',
              metric: '< 200ms',
            },
          ],
        },
        testing: {
          strategy: 'Test pyramid',
          testTypes: [
            {
              type: 'unit',
              coverage: '80%',
              tools: ['vitest'],
            },
          ],
          acceptanceCriteria: ['All tests pass'],
        },
        risks: {
          risks: [
            {
              risk: 'Test risk',
              impact: 'medium',
              probability: 'low',
              mitigation: 'Test mitigation',
            },
          ],
        },
        milestones: {
          phases: [
            {
              name: 'Phase 1',
              deliverables: ['Deliverable 1'],
            },
          ],
        },
      }),
      model: 'mock-model',
      tokensUsed: 100,
    }),
  }),
}));

describe('translateTech', () => {
  it('should translate a simple user request', async () => {
    const input: TranslateInput = {
      input: 'Build a todo list app',
    };

    const options: TranslateOptions = {
      depth: 'brief',
      style: 'startup',
      format: 'both',
    };

    const result = await translateTech(input, options);

    expect(result).toBeDefined();
    expect(result.spec).toBeDefined();
    expect(result.markdown).toBeDefined();
    expect(result.spec.summary.title).toBe('Test Project');
    expect(result.metadata.provider).toBe('mock');
  });

  it('should include project context', async () => {
    const input: TranslateInput = {
      input: 'Add user authentication',
      projectContext: 'Existing web application built with React',
    };

    const result = await translateTech(input);

    expect(result).toBeDefined();
    expect(result.spec).toBeDefined();
  });

  it('should handle constraints', async () => {
    const input: TranslateInput = {
      input: 'Build a mobile app',
      constraints: ['Budget: $10k', 'Timeline: 3 months'],
    };

    const result = await translateTech(input);

    expect(result).toBeDefined();
    expect(result.spec).toBeDefined();
  });

  it('should validate input schema', async () => {
    const input: TranslateInput = {
      input: '',
    };

    await expect(translateTech(input)).rejects.toThrow();
  });

  it('should support different depth levels', async () => {
    const input: TranslateInput = {
      input: 'Build an API',
    };

    const depths = ['brief', 'standard', 'high', 'exhaustive'] as const;

    for (const depth of depths) {
      const result = await translateTech(input, { depth });
      expect(result).toBeDefined();
      expect(result.spec.metadata.depth).toBe(depth);
    }
  });

  it('should support different styles', async () => {
    const input: TranslateInput = {
      input: 'Build a data pipeline',
    };

    const styles = ['startup', 'enterprise', 'research', 'academic'] as const;

    for (const style of styles) {
      const result = await translateTech(input, { style });
      expect(result).toBeDefined();
      expect(result.spec.metadata.style).toBe(style);
    }
  });

  it('should include metadata in results', async () => {
    const input: TranslateInput = {
      input: 'Create a microservice',
    };

    const result = await translateTech(input);

    expect(result.metadata).toBeDefined();
    expect(result.metadata.inputLength).toBeGreaterThan(0);
    expect(result.metadata.outputLength).toBeGreaterThan(0);
    expect(result.metadata.provider).toBe('mock');
    expect(result.metadata.duration).toBeGreaterThan(0);
  });
});
