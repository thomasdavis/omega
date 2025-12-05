import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { inputSchema, outputSchema, toolManifest } from './schema.js';
import type { TechTranslateInput, TechTranslateOutput } from './schema.js';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validateInput = ajv.compile(inputSchema);
const validateOutput = ajv.compile(outputSchema);

/**
 * Main Tech Translate function
 *
 * This is a placeholder implementation that demonstrates the structure.
 * Full LLM-based translation logic can be added in future iterations.
 */
export async function runTechTranslate(
  input: TechTranslateInput
): Promise<TechTranslateOutput> {
  // Validate input
  if (!validateInput(input)) {
    const errors = validateInput.errors?.map((e) => `${e.instancePath} ${e.message}`).join(', ');
    throw new Error(`Invalid input: ${errors}`);
  }

  // Apply defaults
  const audience = input.audience || 'mixed';
  const assumptions = input.assumptions || [];
  const constraints = input.constraints || [];

  // Placeholder translation logic
  // In a full implementation, this would use an LLM to generate the spec
  const output: TechTranslateOutput = {
    title: generateTitle(input.request),
    summary: generateSummary(input.request, audience),
    spec: {
      goals: generateGoals(input.request),
      nonGoals: generateNonGoals(input.request),
      architecture: generateArchitecture(input.request, audience),
      apiDesign: generateApiDesign(input.request, audience),
      dataModel: generateDataModel(input.request),
      security: generateSecurity(input.request),
      devOps: generateDevOps(input.request),
      testing: generateTesting(input.request),
      observability: generateObservability(input.request),
      migrationPlan: generateMigrationPlan(input.request),
      acceptanceCriteria: generateAcceptanceCriteria(input.request),
    },
    artifacts: generateArtifacts(input.request),
    notes: generateNotes(assumptions, constraints),
    warnings: generateWarnings(input.request),
  };

  // Validate output
  if (!validateOutput(output)) {
    const errors = validateOutput.errors?.map((e) => `${e.instancePath} ${e.message}`).join(', ');
    throw new Error(`Invalid output: ${errors}`);
  }

  return output;
}

// Placeholder helper functions (deterministic for testing)
function generateTitle(request: string): string {
  return `Technical Specification: ${capitalize(request)}`;
}

function generateSummary(request: string, audience: string): string {
  return `This specification provides a comprehensive technical plan for implementing: "${request}". Tailored for ${audience} audience with best practices and industry standards.`;
}

function generateGoals(request: string): string[] {
  return [
    `Implement ${request} with high reliability and performance`,
    'Ensure scalability and maintainability',
    'Follow security best practices',
  ];
}

function generateNonGoals(request: string): string[] {
  return [
    'Implementation of unrelated features',
    'Breaking changes to existing APIs without migration path',
  ];
}

function generateArchitecture(request: string, audience: string): string {
  return `The architecture for ${request} will follow a modular design pattern suitable for ${audience} teams. Key components include:\n\n- Core service layer for business logic\n- API layer for external interfaces\n- Data persistence layer\n- Monitoring and observability infrastructure`;
}

function generateApiDesign(request: string, audience: string): string {
  return `API design will follow RESTful principles with clear resource modeling:\n\n- Endpoints: Resource-based URLs\n- Methods: Standard HTTP verbs (GET, POST, PUT, DELETE)\n- Authentication: Token-based auth with proper scoping\n- Versioning: URL-based versioning (e.g., /v1/...)`;
}

function generateDataModel(request: string): string {
  return `Data model will be normalized and designed for ${request}:\n\n- Primary entities and their relationships\n- Indexing strategy for performance\n- Data validation rules\n- Migration strategy`;
}

function generateSecurity(request: string): string {
  return `Security considerations for ${request}:\n\n- Input validation and sanitization\n- Authentication and authorization\n- Rate limiting and DDoS protection\n- Encryption at rest and in transit\n- Security headers and CORS policy`;
}

function generateDevOps(request: string): string {
  return `DevOps pipeline for ${request}:\n\n- CI/CD: Automated build, test, and deployment\n- Infrastructure: IaC with version control\n- Monitoring: Health checks and alerting\n- Deployment strategy: Blue-green or canary deployments`;
}

function generateTesting(request: string): string {
  return `Testing strategy for ${request}:\n\n- Unit tests: >80% code coverage\n- Integration tests: API endpoints and database interactions\n- E2E tests: Critical user flows\n- Performance tests: Load and stress testing`;
}

function generateObservability(request: string): string {
  return `Observability for ${request}:\n\n- Logging: Structured logs with correlation IDs\n- Metrics: Key performance indicators and business metrics\n- Tracing: Distributed tracing for request flows\n- Alerting: Proactive monitoring with actionable alerts`;
}

function generateMigrationPlan(request: string): string {
  return `Migration plan for ${request}:\n\n1. Deploy new infrastructure alongside existing\n2. Run dual-write mode for data consistency\n3. Gradual traffic migration with feature flags\n4. Validation and rollback procedures\n5. Decommission old infrastructure`;
}

function generateAcceptanceCriteria(request: string): string[] {
  return [
    `${capitalize(request)} is fully implemented and deployed`,
    'All tests pass with >80% code coverage',
    'Documentation is complete and reviewed',
    'Performance benchmarks meet requirements',
    'Security audit completed with no critical issues',
  ];
}

function generateArtifacts(request: string): TechTranslateOutput['artifacts'] {
  return [
    {
      type: 'markdown',
      filename: 'IMPLEMENTATION.md',
      content: `# Implementation Plan for ${capitalize(request)}\n\nDetailed implementation steps and considerations.`,
    },
  ];
}

function generateNotes(assumptions: string[], constraints: string[]): string[] {
  const notes: string[] = [];

  if (assumptions.length > 0) {
    notes.push(`Applied assumptions: ${assumptions.join(', ')}`);
  }

  if (constraints.length > 0) {
    notes.push(`Considered constraints: ${constraints.join(', ')}`);
  }

  notes.push('This is a generated technical specification. Review and adapt as needed.');

  return notes;
}

function generateWarnings(request: string): string[] {
  const warnings: string[] = [];

  if (request.length < 10) {
    warnings.push('Very brief request - specification may lack detail. Consider providing more context.');
  }

  return warnings;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Export types and manifest
export type { TechTranslateInput, TechTranslateOutput };
export { toolManifest, inputSchema, outputSchema };
