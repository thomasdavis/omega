/**
 * Create Tool Autonomously - Allows Omega to design and build innovative tools on its own initiative
 *
 * This tool enables autonomous tool creation with strict safety boundaries:
 * - Only simple utility tools (no database, GitHub, or file system access)
 * - Maximum 5 parameters per tool
 * - No external API calls without validation
 * - All implementations validated for safety
 * - Stored in database for review and management
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool } from '@repo/database';

interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
}

export const createToolAutonomouslyTool = tool({
  description: `Create a new tool autonomously based on identified needs. Use this when you recognize a capability gap that could be filled by a simple, safe utility tool.

IMPORTANT SAFETY BOUNDARIES:
- Only create simple utility tools (data transformation, calculations, text processing, etc.)
- NO database access, NO file system access, NO GitHub API calls
- NO external API calls unless explicitly safe (weather, public data APIs, etc.)
- Maximum 5 parameters
- Implementation must be pure JavaScript/TypeScript with no dangerous operations
- Tool will be reviewed before being enabled for general use

WHEN TO USE:
- User requests a capability that doesn't exist but could be easily implemented
- You identify a pattern of requests that could benefit from a dedicated tool
- A simple transformation or calculation is needed repeatedly

WHEN NOT TO USE:
- Complex tools requiring database or file system access (use reportMissingTool instead)
- Tools requiring authentication or sensitive operations
- Tools that duplicate existing functionality`,

  inputSchema: z.object({
    toolId: z.string()
      .regex(/^[a-zA-Z0-9_]+$/)
      .describe('Unique identifier for the tool (alphanumeric + underscores only, e.g., "jsonFormatter", "unicodeConverter")'),

    toolName: z.string()
      .min(3)
      .max(100)
      .describe('Human-readable name for the tool'),

    description: z.string()
      .min(20)
      .max(500)
      .describe('Detailed description of what the tool does and when to use it'),

    category: z.enum(['development', 'content', 'research', 'specialized'])
      .describe('Tool category (restricted categories for autonomous creation)'),

    parameters: z.array(z.object({
      name: z.string().regex(/^[a-zA-Z0-9_]+$/),
      type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
      description: z.string(),
      required: z.boolean(),
      default: z.any().optional(),
    }))
      .max(5)
      .describe('Array of parameter definitions (max 5 parameters)'),

    implementation: z.string()
      .min(50)
      .max(5000)
      .describe('JavaScript implementation code as a string. Must be a pure function that returns a result object with {success: boolean, data?: any, error?: string}'),

    keywords: z.array(z.string())
      .min(3)
      .max(15)
      .describe('Keywords for BM25 search (3-15 keywords)'),

    examples: z.array(z.string())
      .min(2)
      .max(5)
      .describe('Example user queries that should trigger this tool (2-5 examples)'),

    tags: z.array(z.string())
      .min(2)
      .max(8)
      .describe('Category tags for organization (2-8 tags)'),

    rationale: z.string()
      .min(50)
      .describe('Explanation of why this tool is needed and how it will be useful'),
  }),

  execute: async ({
    toolId,
    toolName,
    description,
    category,
    parameters,
    implementation,
    keywords,
    examples,
    tags,
    rationale,
  }) => {
    try {
      // Validate tool ID doesn't conflict with existing tools
      const EXISTING_TOOL_IDS = [
        'search', 'calculator', 'artifact', 'unsandbox', 'webFetch', 'fileUpload',
        'generateHtmlPage', 'whoami', 'listTools', 'mongoInsert', 'mongoFind',
        // ... (simplified - in production would check against full list)
      ];

      if (EXISTING_TOOL_IDS.includes(toolId)) {
        return {
          success: false,
          error: 'TOOL_ID_CONFLICT',
          message: `Tool ID '${toolId}' conflicts with an existing core tool. Please choose a different ID.`,
        };
      }

      // Safety validation: Check implementation for dangerous patterns
      const dangerousPatterns = [
        /require\s*\(/i,
        /import\s+/i,
        /eval\s*\(/i,
        /Function\s*\(/i,
        /process\./i,
        /fs\./i,
        /child_process/i,
        /exec\s*\(/i,
        /spawn\s*\(/i,
        /__dirname/i,
        /__filename/i,
        /\.\.\/\.\./,  // Directory traversal
        /deleteDatabase/i,
        /dropTable/i,
        /rm\s+-rf/i,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(implementation)) {
          return {
            success: false,
            error: 'UNSAFE_IMPLEMENTATION',
            message: `Implementation contains potentially dangerous code pattern: ${pattern.source}. Autonomous tools cannot use require/import, eval, file system access, or process operations.`,
            safetyViolation: pattern.source,
          };
        }
      }

      // Validate implementation is a valid function
      try {
        new Function('parameters', implementation);
      } catch (error) {
        return {
          success: false,
          error: 'INVALID_IMPLEMENTATION',
          message: `Implementation code is not valid JavaScript: ${error instanceof Error ? error.message : 'syntax error'}`,
        };
      }

      // Get database connection
      const pool = await getPostgresPool();

      // Check if tool ID already exists
      const existingTool = await pool.query(
        'SELECT id FROM autonomous_tools WHERE id = $1',
        [toolId]
      );

      if (existingTool.rows.length > 0) {
        return {
          success: false,
          error: 'TOOL_ALREADY_EXISTS',
          message: `An autonomous tool with ID '${toolId}' already exists. Use a different ID or update the existing tool.`,
        };
      }

      // Store in database
      const result = await pool.query(
        `INSERT INTO autonomous_tools (
          id, name, description, category, parameters, implementation,
          keywords, examples, tags, created_by, safety_validated, validation_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, name, created_at`,
        [
          toolId,
          toolName,
          description,
          category,
          JSON.stringify(parameters),
          implementation,
          keywords,
          examples,
          tags,
          'omega-autonomous',
          false, // Requires review
          `Auto-created. Rationale: ${rationale}`,
        ]
      );

      const createdTool = result.rows[0];

      return {
        success: true,
        toolId: createdTool.id,
        toolName: createdTool.name,
        createdAt: createdTool.created_at,
        message: `Successfully created autonomous tool '${toolName}' (ID: ${toolId}). The tool has been stored and will be available after safety review. To enable it immediately for testing, an admin can run: UPDATE autonomous_tools SET is_enabled = true, safety_validated = true WHERE id = '${toolId}';`,
        rationale,
        nextSteps: [
          'Tool is stored in database but disabled by default',
          'Requires safety validation before general use',
          'Will be included in BM25 search once enabled',
          'Usage will be tracked for monitoring',
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create autonomous tool',
      };
    }
  },
});
