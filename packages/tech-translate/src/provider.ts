import type { LLMProvider, TranslationOptions, TechTranslationSpec } from './types.js';

/**
 * Stub LLM Provider (v0)
 * This is a placeholder that returns a sample spec.
 * Will be replaced with actual LLM integration in future iterations.
 */
export class StubProvider implements LLMProvider {
  async translate(request: string, options: TranslationOptions): Promise<TechTranslationSpec> {
    const includeDb = options.include?.db !== false;
    const includeDevops = options.include?.devops !== false;
    const includeSecurity = options.include?.security !== false;
    const includeTesting = options.include?.testing !== false;

    // Generate a stub spec based on the request and options
    const spec: TechTranslationSpec = {
      summary: `Technical specification for: ${request}`,
      assumptions: [
        'User has access to required development environment',
        'Existing authentication system is in place',
        options.level === 'mvp' ? 'MVP scope - minimal viable features only' : 'Production-ready implementation required',
      ],
      risks: [
        'Scope creep if requirements are not clearly defined',
        options.level === 'prod' ? 'Performance impact if not properly optimized' : 'Technical debt if MVP shortcuts are taken',
      ],
      non_goals: [
        'Backwards compatibility with legacy systems',
        options.level === 'mvp' ? 'Advanced features and optimizations' : 'MVP-level implementation',
      ],
      api_design: {
        endpoints: [
          {
            method: 'GET',
            path: '/api/resource',
            description: 'Retrieve resource data',
          },
          {
            method: 'POST',
            path: '/api/resource',
            description: 'Create new resource',
          },
        ],
        models: [
          {
            name: 'Resource',
            fields: [
              { name: 'id', type: 'string', required: true },
              { name: 'name', type: 'string', required: true },
              { name: 'createdAt', type: 'Date', required: true },
            ],
          },
        ],
      },
      data_model: includeDb
        ? {
            tables: [
              {
                name: 'resources',
                columns: [
                  { name: 'id', type: 'uuid', nullable: false },
                  { name: 'name', type: 'varchar(255)', nullable: false },
                  { name: 'created_at', type: 'timestamp', nullable: false },
                ],
                indexes: ['id', 'created_at'],
              },
            ],
          }
        : { tables: [] },
      infra: includeDevops
        ? {
            services: ['API Server', 'Database', 'Cache'],
            dependencies: ['PostgreSQL', 'Redis'],
            deployment: 'Railway with Docker containers',
          }
        : {
            services: ['API Server'],
            dependencies: [],
            deployment: 'TBD',
          },
      security: includeSecurity
        ? {
            authentication: 'JWT-based authentication',
            authorization: 'Role-based access control (RBAC)',
            data_protection: ['Encrypt sensitive data at rest', 'Use HTTPS for all API calls', 'Input validation and sanitization'],
          }
        : {
            authentication: 'TBD',
            authorization: 'TBD',
            data_protection: [],
          },
      testing: includeTesting
        ? {
            unit_tests: ['Test resource creation', 'Test resource retrieval', 'Test input validation'],
            integration_tests: ['Test API endpoints', 'Test database operations'],
            e2e_tests: ['Test complete user flow'],
          }
        : {
            unit_tests: [],
            integration_tests: [],
            e2e_tests: [],
          },
      acceptance_criteria: [
        'API endpoints respond correctly',
        'Data is persisted correctly',
        options.level === 'prod' ? 'All tests pass with >80% coverage' : 'Core functionality works',
        'Documentation is complete',
      ],
      tasks: [
        {
          id: 'task-1',
          title: 'Set up project structure',
          description: 'Initialize project with required dependencies',
          estimate: options.level === 'mvp' ? '1 day' : '2 days',
        },
        {
          id: 'task-2',
          title: 'Implement API endpoints',
          description: 'Create REST API endpoints for resource management',
          dependencies: ['task-1'],
          estimate: options.level === 'mvp' ? '2 days' : '4 days',
        },
        ...(includeDb
          ? [
              {
                id: 'task-3',
                title: 'Set up database schema',
                description: 'Create database tables and migrations',
                dependencies: ['task-1'],
                estimate: options.level === 'mvp' ? '1 day' : '2 days',
              },
            ]
          : []),
        ...(includeTesting
          ? [
              {
                id: 'task-4',
                title: 'Write tests',
                description: 'Implement unit, integration, and e2e tests',
                dependencies: ['task-2'],
                estimate: options.level === 'mvp' ? '1 day' : '3 days',
              },
            ]
          : []),
      ],
    };

    return spec;
  }
}

/**
 * Get the default LLM provider
 * In the future, this will check environment variables to determine which provider to use
 */
export function getDefaultProvider(): LLMProvider {
  // TODO: Check for env vars (OPENAI_API_KEY, etc.) and return appropriate provider
  return new StubProvider();
}
