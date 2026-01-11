/**
 * Tech Translation Types
 *
 * Defines the schema and types for converting user requests into
 * detailed technical specifications following PAM compliance.
 */

import { z } from 'zod';

/**
 * Domain areas for technical specifications
 */
export const DOMAINS = ['web', 'data', 'ml', 'mobile', 'devops', 'api', 'database'] as const;
export type Domain = typeof DOMAINS[number];

/**
 * Output formats supported
 */
export const OUTPUT_FORMATS = ['md', 'json', 'both'] as const;
export type OutputFormat = typeof OUTPUT_FORMATS[number];

/**
 * Style presets for specification generation
 */
export const STYLE_PRESETS = ['enterprise', 'startup', 'technical', 'concise', 'detailed'] as const;
export type StylePreset = typeof STYLE_PRESETS[number];

/**
 * Depth levels for specification detail
 */
export const DEPTH_LEVELS = ['low', 'medium', 'high'] as const;
export type DepthLevel = typeof DEPTH_LEVELS[number];

/**
 * LLM Provider types
 */
export const PROVIDERS = ['openai', 'anthropic', 'generic'] as const;
export type Provider = typeof PROVIDERS[number];

/**
 * Provider configuration
 */
export interface ProviderConfig {
  provider: Provider;
  apiKey?: string;
  model?: string;
  baseURL?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Input for tech translation
 */
export interface TranslateInput {
  userRequest: string;
  context?: string;
  domain?: Domain;
}

/**
 * Options for tech translation
 */
export interface TranslateOptions {
  format?: OutputFormat;
  style?: StylePreset;
  depth?: DepthLevel;
  domain?: Domain;
  provider?: ProviderConfig;
  includeAssumptions?: boolean;
  includeRisks?: boolean;
  includeMilestones?: boolean;
}

/**
 * Technical specification sections schema
 */
export const TechSpecSectionSchema = z.object({
  title: z.string(),
  content: z.string(),
  subsections: z.array(z.object({
    title: z.string(),
    content: z.string(),
  })).optional(),
});

export type TechSpecSection = z.infer<typeof TechSpecSectionSchema>;

/**
 * Complete technical specification schema (JSON format)
 */
export const TechSpecSchema = z.object({
  summary: z.string().describe('Executive summary of the technical specification'),
  assumptions: z.array(z.string()).optional().describe('Key assumptions made in this specification'),
  requirements: z.object({
    functional: z.array(z.string()),
    nonFunctional: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
  }),
  apiInterfaces: z.object({
    endpoints: z.array(z.object({
      method: z.string(),
      path: z.string(),
      description: z.string(),
      requestSchema: z.record(z.any()).optional(),
      responseSchema: z.record(z.any()).optional(),
    })).optional(),
    events: z.array(z.object({
      name: z.string(),
      description: z.string(),
      payload: z.record(z.any()).optional(),
    })).optional(),
    integrations: z.array(z.string()).optional(),
  }).optional(),
  dataModel: z.object({
    entities: z.array(z.object({
      name: z.string(),
      description: z.string(),
      fields: z.array(z.object({
        name: z.string(),
        type: z.string(),
        required: z.boolean().optional(),
        description: z.string().optional(),
      })),
      relationships: z.array(z.string()).optional(),
    })).optional(),
    schemas: z.array(z.object({
      name: z.string(),
      description: z.string(),
      schema: z.record(z.any()),
    })).optional(),
  }).optional(),
  devOpsInfra: z.object({
    deployment: z.string().optional(),
    infrastructure: z.array(z.string()).optional(),
    cicd: z.string().optional(),
    monitoring: z.array(z.string()).optional(),
    scaling: z.string().optional(),
  }).optional(),
  securityPrivacy: z.object({
    authentication: z.string().optional(),
    authorization: z.string().optional(),
    dataProtection: z.array(z.string()).optional(),
    compliance: z.array(z.string()).optional(),
    threats: z.array(z.string()).optional(),
  }).optional(),
  testingQA: z.object({
    strategy: z.string().optional(),
    unitTests: z.array(z.string()).optional(),
    integrationTests: z.array(z.string()).optional(),
    e2eTests: z.array(z.string()).optional(),
    coverage: z.string().optional(),
  }).optional(),
  risks: z.array(z.object({
    description: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    mitigation: z.string(),
  })).optional(),
  milestones: z.array(z.object({
    name: z.string(),
    description: z.string(),
    deliverables: z.array(z.string()),
    estimatedDuration: z.string().optional(),
  })).optional(),
  metadata: z.object({
    domain: z.string().optional(),
    style: z.string().optional(),
    depth: z.string().optional(),
    generatedAt: z.string(),
    version: z.string().default('1.0'),
  }),
});

export type TechSpec = z.infer<typeof TechSpecSchema>;

/**
 * Result of tech translation
 */
export interface TranslateResult {
  success: boolean;
  title: string;
  markdown?: string;
  json?: TechSpec;
  error?: string;
  metadata: {
    format: OutputFormat;
    style: StylePreset;
    depth: DepthLevel;
    domain?: Domain;
    generatedAt: string;
  };
}

/**
 * Default prompt templates
 */
export interface PromptTemplate {
  system: string;
  user: string;
}

/**
 * Template context for building prompts
 */
export interface TemplateContext {
  userRequest: string;
  context?: string;
  domain?: Domain;
  style: StylePreset;
  depth: DepthLevel;
  format: OutputFormat;
  includeAssumptions: boolean;
  includeRisks: boolean;
  includeMilestones: boolean;
}
