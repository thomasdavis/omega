/**
 * Tech Translation Tool
 *
 * Converts casual/high-level user requests into comprehensive, implementation-ready technical specifications.
 * Applies charitable interpretation, best practices, and refined technical taste.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getDatabase } from '@repo/database';

/**
 * JSON Schema for structured technical specifications
 */
const TechSpecSchema = z.object({
  title: z.string(),
  summary: z.string(),
  assumptions: z.array(z.string()),
  goals: z.array(z.string()),
  nonGoals: z.array(z.string()),
  requirements: z.object({
    functional: z.array(z.string()),
    nonFunctional: z.array(z.string()),
  }),
  architecture: z.object({
    contextDiagram: z.string(),
    components: z.array(z.object({
      name: z.string(),
      responsibilities: z.array(z.string()),
      tech: z.string(),
    })),
    tradeoffs: z.array(z.string()),
  }),
  dataModel: z.array(z.object({
    entity: z.string(),
    table: z.string(),
    columns: z.array(z.object({
      name: z.string(),
      type: z.string(),
      nullable: z.boolean(),
      default: z.string().optional(),
      constraints: z.array(z.string()).optional(),
    })),
    indexes: z.array(z.string()),
    relations: z.array(z.string()),
  })),
  apis: z.array(z.object({
    style: z.enum(['http', 'graphql', 'event']),
    method: z.string().optional(),
    path: z.string().optional(),
    requestExample: z.record(z.any()).optional(),
    responseExample: z.record(z.any()).optional(),
    errors: z.array(z.string()).optional(),
  })),
  devOps: z.object({
    ci: z.array(z.string()),
    cd: z.array(z.string()),
    infra: z.array(z.string()),
    observability: z.array(z.string()),
  }),
  security: z.object({
    threats: z.array(z.string()),
    mitigations: z.array(z.string()),
  }),
  privacy: z.object({
    dataCollected: z.array(z.string()),
    retention: z.string(),
    dpa: z.array(z.string()),
  }),
  rollout: z.object({
    flags: z.array(z.string()),
    phases: z.array(z.string()),
  }),
  acceptanceCriteria: z.array(z.string()),
  tests: z.object({
    unit: z.array(z.string()),
    integration: z.array(z.string()),
    e2e: z.array(z.string()),
  }),
  metrics: z.array(z.string()),
  workBreakdown: z.array(z.object({
    id: z.string(),
    title: z.string(),
    estimate: z.string(),
    dependencies: z.array(z.string()).optional(),
  })),
  risks: z.array(z.string()),
});

type TechSpec = z.infer<typeof TechSpecSchema>;

/**
 * Generate comprehensive prompt for tech translation
 */
function buildTechTranslationPrompt(
  request: string,
  depth: 'basic' | 'thorough' | 'comprehensive',
  targetStack?: { runtime?: string; db?: string; deploy?: string },
  constraints?: string[]
): string {
  const stack = {
    runtime: targetStack?.runtime || 'Node.js/TypeScript',
    db: targetStack?.db || 'PostgreSQL',
    deploy: targetStack?.deploy || 'Railway.app',
  };

  return `You are a senior technical architect with deep expertise in software engineering, DevOps, databases, security, and system design. Your task is to translate a user's request into a comprehensive, implementation-ready technical specification.

## User Request
${request}

## Your Mission
Apply the most charitable interpretation of the user's intent. Assume good faith and design a refined solution with:
- Clean architecture and strong code smell avoidance
- Best practices across all technical domains
- Thorough consideration of security, privacy, testing, and operations
- Practical, actionable specifications ready for implementation

## Target Stack
- Runtime: ${stack.runtime}
- Database: ${stack.db}
- Deployment: ${stack.deploy}

${constraints && constraints.length > 0 ? `## Constraints\n${constraints.map(c => `- ${c}`).join('\n')}\n` : ''}

## Specification Depth
${depth === 'basic' ? 'Provide essential details only, focusing on core requirements and architecture.' : ''}
${depth === 'thorough' ? 'Provide comprehensive details including data models, APIs, DevOps, security, and testing.' : ''}
${depth === 'comprehensive' ? 'Provide exhaustive details across all domains, including rollout strategy, metrics, work breakdown, and risk analysis.' : ''}

## Best Practices to Apply

### Database Design
- Use TIMESTAMPTZ for all timestamps
- SERIAL for auto-incrementing IDs
- JSONB for flexible metadata
- Foreign key constraints with ON DELETE CASCADE where appropriate
- Indexes on frequently queried columns (user_id, created_at, status, etc.)
- GIN indexes for JSONB and full-text search
- Consider data retention and archival strategies

### API Design
- RESTful conventions (GET for reads, POST for creates, PATCH for updates, DELETE for deletes)
- Proper HTTP status codes
- Versioned endpoints (/v1/, /v2/)
- Request/response examples with realistic data
- Error handling with clear error codes and messages
- Rate limiting and pagination

### Security
- Input validation and sanitization
- Authentication and authorization (JWT, session-based, OAuth)
- HTTPS only
- Secure headers (CORS, CSP, X-Frame-Options)
- Rate limiting
- SQL injection prevention (parameterized queries)
- XSS prevention
- CSRF protection
- Dependency scanning
- Secret management (environment variables, never in code)
- Principle of least privilege

### DevOps & Operations
- Health check endpoints
- Structured logging with correlation IDs
- Distributed tracing
- Metrics and dashboards (response time, error rate, throughput)
- Alerts and runbooks
- CI/CD pipeline (test, build, deploy)
- Environment parity (dev, staging, production)
- Database migrations (idempotent, versioned, rollback-safe)
- Feature flags for gradual rollout
- Backup and disaster recovery

### Testing
- Unit tests for business logic
- Integration tests for API endpoints and database queries
- End-to-end tests for critical user flows
- Test coverage targets (>80% for critical paths)
- Mocking strategies for external dependencies

### Code Quality
- TypeScript for type safety
- ESLint and Prettier for consistency
- Clear naming conventions
- Single Responsibility Principle
- DRY (Don't Repeat Yourself)
- SOLID principles
- Error handling at system boundaries
- Documentation for non-obvious logic

## Output Format
Provide a structured JSON specification that covers:
1. Title, summary, and assumptions
2. Goals and non-goals
3. Functional and non-functional requirements
4. Architecture with components and tradeoffs
5. Data model with tables, columns, indexes, and relations
6. API contracts with examples
7. DevOps plan (CI/CD, infrastructure, observability)
8. Security threats and mitigations
9. Privacy considerations (data collected, retention, DPA compliance)
10. Rollout strategy (feature flags, phases)
11. Acceptance criteria
12. Testing strategy (unit, integration, e2e)
13. Metrics to track
14. Work breakdown with estimates and dependencies
15. Risks and mitigation strategies

Generate the specification now.`;
}

/**
 * Convert structured spec to formatted Markdown
 */
function formatSpecAsMarkdown(spec: TechSpec): string {
  let markdown = `# ${spec.title}\n\n`;
  markdown += `## Summary\n${spec.summary}\n\n`;

  if (spec.assumptions.length > 0) {
    markdown += `## Assumptions\n${spec.assumptions.map(a => `- ${a}`).join('\n')}\n\n`;
  }

  markdown += `## Goals\n${spec.goals.map(g => `- ${g}`).join('\n')}\n\n`;

  if (spec.nonGoals.length > 0) {
    markdown += `## Non-Goals\n${spec.nonGoals.map(g => `- ${g}`).join('\n')}\n\n`;
  }

  markdown += `## Requirements\n\n`;
  markdown += `### Functional\n${spec.requirements.functional.map(r => `- ${r}`).join('\n')}\n\n`;
  markdown += `### Non-Functional\n${spec.requirements.nonFunctional.map(r => `- ${r}`).join('\n')}\n\n`;

  markdown += `## Architecture\n\n`;
  markdown += `### Context\n${spec.architecture.contextDiagram}\n\n`;
  markdown += `### Components\n`;
  spec.architecture.components.forEach(comp => {
    markdown += `\n**${comp.name}** (${comp.tech})\n`;
    markdown += comp.responsibilities.map(r => `- ${r}`).join('\n') + '\n';
  });
  if (spec.architecture.tradeoffs.length > 0) {
    markdown += `\n### Tradeoffs\n${spec.architecture.tradeoffs.map(t => `- ${t}`).join('\n')}\n`;
  }
  markdown += '\n';

  if (spec.dataModel.length > 0) {
    markdown += `## Data Model\n\n`;
    spec.dataModel.forEach(model => {
      markdown += `### ${model.entity} (\`${model.table}\`)\n\n`;
      markdown += `**Columns:**\n`;
      model.columns.forEach(col => {
        const nullable = col.nullable ? 'NULL' : 'NOT NULL';
        const def = col.default ? ` DEFAULT ${col.default}` : '';
        const constraints = col.constraints?.length ? ` (${col.constraints.join(', ')})` : '';
        markdown += `- \`${col.name}\` ${col.type} ${nullable}${def}${constraints}\n`;
      });
      if (model.indexes.length > 0) {
        markdown += `\n**Indexes:**\n${model.indexes.map(idx => `- ${idx}`).join('\n')}\n`;
      }
      if (model.relations.length > 0) {
        markdown += `\n**Relations:**\n${model.relations.map(rel => `- ${rel}`).join('\n')}\n`;
      }
      markdown += '\n';
    });
  }

  if (spec.apis.length > 0) {
    markdown += `## API Contracts\n\n`;
    spec.apis.forEach((api, idx) => {
      markdown += `### API ${idx + 1}: ${api.style.toUpperCase()}`;
      if (api.method && api.path) {
        markdown += ` ${api.method} ${api.path}`;
      }
      markdown += '\n\n';
      if (api.requestExample) {
        markdown += `**Request:**\n\`\`\`json\n${JSON.stringify(api.requestExample, null, 2)}\n\`\`\`\n\n`;
      }
      if (api.responseExample) {
        markdown += `**Response:**\n\`\`\`json\n${JSON.stringify(api.responseExample, null, 2)}\n\`\`\`\n\n`;
      }
      if (api.errors && api.errors.length > 0) {
        markdown += `**Errors:**\n${api.errors.map(e => `- ${e}`).join('\n')}\n\n`;
      }
    });
  }

  markdown += `## DevOps\n\n`;
  markdown += `### CI\n${spec.devOps.ci.map(item => `- ${item}`).join('\n')}\n\n`;
  markdown += `### CD\n${spec.devOps.cd.map(item => `- ${item}`).join('\n')}\n\n`;
  markdown += `### Infrastructure\n${spec.devOps.infra.map(item => `- ${item}`).join('\n')}\n\n`;
  markdown += `### Observability\n${spec.devOps.observability.map(item => `- ${item}`).join('\n')}\n\n`;

  markdown += `## Security\n\n`;
  markdown += `### Threats\n${spec.security.threats.map(t => `- ${t}`).join('\n')}\n\n`;
  markdown += `### Mitigations\n${spec.security.mitigations.map(m => `- ${m}`).join('\n')}\n\n`;

  markdown += `## Privacy\n\n`;
  markdown += `**Data Collected:** ${spec.privacy.dataCollected.join(', ')}\n\n`;
  markdown += `**Retention:** ${spec.privacy.retention}\n\n`;
  if (spec.privacy.dpa.length > 0) {
    markdown += `**DPA Considerations:**\n${spec.privacy.dpa.map(d => `- ${d}`).join('\n')}\n\n`;
  }

  markdown += `## Rollout Strategy\n\n`;
  if (spec.rollout.flags.length > 0) {
    markdown += `**Feature Flags:**\n${spec.rollout.flags.map(f => `- ${f}`).join('\n')}\n\n`;
  }
  markdown += `**Phases:**\n${spec.rollout.phases.map(p => `- ${p}`).join('\n')}\n\n`;

  markdown += `## Acceptance Criteria\n${spec.acceptanceCriteria.map(a => `- [ ] ${a}`).join('\n')}\n\n`;

  markdown += `## Testing Strategy\n\n`;
  markdown += `### Unit Tests\n${spec.tests.unit.map(t => `- ${t}`).join('\n')}\n\n`;
  markdown += `### Integration Tests\n${spec.tests.integration.map(t => `- ${t}`).join('\n')}\n\n`;
  markdown += `### E2E Tests\n${spec.tests.e2e.map(t => `- ${t}`).join('\n')}\n\n`;

  markdown += `## Metrics\n${spec.metrics.map(m => `- ${m}`).join('\n')}\n\n`;

  markdown += `## Work Breakdown\n\n`;
  spec.workBreakdown.forEach(task => {
    markdown += `- **${task.id}**: ${task.title} (${task.estimate})`;
    if (task.dependencies && task.dependencies.length > 0) {
      markdown += ` - Depends on: ${task.dependencies.join(', ')}`;
    }
    markdown += '\n';
  });
  markdown += '\n';

  if (spec.risks.length > 0) {
    markdown += `## Risks\n${spec.risks.map(r => `- ${r}`).join('\n')}\n\n`;
  }

  return markdown;
}

/**
 * Tech Translation Tool
 */
export const techTranslateTool = tool({
  description: `Convert casual or high-level user requests into comprehensive, implementation-ready technical specifications.

This tool applies charitable interpretation and proposes refined solutions with best practices across:
- Software engineering (clean code, SOLID principles)
- Database design (PostgreSQL best practices, indexing)
- DevOps (CI/CD, observability, deployment)
- Security (threat modeling, mitigations)
- Testing (unit, integration, e2e)

Outputs both human-readable Markdown and machine-readable JSON for automation.

Use when users need help translating vague requirements into actionable technical specs.`,
  inputSchema: z.object({
    request: z.string().describe('The user\'s request or feature idea to translate into a technical spec'),
    depth: z.enum(['basic', 'thorough', 'comprehensive']).optional().default('thorough').describe('Level of detail: basic (essentials only), thorough (recommended), comprehensive (exhaustive)'),
    output: z.enum(['markdown', 'json', 'both']).optional().default('both').describe('Output format'),
    targetStack: z.object({
      runtime: z.string().optional(),
      db: z.string().optional(),
      deploy: z.string().optional(),
    }).optional().describe('Target technology stack (defaults: Node.js/TypeScript, PostgreSQL, Railway)'),
    constraints: z.array(z.string()).optional().describe('Constraints like HIPAA compliance, EU-only, budget caps'),
    autoCreateIssue: z.boolean().optional().default(false).describe('Automatically create a GitHub issue from the spec'),
    userId: z.string().optional().describe('User ID for tracking'),
    username: z.string().optional().describe('Username for tracking'),
  }),
  execute: async ({
    request,
    depth = 'thorough',
    output = 'both',
    targetStack,
    constraints,
    autoCreateIssue,
    userId,
    username
  }) => {
    try {
      console.log(`🔧 [techTranslate] Starting translation for: "${request.substring(0, 100)}..."`);
      console.log(`📊 [techTranslate] Depth: ${depth}, Output: ${output}`);

      // Generate the technical specification using structured output
      const prompt = buildTechTranslationPrompt(request, depth, targetStack, constraints);

      console.log(`🤖 [techTranslate] Generating spec with GPT-4o...`);
      const { object: spec } = await generateObject({
        model: openai('gpt-4o'),
        schema: TechSpecSchema,
        prompt,
      });

      console.log(`✅ [techTranslate] Spec generated: "${spec.title}"`);

      // Format as Markdown if requested
      let markdown: string | undefined;
      if (output === 'markdown' || output === 'both') {
        markdown = formatSpecAsMarkdown(spec);
        console.log(`📝 [techTranslate] Markdown formatted (${markdown.length} chars)`);
      }

      // Prepare JSON output
      const jsonOutput = (output === 'json' || output === 'both') ? spec : undefined;

      // Save to database
      try {
        const db = await getDatabase();
        const result = await db.query(
          `INSERT INTO tech_translations
           (user_id, username, source_text, output_markdown, output_json, assumptions, risks, model, prompt_version, tags, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
           RETURNING id`,
          [
            userId || 'unknown',
            username || null,
            request,
            markdown || null,
            jsonOutput ? JSON.stringify(jsonOutput) : null,
            JSON.stringify(spec.assumptions),
            JSON.stringify(spec.risks),
            'gpt-4o',
            '1.0.0',
            [], // tags - could be extracted from request
          ]
        );
        const translationId = (result.rows[0] as any).id;
        console.log(`💾 [techTranslate] Saved to database with ID: ${translationId}`);
      } catch (dbError) {
        console.error(`⚠️ [techTranslate] Failed to save to database:`, dbError);
        // Don't fail the whole operation if database save fails
      }

      // Auto-create GitHub issue if requested
      let issueUrl: string | undefined;
      if (autoCreateIssue) {
        console.log(`🔗 [techTranslate] Creating GitHub issue...`);
        try {
          const { githubCreateIssueTool } = await import('./github/createIssue.js');
          const issueResult = await githubCreateIssueTool.execute({
            title: spec.title,
            body: markdown || `# ${spec.title}\n\n${spec.summary}`,
            labels: ['enhancement', 'tech-spec'],
          });

          if ('success' in issueResult && issueResult.success) {
            issueUrl = issueResult.issueUrl;
            console.log(`✅ [techTranslate] GitHub issue created: ${issueUrl}`);
          } else if ('error' in issueResult) {
            console.error(`❌ [techTranslate] Failed to create issue:`, issueResult.error);
          }
        } catch (issueError) {
          console.error(`❌ [techTranslate] Error creating GitHub issue:`, issueError);
        }
      }

      const result = {
        success: true,
        message: `Technical specification generated successfully for: ${spec.title}`,
        markdown,
        json: jsonOutput,
        assumptions: spec.assumptions,
        risks: spec.risks,
        issueUrl,
      };

      console.log(`🎉 [techTranslate] Translation complete!`);
      return result;
    } catch (error) {
      console.error(`❌ [techTranslate] Error during translation:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during tech translation',
      };
    }
  },
});
