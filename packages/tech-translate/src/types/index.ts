/**
 * Type definitions for Tech Translation tool
 * Converts informal user requests into detailed technical specifications
 */

import { z } from 'zod';

// ============================================================================
// Core Schemas
// ============================================================================

/**
 * Depth level for technical detail
 */
export const DepthLevel = z.enum(['brief', 'standard', 'high', 'exhaustive']);
export type DepthLevel = z.infer<typeof DepthLevel>;

/**
 * Style preset for output
 */
export const StylePreset = z.enum([
  'startup',      // Fast, MVP-focused
  'enterprise',   // Thorough, compliance-focused
  'research',     // Exploratory, hypothesis-driven
  'academic',     // Formal, citation-heavy
]);
export type StylePreset = z.infer<typeof StylePreset>;

/**
 * Domain context for specialization
 */
export const Domain = z.enum([
  'web',          // Web applications
  'mobile',       // Mobile apps
  'data',         // Data engineering/analytics
  'ml',           // Machine learning
  'infrastructure', // DevOps/infrastructure
  'embedded',     // Embedded systems
  'general',      // General purpose
]);
export type Domain = z.infer<typeof Domain>;

/**
 * Output format specification
 */
export const OutputFormat = z.enum(['markdown', 'json', 'both']);
export type OutputFormat = z.infer<typeof OutputFormat>;

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Input for translation request
 */
export const TranslateInputSchema = z.object({
  /** The informal user request or description */
  input: z.string().min(1, 'Input is required'),

  /** Optional domain context */
  domain: Domain.optional(),

  /** Additional context about the project */
  projectContext: z.string().optional(),

  /** Existing constraints or requirements */
  constraints: z.array(z.string()).optional(),
});
export type TranslateInput = z.infer<typeof TranslateInputSchema>;

/**
 * Options for translation
 */
export const TranslateOptionsSchema = z.object({
  /** Depth of technical detail */
  depth: DepthLevel.default('standard'),

  /** Style preset */
  style: StylePreset.default('enterprise'),

  /** Output format */
  format: OutputFormat.default('both'),

  /** Custom prompt additions */
  customPrompt: z.string().optional(),

  /** Provider configuration */
  provider: z.string().optional(),
});
export type TranslateOptions = z.infer<typeof TranslateOptionsSchema>;

// ============================================================================
// Output Schemas - Structured Technical Specification
// ============================================================================

/**
 * Summary section
 */
export const SummarySchema = z.object({
  title: z.string(),
  overview: z.string(),
  objectives: z.array(z.string()),
  scope: z.string(),
});
export type Summary = z.infer<typeof SummarySchema>;

/**
 * Assumptions and constraints
 */
export const AssumptionsSchema = z.object({
  assumptions: z.array(z.string()),
  constraints: z.array(z.string()),
  dependencies: z.array(z.string()),
});
export type Assumptions = z.infer<typeof AssumptionsSchema>;

/**
 * Requirements section
 */
export const RequirementsSchema = z.object({
  functional: z.array(z.object({
    id: z.string(),
    description: z.string(),
    priority: z.enum(['must', 'should', 'could', 'wont']),
  })),
  nonFunctional: z.array(z.object({
    category: z.string(),
    requirement: z.string(),
    metric: z.string().optional(),
  })),
});
export type Requirements = z.infer<typeof RequirementsSchema>;

/**
 * API and interfaces
 */
export const APIInterfaceSchema = z.object({
  endpoints: z.array(z.object({
    method: z.string(),
    path: z.string(),
    description: z.string(),
    parameters: z.record(z.string()).optional(),
    response: z.string(),
  })).optional(),
  interfaces: z.array(z.object({
    name: z.string(),
    type: z.string(),
    description: z.string(),
    fields: z.record(z.string()).optional(),
  })).optional(),
});
export type APIInterface = z.infer<typeof APIInterfaceSchema>;

/**
 * Data model
 */
export const DataModelSchema = z.object({
  entities: z.array(z.object({
    name: z.string(),
    description: z.string(),
    fields: z.array(z.object({
      name: z.string(),
      type: z.string(),
      required: z.boolean(),
      description: z.string().optional(),
    })),
    relationships: z.array(z.string()).optional(),
  })),
  storage: z.object({
    type: z.string(),
    rationale: z.string(),
  }).optional(),
});
export type DataModel = z.infer<typeof DataModelSchema>;

/**
 * DevOps and infrastructure
 */
export const DevOpsSchema = z.object({
  deployment: z.object({
    strategy: z.string(),
    platform: z.string().optional(),
    regions: z.array(z.string()).optional(),
  }).optional(),
  cicd: z.object({
    pipeline: z.string(),
    stages: z.array(z.string()),
  }).optional(),
  monitoring: z.object({
    metrics: z.array(z.string()),
    alerts: z.array(z.string()).optional(),
  }).optional(),
  infrastructure: z.object({
    components: z.array(z.string()),
    configuration: z.record(z.string()).optional(),
  }).optional(),
});
export type DevOps = z.infer<typeof DevOpsSchema>;

/**
 * Security and privacy
 */
export const SecurityPrivacySchema = z.object({
  authentication: z.string().optional(),
  authorization: z.string().optional(),
  dataProtection: z.array(z.string()).optional(),
  compliance: z.array(z.string()).optional(),
  vulnerabilities: z.array(z.object({
    threat: z.string(),
    mitigation: z.string(),
  })).optional(),
});
export type SecurityPrivacy = z.infer<typeof SecurityPrivacySchema>;

/**
 * Testing and QA
 */
export const TestingQASchema = z.object({
  strategy: z.string(),
  testTypes: z.array(z.object({
    type: z.string(),
    coverage: z.string().optional(),
    tools: z.array(z.string()).optional(),
  })),
  acceptanceCriteria: z.array(z.string()),
});
export type TestingQA = z.infer<typeof TestingQASchema>;

/**
 * Risks and mitigation
 */
export const RisksSchema = z.object({
  risks: z.array(z.object({
    risk: z.string(),
    impact: z.enum(['low', 'medium', 'high', 'critical']),
    probability: z.enum(['low', 'medium', 'high']),
    mitigation: z.string(),
  })),
});
export type Risks = z.infer<typeof RisksSchema>;

/**
 * Milestones and timeline
 */
export const MilestonesSchema = z.object({
  phases: z.array(z.object({
    name: z.string(),
    deliverables: z.array(z.string()),
    dependencies: z.array(z.string()).optional(),
  })),
});
export type Milestones = z.infer<typeof MilestonesSchema>;

/**
 * Complete technical specification result
 */
export const TechnicalSpecSchema = z.object({
  summary: SummarySchema,
  assumptions: AssumptionsSchema,
  requirements: RequirementsSchema,
  api: APIInterfaceSchema.optional(),
  dataModel: DataModelSchema.optional(),
  devops: DevOpsSchema.optional(),
  security: SecurityPrivacySchema.optional(),
  testing: TestingQASchema,
  risks: RisksSchema,
  milestones: MilestonesSchema,
  metadata: z.object({
    generatedAt: z.string(),
    depth: DepthLevel,
    style: StylePreset,
    domain: Domain.optional(),
  }),
});
export type TechnicalSpec = z.infer<typeof TechnicalSpecSchema>;

// ============================================================================
// Translation Result
// ============================================================================

/**
 * Result of translation operation
 */
export const TranslateResultSchema = z.object({
  /** Structured specification (JSON) */
  spec: TechnicalSpecSchema,

  /** Markdown-formatted specification */
  markdown: z.string(),

  /** Metadata about the translation */
  metadata: z.object({
    inputLength: z.number(),
    outputLength: z.number(),
    provider: z.string(),
    model: z.string().optional(),
    tokensUsed: z.number().optional(),
    duration: z.number().optional(),
  }),
});
export type TranslateResult = z.infer<typeof TranslateResultSchema>;

// ============================================================================
// Provider Interface
// ============================================================================

/**
 * Provider configuration
 */
export const ProviderConfigSchema = z.object({
  /** Provider type */
  type: z.enum(['openai', 'anthropic', 'generic']),

  /** API key (optional, can use env vars) */
  apiKey: z.string().optional(),

  /** Model name */
  model: z.string().optional(),

  /** Base URL for generic providers */
  baseUrl: z.string().optional(),

  /** Additional options */
  options: z.record(z.any()).optional(),
});
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

/**
 * Provider request
 */
export interface ProviderRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Provider response
 */
export interface ProviderResponse {
  text: string;
  model?: string;
  tokensUsed?: number;
  finishReason?: string;
}

/**
 * Provider interface
 */
export interface Provider {
  name: string;
  generate(request: ProviderRequest): Promise<ProviderResponse>;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_DEPTH: DepthLevel = 'standard';
export const DEFAULT_STYLE: StylePreset = 'enterprise';
export const DEFAULT_FORMAT: OutputFormat = 'both';
export const DEFAULT_DOMAIN: Domain = 'general';
