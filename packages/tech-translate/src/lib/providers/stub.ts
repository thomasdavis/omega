import type { LLMProvider, TranslateOptions, TechTranslationSpec } from '../../types/index.js';

export class StubProvider implements LLMProvider {
  async translate(request: string, options?: TranslateOptions): Promise<TechTranslationSpec> {
    const level = options?.level || 'prod';
    const includeDb = options?.include?.db ?? true;
    const includeDevops = options?.include?.devops ?? true;
    const includeSecurity = options?.include?.security ?? true;
    const includeTesting = options?.include?.testing ?? true;

    const spec: TechTranslationSpec = {
      summary: `Tech translation for: "${request}"`,
      assumptions: [
        'This is a stub implementation',
        `Specification level: ${level}`,
      ],
      risks: [
        'Stub provider does not generate real specifications',
        'Replace with actual LLM provider for production use',
      ],
      non_goals: [
        'Real LLM integration (to be implemented)',
      ],
      acceptance_criteria: [
        'Stub specification generated successfully',
        'All required fields populated',
      ],
      tasks: [
        {
          title: 'Integrate real LLM provider',
          description: 'Replace StubProvider with actual LLM integration',
          estimate: 'TBD',
        },
      ],
    };

    if (includeDb) {
      spec.data_model = {
        entities: [
          {
            name: 'Example',
            fields: [
              { name: 'id', type: 'string', required: true },
              { name: 'createdAt', type: 'timestamp', required: true },
            ],
          },
        ],
      };
    }

    if (includeDevops) {
      spec.infra = {
        services: ['Example service'],
        dependencies: ['Node.js', 'PostgreSQL'],
      };
    }

    if (includeSecurity) {
      spec.security = {
        authentication: 'To be determined',
        authorization: 'To be determined',
        considerations: ['Input validation', 'Rate limiting'],
      };
    }

    if (includeTesting) {
      spec.testing = {
        unit_tests: ['Test core functionality'],
        integration_tests: ['Test integration points'],
        e2e_tests: ['Test end-to-end user flows'],
      };
    }

    return spec;
  }
}
