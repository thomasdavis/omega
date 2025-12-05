import { describe, it, expect } from 'vitest';
import { TechTranslationSpecSchema } from '../src/types.js';

describe('TechTranslationSpecSchema', () => {
  it('should validate a complete valid spec', () => {
    const validSpec = {
      summary: 'Test specification',
      assumptions: ['Assumption 1'],
      risks: ['Risk 1'],
      non_goals: ['Non-goal 1'],
      api_design: {
        endpoints: [
          { method: 'GET', path: '/api/test', description: 'Test endpoint' },
        ],
        models: [
          {
            name: 'TestModel',
            fields: [
              { name: 'id', type: 'string', required: true },
            ],
          },
        ],
      },
      data_model: {
        tables: [
          {
            name: 'test_table',
            columns: [
              { name: 'id', type: 'uuid', nullable: false },
            ],
          },
        ],
      },
      infra: {
        services: ['API'],
        dependencies: ['PostgreSQL'],
        deployment: 'Railway',
      },
      security: {
        authentication: 'JWT',
        authorization: 'RBAC',
        data_protection: ['Encrypt data'],
      },
      testing: {
        unit_tests: ['Test 1'],
        integration_tests: ['Test 2'],
        e2e_tests: ['Test 3'],
      },
      acceptance_criteria: ['Criterion 1'],
      tasks: [
        {
          id: 'task-1',
          title: 'Task 1',
          description: 'Description',
        },
      ],
    };

    const result = TechTranslationSpecSchema.safeParse(validSpec);
    expect(result.success).toBe(true);
  });

  it('should reject spec missing required fields', () => {
    const invalidSpec = {
      summary: 'Test',
      // Missing other required fields
    };

    const result = TechTranslationSpecSchema.safeParse(invalidSpec);
    expect(result.success).toBe(false);
  });

  it('should accept optional task fields', () => {
    const specWithOptionalTaskFields = {
      summary: 'Test',
      assumptions: [],
      risks: [],
      non_goals: [],
      api_design: {
        endpoints: [],
        models: [],
      },
      data_model: {
        tables: [],
      },
      infra: {
        services: [],
        dependencies: [],
        deployment: 'TBD',
      },
      security: {
        authentication: 'TBD',
        authorization: 'TBD',
        data_protection: [],
      },
      testing: {
        unit_tests: [],
        integration_tests: [],
        e2e_tests: [],
      },
      acceptance_criteria: [],
      tasks: [
        {
          id: 'task-1',
          title: 'Task 1',
          description: 'Description',
          dependencies: ['task-0'],
          estimate: '2 days',
        },
      ],
    };

    const result = TechTranslationSpecSchema.safeParse(specWithOptionalTaskFields);
    expect(result.success).toBe(true);
  });
});
