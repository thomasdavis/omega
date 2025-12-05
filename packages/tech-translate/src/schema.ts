import type { JSONSchemaType } from 'ajv';

/**
 * tpmjs Tool Schema - Tool Manifest structure
 */
export interface ToolManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  modes?: ('markdown' | 'json')[];
  examples?: Array<{
    input: unknown;
    output?: unknown;
    notes?: string;
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * Input structure for Tech Translate tool
 */
export interface TechTranslateInput {
  request: string;
  assumptions?: string[];
  audience?: 'infra' | 'backend' | 'frontend' | 'fullstack' | 'ml' | 'security' | 'product' | 'mixed';
  outputMode?: 'markdown' | 'json';
  constraints?: string[];
  context?: Record<string, unknown>;
}

/**
 * Output structure for Tech Translate tool
 */
export interface TechTranslateOutput {
  title: string;
  summary: string;
  spec: {
    goals: string[];
    nonGoals?: string[];
    architecture: string;
    apiDesign: string;
    dataModel: string;
    security?: string;
    devOps: string;
    testing: string;
    observability?: string;
    migrationPlan?: string;
    acceptanceCriteria: string[];
  };
  artifacts?: Array<{
    type: 'markdown' | 'json' | 'mermaid' | 'sql' | 'yaml' | 'http' | 'shell' | 'code';
    filename?: string;
    content: string;
  }>;
  notes?: string[];
  warnings?: string[];
}

/**
 * JSON Schema for input validation (JSON Schema 2020-12)
 */
export const inputSchema: JSONSchemaType<TechTranslateInput> = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  required: ['request'],
  properties: {
    request: {
      type: 'string',
      minLength: 1,
      description: "User's natural language request to translate",
    },
    assumptions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Charitable assumptions to apply',
      nullable: true,
    },
    audience: {
      type: 'string',
      enum: ['infra', 'backend', 'frontend', 'fullstack', 'ml', 'security', 'product', 'mixed'],
      description: 'Target audience for the technical specification',
      nullable: true,
    },
    outputMode: {
      type: 'string',
      enum: ['markdown', 'json'],
      description: 'Output format mode',
      nullable: true,
    },
    constraints: {
      type: 'array',
      items: { type: 'string' },
      description: 'Technical constraints to consider',
      nullable: true,
    },
    context: {
      type: 'object',
      description: 'Additional context for the translation',
      nullable: true,
    },
  },
  additionalProperties: false,
};

/**
 * JSON Schema for output validation (JSON Schema 2020-12)
 */
export const outputSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  required: ['title', 'summary', 'spec'],
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    spec: {
      type: 'object',
      properties: {
        goals: { type: 'array', items: { type: 'string' } },
        nonGoals: { type: 'array', items: { type: 'string' } },
        architecture: { type: 'string' },
        apiDesign: { type: 'string' },
        dataModel: { type: 'string' },
        security: { type: 'string' },
        devOps: { type: 'string' },
        testing: { type: 'string' },
        observability: { type: 'string' },
        migrationPlan: { type: 'string' },
        acceptanceCriteria: { type: 'array', items: { type: 'string' } },
      },
      required: ['goals', 'architecture', 'apiDesign', 'dataModel', 'devOps', 'testing', 'acceptanceCriteria'],
    },
    artifacts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['markdown', 'json', 'mermaid', 'sql', 'yaml', 'http', 'shell', 'code'],
          },
          filename: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['type', 'content'],
      },
    },
    notes: { type: 'array', items: { type: 'string' } },
    warnings: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: false,
};

/**
 * Tool manifest following tpmjs Tool Schema
 */
export const toolManifest: ToolManifest = {
  id: 'omega.tech-translate',
  name: 'Tech Translate',
  version: '0.1.0',
  description: 'Transforms natural language requests into detailed, actionable technical specifications with best practices',
  category: 'ai-ops',
  inputSchema: inputSchema as unknown as Record<string, unknown>,
  outputSchema: outputSchema as Record<string, unknown>,
  modes: ['markdown', 'json'],
  examples: [
    {
      input: {
        request: 'make a status page',
        audience: 'fullstack',
      },
      notes: 'Simple request translated into comprehensive technical spec',
    },
  ],
  metadata: {
    tags: ['translation', 'specification', 'planning', 'architecture'],
    authors: ['Omega Team'],
  },
};
