/**
 * JSON Agent Generator Tool
 * Generates, validates, and converts JSON Agents based on the PAM (Portable Agent Manifest) specification
 * Reference: https://jsonagents.org/
 */

import { tool } from 'ai';
import { z } from 'zod';

// PAM Schema Definitions
const ToolParameterSchema = z.object({
  name: z.string().describe('Parameter name'),
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']).describe('Parameter type'),
  description: z.string().describe('Parameter description'),
  required: z.boolean().optional().describe('Whether parameter is required'),
  default: z.any().optional().describe('Default value'),
});

const ToolSchema = z.object({
  name: z.string().describe('Tool name'),
  description: z.string().describe('Tool description'),
  parameters: z.array(ToolParameterSchema).optional().describe('Tool parameters'),
  endpoint: z.string().optional().describe('Tool endpoint URL'),
});

const AgentCapabilitySchema = z.object({
  name: z.string().describe('Capability name'),
  description: z.string().describe('Capability description'),
  enabled: z.boolean().default(true).describe('Whether capability is enabled'),
});

const PAMSchema = z.object({
  version: z.string().default('1.0').describe('PAM specification version'),
  agent: z.object({
    name: z.string().describe('Agent name'),
    description: z.string().describe('Agent description'),
    version: z.string().default('1.0.0').describe('Agent version'),
    author: z.string().optional().describe('Agent author'),
    license: z.string().optional().describe('Agent license'),
    homepage: z.string().optional().describe('Agent homepage URL'),
  }),
  capabilities: z.array(AgentCapabilitySchema).optional().describe('Agent capabilities'),
  tools: z.array(ToolSchema).optional().describe('Available tools'),
  personality: z.object({
    tone: z.string().optional().describe('Agent tone (e.g., professional, friendly, technical)'),
    style: z.string().optional().describe('Communication style'),
    traits: z.array(z.string()).optional().describe('Personality traits'),
  }).optional(),
  configuration: z.object({
    model: z.string().optional().describe('AI model to use'),
    temperature: z.number().min(0).max(2).optional().describe('Model temperature'),
    maxTokens: z.number().optional().describe('Maximum tokens'),
    systemPrompt: z.string().optional().describe('System prompt'),
  }).optional(),
  metadata: z.record(z.any()).optional().describe('Additional metadata'),
});

type PAM = z.infer<typeof PAMSchema>;

/**
 * Validate a JSON Agent against the PAM schema
 */
function validateAgent(agentJson: string): { valid: boolean; errors?: string[]; agent?: PAM } {
  try {
    const parsed = JSON.parse(agentJson);
    const result = PAMSchema.safeParse(parsed);

    if (result.success) {
      return { valid: true, agent: result.data };
    } else {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return { valid: false, errors };
    }
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : 'Invalid JSON format']
    };
  }
}

/**
 * Generate a basic JSON Agent template
 */
function generateTemplate(params: {
  name: string;
  description: string;
  author?: string;
  includeTools?: boolean;
  includePersonality?: boolean;
}): PAM {
  const agent: PAM = {
    version: '1.0',
    agent: {
      name: params.name,
      description: params.description,
      version: '1.0.0',
      author: params.author,
    },
  };

  if (params.includeTools) {
    agent.tools = [
      {
        name: 'example_tool',
        description: 'An example tool that demonstrates the tool structure',
        parameters: [
          {
            name: 'input',
            type: 'string',
            description: 'Example input parameter',
            required: true,
          },
        ],
      },
    ];
  }

  if (params.includePersonality) {
    agent.personality = {
      tone: 'professional',
      style: 'helpful and clear',
      traits: ['knowledgeable', 'patient', 'accurate'],
    };

    agent.configuration = {
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 2000,
      systemPrompt: `You are ${params.name}, ${params.description}`,
    };
  }

  return agent;
}

/**
 * Convert an agent from one format to another
 */
function convertAgent(agentJson: string, targetFormat: 'minimal' | 'full'): PAM {
  const validation = validateAgent(agentJson);
  if (!validation.valid || !validation.agent) {
    throw new Error(`Invalid agent JSON: ${validation.errors?.join(', ')}`);
  }

  const agent = validation.agent;

  if (targetFormat === 'minimal') {
    // Return minimal version with only required fields
    return {
      version: agent.version,
      agent: {
        name: agent.agent.name,
        description: agent.agent.description,
        version: agent.agent.version,
      },
    };
  } else {
    // Return full version with all optional fields populated with defaults
    return {
      ...agent,
      capabilities: agent.capabilities || [],
      tools: agent.tools || [],
      personality: agent.personality || {
        tone: 'professional',
        style: 'clear and concise',
        traits: ['helpful'],
      },
      configuration: agent.configuration || {
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 2000,
      },
      metadata: agent.metadata || {},
    };
  }
}

/**
 * Export tool for Vercel AI SDK
 */
export const jsonAgentGeneratorTool = tool({
  description: `Generate, validate, and convert JSON Agents based on the PAM (Portable Agent Manifest) specification from jsonagents.org.
  Supports three operations:
  - generate: Create a new JSON Agent template
  - validate: Validate an existing JSON Agent definition
  - convert: Convert between minimal and full agent formats`,

  parameters: z.object({
    operation: z.enum(['generate', 'validate', 'convert']).describe('Operation to perform'),

    // For generate operation
    name: z.string().optional().describe('Agent name (required for generate)'),
    description: z.string().optional().describe('Agent description (required for generate)'),
    author: z.string().optional().describe('Agent author (optional for generate)'),
    includeTools: z.boolean().optional().default(false).describe('Include example tools (for generate)'),
    includePersonality: z.boolean().optional().default(false).describe('Include personality config (for generate)'),

    // For validate and convert operations
    agentJson: z.string().optional().describe('JSON Agent to validate or convert'),

    // For convert operation
    targetFormat: z.enum(['minimal', 'full']).optional().describe('Target format for conversion (minimal or full)'),
  }),

  execute: async (params) => {
    try {
      switch (params.operation) {
        case 'generate': {
          if (!params.name || !params.description) {
            return {
              success: false,
              error: 'Name and description are required for generate operation',
            };
          }

          const agent = generateTemplate({
            name: params.name,
            description: params.description,
            author: params.author,
            includeTools: params.includeTools,
            includePersonality: params.includePersonality,
          });

          return {
            success: true,
            operation: 'generate',
            agent,
            json: JSON.stringify(agent, null, 2),
          };
        }

        case 'validate': {
          if (!params.agentJson) {
            return {
              success: false,
              error: 'agentJson is required for validate operation',
            };
          }

          const validation = validateAgent(params.agentJson);

          return {
            success: validation.valid,
            operation: 'validate',
            valid: validation.valid,
            errors: validation.errors,
            agent: validation.agent,
          };
        }

        case 'convert': {
          if (!params.agentJson) {
            return {
              success: false,
              error: 'agentJson is required for convert operation',
            };
          }

          if (!params.targetFormat) {
            return {
              success: false,
              error: 'targetFormat is required for convert operation',
            };
          }

          const converted = convertAgent(params.agentJson, params.targetFormat);

          return {
            success: true,
            operation: 'convert',
            targetFormat: params.targetFormat,
            agent: converted,
            json: JSON.stringify(converted, null, 2),
          };
        }

        default:
          return {
            success: false,
            error: 'Invalid operation',
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
});
