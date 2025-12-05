import { z } from 'zod';

/**
 * Tech Translation Specification Schema (v0)
 * Defines the structure for technical specifications generated from user requests
 */
export const TechTranslationSpecSchema = z.object({
  summary: z.string().describe('High-level summary of the request'),
  assumptions: z.array(z.string()).describe('Key assumptions made about the request'),
  risks: z.array(z.string()).describe('Technical and product risks'),
  non_goals: z.array(z.string()).describe('What is explicitly out of scope'),
  api_design: z
    .object({
      endpoints: z.array(
        z.object({
          method: z.string(),
          path: z.string(),
          description: z.string(),
        })
      ),
      models: z.array(
        z.object({
          name: z.string(),
          fields: z.array(
            z.object({
              name: z.string(),
              type: z.string(),
              required: z.boolean(),
            })
          ),
        })
      ),
    })
    .describe('API design including endpoints and data models'),
  data_model: z
    .object({
      tables: z.array(
        z.object({
          name: z.string(),
          columns: z.array(
            z.object({
              name: z.string(),
              type: z.string(),
              nullable: z.boolean(),
            })
          ),
          indexes: z.array(z.string()).optional(),
        })
      ),
    })
    .describe('Database schema design'),
  infra: z
    .object({
      services: z.array(z.string()),
      dependencies: z.array(z.string()),
      deployment: z.string(),
    })
    .describe('Infrastructure and deployment requirements'),
  security: z
    .object({
      authentication: z.string(),
      authorization: z.string(),
      data_protection: z.array(z.string()),
    })
    .describe('Security considerations and requirements'),
  testing: z
    .object({
      unit_tests: z.array(z.string()),
      integration_tests: z.array(z.string()),
      e2e_tests: z.array(z.string()),
    })
    .describe('Testing strategy and test cases'),
  acceptance_criteria: z.array(z.string()).describe('Acceptance criteria for completion'),
  tasks: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        dependencies: z.array(z.string()).optional(),
        estimate: z.string().optional(),
      })
    )
    .describe('Breakdown of implementation tasks'),
});

export type TechTranslationSpec = z.infer<typeof TechTranslationSpecSchema>;

/**
 * Translation options
 */
export interface TranslationOptions {
  /**
   * Output format
   * @default 'markdown'
   */
  format?: 'markdown' | 'json';

  /**
   * Specification level
   * @default 'prod'
   */
  level?: 'mvp' | 'prod';

  /**
   * Optional sections to include
   */
  include?: {
    db?: boolean;
    devops?: boolean;
    security?: boolean;
    testing?: boolean;
  };
}

/**
 * LLM Provider interface for pluggable provider support
 */
export interface LLMProvider {
  /**
   * Translate a user request into a technical specification
   */
  translate(request: string, options: TranslationOptions): Promise<TechTranslationSpec>;
}
