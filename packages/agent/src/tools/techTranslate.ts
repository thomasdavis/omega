/**
 * Tech Translation Tool
 * Converts casual or high-level user requests into comprehensive, implementation-ready technical specifications
 * Applies charitable interpretation and best practices across engineering, DevOps, databases, and security
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '@repo/shared';
import { getPostgresPool } from '@repo/database';

// Zod schema definitions for structured technical specification output
const RequirementsSchema = z.object({
  functional: z.array(z.string()).describe('List of functional requirements'),
  nonFunctional: z.array(z.string()).describe('List of non-functional requirements (performance, security, etc.)'),
});

const ComponentSchema = z.object({
  name: z.string().describe('Component name'),
  responsibilities: z.array(z.string()).describe('What this component is responsible for'),
  tech: z.string().describe('Technology/framework to use'),
});

const ArchitectureSchema = z.object({
  contextDiagram: z.string().optional().describe('ASCII diagram or description of system context'),
  components: z.array(ComponentSchema).describe('System components'),
  tradeoffs: z.array(z.string()).describe('Architecture tradeoffs and decisions'),
});

const ColumnSchema = z.object({
  name: z.string(),
  type: z.string(),
  nullable: z.boolean(),
  default: z.string().optional(),
  constraints: z.array(z.string()).optional(),
});

const DataModelSchema = z.object({
  entity: z.string().describe('Entity name'),
  table: z.string().describe('Database table name'),
  columns: z.array(ColumnSchema).describe('Table columns'),
  indexes: z.array(z.string()).describe('Index definitions'),
  relations: z.array(z.string()).describe('Relationships to other tables'),
});

const APISchema = z.object({
  style: z.enum(['http', 'graphql', 'event']).describe('API style'),
  method: z.string().optional().describe('HTTP method (for REST)'),
  path: z.string().optional().describe('API path'),
  requestExample: z.any().optional().describe('Example request'),
  responseExample: z.any().optional().describe('Example response'),
  errors: z.array(z.string()).optional().describe('Possible error codes'),
});

const DevOpsSchema = z.object({
  ci: z.array(z.string()).describe('CI pipeline steps'),
  cd: z.array(z.string()).describe('CD deployment steps'),
  infra: z.array(z.string()).describe('Infrastructure requirements'),
  observability: z.array(z.string()).describe('Monitoring, logging, tracing'),
});

const SecuritySchema = z.object({
  threats: z.array(z.string()).describe('Potential security threats (STRIDE)'),
  mitigations: z.array(z.string()).describe('Security mitigations'),
});

const PrivacySchema = z.object({
  dataCollected: z.array(z.string()).describe('What data is collected'),
  retention: z.string().describe('Data retention policy'),
  dpa: z.array(z.string()).describe('Data processing agreements needed'),
});

const RolloutSchema = z.object({
  flags: z.array(z.string()).describe('Feature flags'),
  phases: z.array(z.string()).describe('Rollout phases'),
});

const TestsSchema = z.object({
  unit: z.array(z.string()).describe('Unit tests needed'),
  integration: z.array(z.string()).describe('Integration tests needed'),
  e2e: z.array(z.string()).describe('End-to-end tests needed'),
});

const WorkItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  estimate: z.string().describe('Time estimate (e.g., "2-4 hours", "1-2 days")'),
  dependencies: z.array(z.string()).optional(),
});

const TechSpecSchema = z.object({
  title: z.string().describe('Project title'),
  summary: z.string().describe('Brief description'),
  assumptions: z.array(z.string()).describe('Assumptions made'),
  goals: z.array(z.string()).describe('Project goals'),
  nonGoals: z.array(z.string()).describe('Explicitly out of scope'),
  requirements: RequirementsSchema,
  architecture: ArchitectureSchema.optional(),
  dataModel: z.array(DataModelSchema).optional(),
  apis: z.array(APISchema).optional(),
  devOps: DevOpsSchema.optional(),
  security: SecuritySchema.optional(),
  privacy: PrivacySchema.optional(),
  rollout: RolloutSchema.optional(),
  acceptanceCriteria: z.array(z.string()),
  tests: TestsSchema.optional(),
  metrics: z.array(z.string()).optional(),
  workBreakdown: z.array(WorkItemSchema).optional(),
  risks: z.array(z.string()),
});

type TechSpec = z.infer<typeof TechSpecSchema>;

/**
 * Build the prompt for tech translation based on depth and options
 */
function buildTechTranslationPrompt(
  request: string,
  depth: 'basic' | 'thorough' | 'comprehensive',
  targetStack?: { runtime?: string; db?: string; deploy?: string },
  constraints?: string[]
): string {
  const defaultStack = {
    runtime: targetStack?.runtime || 'Node.js/TypeScript',
    db: targetStack?.db || 'PostgreSQL',
    deploy: targetStack?.deploy || 'Railway',
  };

  const depthGuidance = {
    basic: 'Focus on core requirements, basic architecture, and essential acceptance criteria.',
    thorough: 'Include detailed requirements, architecture with tradeoffs, data models, API contracts, and comprehensive acceptance criteria.',
    comprehensive: 'Provide exhaustive coverage: all requirements, detailed architecture, complete data models, API specs with examples, DevOps plan, security analysis (STRIDE), privacy considerations, rollout strategy, full test plan, work breakdown, and risk analysis.',
  };

  return `You are a world-class technical architect. Convert this user request into a detailed, implementation-ready technical specification.

USER REQUEST:
${request}

TARGET STACK:
- Runtime: ${defaultStack.runtime}
- Database: ${defaultStack.db}
- Deployment: ${defaultStack.deploy}

${constraints && constraints.length > 0 ? `CONSTRAINTS:\n${constraints.map(c => `- ${c}`).join('\n')}\n` : ''}

INSTRUCTIONS:
1. Apply the most charitable interpretation of the user's intent
2. Propose a refined solution with clean design and best practices
3. ${depthGuidance[depth]}
4. Use proper database design: TIMESTAMPTZ for timestamps, foreign keys, indexes, JSONB for flexible fields
5. Consider security: input validation, authN/Z, rate limiting, secure headers
6. Plan DevOps: health checks, structured logging, monitoring, alerts
7. Note all assumptions you make

IMPORTANT: Respond with ONLY valid JSON matching this schema:
{
  "title": "string",
  "summary": "string",
  "assumptions": ["string"],
  "goals": ["string"],
  "nonGoals": ["string"],
  "requirements": {
    "functional": ["string"],
    "nonFunctional": ["string"]
  },
  "architecture": {
    "contextDiagram": "string (optional)",
    "components": [{"name": "string", "responsibilities": ["string"], "tech": "string"}],
    "tradeoffs": ["string"]
  },
  "dataModel": [{
    "entity": "string",
    "table": "string",
    "columns": [{"name": "string", "type": "string", "nullable": boolean, "default": "string (optional)", "constraints": ["string (optional)"]}],
    "indexes": ["string"],
    "relations": ["string"]
  }],
  "apis": [{
    "style": "http|graphql|event",
    "method": "string (optional)",
    "path": "string (optional)",
    "requestExample": {} (optional),
    "responseExample": {} (optional),
    "errors": ["string (optional)"]
  }],
  "devOps": {
    "ci": ["string"],
    "cd": ["string"],
    "infra": ["string"],
    "observability": ["string"]
  },
  "security": {
    "threats": ["string"],
    "mitigations": ["string"]
  },
  "privacy": {
    "dataCollected": ["string"],
    "retention": "string",
    "dpa": ["string"]
  },
  "rollout": {
    "flags": ["string"],
    "phases": ["string"]
  },
  "acceptanceCriteria": ["string"],
  "tests": {
    "unit": ["string"],
    "integration": ["string"],
    "e2e": ["string"]
  },
  "metrics": ["string"],
  "workBreakdown": [{"id": "string", "title": "string", "estimate": "string", "dependencies": ["string (optional)"]}],
  "risks": ["string"]
}

Respond with ONLY the JSON object, no markdown formatting, no explanations.`;
}

/**
 * Convert TechSpec JSON to formatted Markdown
 */
function techSpecToMarkdown(spec: TechSpec): string {
  let md = `# ${spec.title}\n\n`;
  md += `${spec.summary}\n\n`;

  if (spec.assumptions.length > 0) {
    md += `## Assumptions\n\n`;
    spec.assumptions.forEach(a => md += `- ${a}\n`);
    md += '\n';
  }

  md += `## Goals\n\n`;
  spec.goals.forEach(g => md += `- ${g}\n`);
  md += '\n';

  if (spec.nonGoals.length > 0) {
    md += `## Non-Goals\n\n`;
    spec.nonGoals.forEach(ng => md += `- ${ng}\n`);
    md += '\n';
  }

  md += `## Requirements\n\n`;
  md += `### Functional\n\n`;
  spec.requirements.functional.forEach(r => md += `- ${r}\n`);
  md += '\n';

  md += `### Non-Functional\n\n`;
  spec.requirements.nonFunctional.forEach(r => md += `- ${r}\n`);
  md += '\n';

  if (spec.architecture) {
    md += `## Architecture\n\n`;
    if (spec.architecture.contextDiagram) {
      md += `### Context Diagram\n\n\`\`\`\n${spec.architecture.contextDiagram}\n\`\`\`\n\n`;
    }
    md += `### Components\n\n`;
    spec.architecture.components.forEach(c => {
      md += `**${c.name}** (${c.tech})\n`;
      c.responsibilities.forEach(r => md += `- ${r}\n`);
      md += '\n';
    });
    if (spec.architecture.tradeoffs.length > 0) {
      md += `### Tradeoffs\n\n`;
      spec.architecture.tradeoffs.forEach(t => md += `- ${t}\n`);
      md += '\n';
    }
  }

  if (spec.dataModel && spec.dataModel.length > 0) {
    md += `## Data Model\n\n`;
    spec.dataModel.forEach(dm => {
      md += `### ${dm.entity} (\`${dm.table}\`)\n\n`;
      md += '| Column | Type | Nullable | Default | Constraints |\n';
      md += '|--------|------|----------|---------|-------------|\n';
      dm.columns.forEach(col => {
        md += `| ${col.name} | ${col.type} | ${col.nullable ? 'Yes' : 'No'} | ${col.default || '-'} | ${col.constraints?.join(', ') || '-'} |\n`;
      });
      md += '\n';
      if (dm.indexes.length > 0) {
        md += `**Indexes:** ${dm.indexes.join(', ')}\n\n`;
      }
      if (dm.relations.length > 0) {
        md += `**Relations:** ${dm.relations.join(', ')}\n\n`;
      }
    });
  }

  if (spec.apis && spec.apis.length > 0) {
    md += `## API Contracts\n\n`;
    spec.apis.forEach((api, idx) => {
      md += `### API ${idx + 1}: ${api.style.toUpperCase()}\n\n`;
      if (api.method && api.path) {
        md += `**Endpoint:** \`${api.method} ${api.path}\`\n\n`;
      }
      if (api.requestExample) {
        md += `**Request Example:**\n\`\`\`json\n${JSON.stringify(api.requestExample, null, 2)}\n\`\`\`\n\n`;
      }
      if (api.responseExample) {
        md += `**Response Example:**\n\`\`\`json\n${JSON.stringify(api.responseExample, null, 2)}\n\`\`\`\n\n`;
      }
      if (api.errors && api.errors.length > 0) {
        md += `**Errors:** ${api.errors.join(', ')}\n\n`;
      }
    });
  }

  if (spec.devOps) {
    md += `## DevOps\n\n`;
    if (spec.devOps.ci.length > 0) {
      md += `### CI\n\n`;
      spec.devOps.ci.forEach(ci => md += `- ${ci}\n`);
      md += '\n';
    }
    if (spec.devOps.cd.length > 0) {
      md += `### CD\n\n`;
      spec.devOps.cd.forEach(cd => md += `- ${cd}\n`);
      md += '\n';
    }
    if (spec.devOps.infra.length > 0) {
      md += `### Infrastructure\n\n`;
      spec.devOps.infra.forEach(i => md += `- ${i}\n`);
      md += '\n';
    }
    if (spec.devOps.observability.length > 0) {
      md += `### Observability\n\n`;
      spec.devOps.observability.forEach(o => md += `- ${o}\n`);
      md += '\n';
    }
  }

  if (spec.security) {
    md += `## Security\n\n`;
    if (spec.security.threats.length > 0) {
      md += `### Threats (STRIDE)\n\n`;
      spec.security.threats.forEach(t => md += `- ${t}\n`);
      md += '\n';
    }
    if (spec.security.mitigations.length > 0) {
      md += `### Mitigations\n\n`;
      spec.security.mitigations.forEach(m => md += `- ${m}\n`);
      md += '\n';
    }
  }

  if (spec.privacy) {
    md += `## Privacy\n\n`;
    md += `**Data Collected:** ${spec.privacy.dataCollected.join(', ')}\n\n`;
    md += `**Retention:** ${spec.privacy.retention}\n\n`;
    if (spec.privacy.dpa.length > 0) {
      md += `**DPA Requirements:** ${spec.privacy.dpa.join(', ')}\n\n`;
    }
  }

  if (spec.rollout) {
    md += `## Rollout Strategy\n\n`;
    if (spec.rollout.flags.length > 0) {
      md += `**Feature Flags:** ${spec.rollout.flags.join(', ')}\n\n`;
    }
    if (spec.rollout.phases.length > 0) {
      md += `**Phases:**\n\n`;
      spec.rollout.phases.forEach((p, idx) => md += `${idx + 1}. ${p}\n`);
      md += '\n';
    }
  }

  md += `## Acceptance Criteria\n\n`;
  spec.acceptanceCriteria.forEach(ac => md += `- ${ac}\n`);
  md += '\n';

  if (spec.tests) {
    md += `## Test Plan\n\n`;
    if (spec.tests.unit.length > 0) {
      md += `### Unit Tests\n\n`;
      spec.tests.unit.forEach(t => md += `- ${t}\n`);
      md += '\n';
    }
    if (spec.tests.integration.length > 0) {
      md += `### Integration Tests\n\n`;
      spec.tests.integration.forEach(t => md += `- ${t}\n`);
      md += '\n';
    }
    if (spec.tests.e2e.length > 0) {
      md += `### End-to-End Tests\n\n`;
      spec.tests.e2e.forEach(t => md += `- ${t}\n`);
      md += '\n';
    }
  }

  if (spec.metrics && spec.metrics.length > 0) {
    md += `## Metrics\n\n`;
    spec.metrics.forEach(m => md += `- ${m}\n`);
    md += '\n';
  }

  if (spec.workBreakdown && spec.workBreakdown.length > 0) {
    md += `## Work Breakdown\n\n`;
    md += '| ID | Task | Estimate | Dependencies |\n';
    md += '|----|------|----------|-------------|\n';
    spec.workBreakdown.forEach(w => {
      md += `| ${w.id} | ${w.title} | ${w.estimate} | ${w.dependencies?.join(', ') || '-'} |\n`;
    });
    md += '\n';
  }

  if (spec.risks.length > 0) {
    md += `## Risks\n\n`;
    spec.risks.forEach(r => md += `- ${r}\n`);
    md += '\n';
  }

  return md;
}

const PROMPT_VERSION = '1.0.0';

/**
 * Tech Translation Tool
 */
export const techTranslateTool = tool({
  description: 'Convert casual or high-level user requests into comprehensive, implementation-ready technical specifications. Applies charitable interpretation and best practices across engineering, DevOps, databases, and security. Returns both Markdown and JSON formats.',

  inputSchema: z.object({
    request: z.string().describe('The user request or idea to translate into technical specifications'),
    depth: z.enum(['basic', 'thorough', 'comprehensive'])
      .default('thorough')
      .describe('Level of detail: basic (core requirements), thorough (detailed architecture), comprehensive (exhaustive)'),
    output: z.enum(['markdown', 'json', 'both'])
      .default('both')
      .describe('Output format: markdown, json, or both'),
    targetStack: z.object({
      runtime: z.string().optional().describe('Runtime environment (e.g., Node.js/TypeScript)'),
      db: z.string().optional().describe('Database (e.g., PostgreSQL)'),
      deploy: z.string().optional().describe('Deployment platform (e.g., Railway)'),
    }).optional(),
    constraints: z.array(z.string()).optional().describe('Additional constraints (e.g., HIPAA, budget caps)'),
    saveToDatabase: z.boolean().default(false).describe('Save translation to database for later reference'),
    userId: z.string().optional().describe('User ID for database storage'),
    username: z.string().optional().describe('Username for database storage'),
  }),

  execute: async ({
    request,
    depth,
    output,
    targetStack,
    constraints,
    saveToDatabase,
    userId,
    username,
  }) => {
    try {
      // Build prompt
      const prompt = buildTechTranslationPrompt(request, depth, targetStack, constraints);

      // Call AI model
      const result = await generateText({
        model: openai(OMEGA_MODEL),
        prompt,
        temperature: 0.3, // Lower temperature for consistent structured output
      });

      // Parse JSON response
      let spec: TechSpec;
      try {
        spec = JSON.parse(result.text.trim());
      } catch (parseError) {
        // Try to extract JSON if wrapped in markdown
        const jsonMatch = result.text.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          spec = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Failed to parse AI response as JSON');
        }
      }

      // Validate against schema
      const validated = TechSpecSchema.safeParse(spec);
      if (!validated.success) {
        return {
          success: false,
          error: 'VALIDATION_FAILED',
          details: validated.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        };
      }

      const validatedSpec = validated.data;

      // Generate outputs
      const markdown = (output === 'markdown' || output === 'both')
        ? techSpecToMarkdown(validatedSpec)
        : undefined;

      const json = (output === 'json' || output === 'both')
        ? JSON.stringify(validatedSpec, null, 2)
        : undefined;

      // Save to database if requested
      let translationId: number | undefined;
      if (saveToDatabase && userId) {
        try {
          const pool = await getPostgresPool();
          const insertResult = await pool.query(
            `INSERT INTO tech_translations (
              user_id, username, source_text, output_markdown, output_json,
              assumptions, risks, model, prompt_version, tags
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id`,
            [
              userId,
              username || null,
              request,
              markdown || null,
              JSON.stringify(validatedSpec),
              JSON.stringify(validatedSpec.assumptions),
              JSON.stringify(validatedSpec.risks),
              OMEGA_MODEL,
              PROMPT_VERSION,
              [depth, output],
            ]
          );

          if (insertResult.rows && insertResult.rows.length > 0) {
            translationId = insertResult.rows[0].id;
          }
        } catch (dbError) {
          // Log error but don't fail the translation
          console.error('Failed to save translation to database:', dbError);
        }
      }

      return {
        success: true,
        specification: validatedSpec,
        markdown,
        json,
        assumptions: validatedSpec.assumptions,
        risks: validatedSpec.risks,
        translationId,
        promptVersion: PROMPT_VERSION,
        model: OMEGA_MODEL,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
});
