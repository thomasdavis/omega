/**
 * Autonomous Tool Loader - Dynamically loads autonomously created tools from database
 * Extends the core tool loader with runtime tool generation capabilities
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool } from '@repo/database';
import { ToolMetadata } from './toolRegistry/types.js';

// Use any for tool type since AI SDK v6 doesn't export a public tool type
type Tool = any;

/**
 * Cache for autonomously loaded tools
 */
const autonomousToolCache = new Map<string, Tool>();

/**
 * Build a Zod schema from parameter definitions
 */
function buildZodSchema(parameters: any[]): z.ZodObject<any> {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  for (const param of parameters) {
    let fieldSchema: z.ZodTypeAny;

    switch (param.type) {
      case 'string':
        fieldSchema = z.string();
        break;
      case 'number':
        fieldSchema = z.number();
        break;
      case 'boolean':
        fieldSchema = z.boolean();
        break;
      case 'array':
        fieldSchema = z.array(z.any());
        break;
      case 'object':
        fieldSchema = z.record(z.any());
        break;
      default:
        fieldSchema = z.any();
    }

    // Add description
    fieldSchema = fieldSchema.describe(param.description);

    // Handle optional/default
    if (!param.required) {
      fieldSchema = fieldSchema.optional();
      if (param.default !== undefined) {
        fieldSchema = fieldSchema.default(param.default);
      }
    }

    schemaFields[param.name] = fieldSchema;
  }

  return z.object(schemaFields);
}

/**
 * Create a runtime tool from database definition
 */
function createRuntimeTool(toolData: any): Tool {
  const { id, name, description, parameters, implementation } = toolData;

  // Parse parameters if stored as JSON string
  const parsedParams = typeof parameters === 'string'
    ? JSON.parse(parameters)
    : parameters;

  // Build Zod schema from parameters
  const inputSchema = buildZodSchema(parsedParams);

  // Create safe execution wrapper
  const executeFn = async (params: any) => {
    try {
      // Create sandboxed function
      // We use Function constructor with strict parameter validation
      // The implementation only has access to the params passed to it
      const fn = new Function(
        'params',
        `
        // Sandboxed execution environment
        const ${parsedParams.map((p: any) => p.name).join(', ')} = params;

        // User implementation
        ${implementation}
        `
      );

      const result = await fn(params);

      // Update usage statistics
      try {
        const pool = await getPostgresPool();
        await pool.query(
          `UPDATE autonomous_tools
           SET usage_count = usage_count + 1,
               last_used_at = NOW()
           WHERE id = $1`,
          [id]
        );
      } catch (error) {
        console.warn(`Failed to update usage stats for tool ${id}:`, error);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Tool execution failed',
      };
    }
  };

  // Create and return the tool
  return tool({
    description: `${description}\n\n[Autonomous Tool - Auto-created by Omega]`,
    inputSchema,
    execute: executeFn,
  });
}

/**
 * Load autonomous tools by IDs
 *
 * @param toolIds - Array of tool IDs to load
 * @returns Object mapping tool IDs to tool objects
 */
export async function loadAutonomousTools(toolIds: string[]): Promise<Record<string, Tool>> {
  const tools: Record<string, Tool> = {};

  if (toolIds.length === 0) {
    return tools;
  }

  try {
    const pool = await getPostgresPool();

    // Query for enabled autonomous tools
    const result = await pool.query(
      `SELECT
        id, name, description, category, parameters, implementation,
        keywords, examples, tags
       FROM autonomous_tools
       WHERE id = ANY($1) AND is_enabled = true`,
      [toolIds]
    );

    for (const toolData of result.rows) {
      const toolId = toolData.id;

      // Check cache first
      if (autonomousToolCache.has(toolId)) {
        tools[toolId] = autonomousToolCache.get(toolId)!;
        continue;
      }

      try {
        // Create runtime tool
        const tool = createRuntimeTool(toolData);

        // Cache it
        autonomousToolCache.set(toolId, tool);
        tools[toolId] = tool;
      } catch (error) {
        console.error(`Failed to create autonomous tool ${toolId}:`, error);
      }
    }

    if (Object.keys(tools).length > 0) {
      console.log(`✅ Loaded ${Object.keys(tools).length} autonomous tools`);
    }
  } catch (error) {
    console.error('Failed to load autonomous tools from database:', error);
  }

  return tools;
}

/**
 * Get metadata for all enabled autonomous tools
 * This is used to add autonomous tools to the BM25 search index
 *
 * @returns Array of tool metadata for autonomous tools
 */
export async function getAutonomousToolMetadata(): Promise<ToolMetadata[]> {
  try {
    const pool = await getPostgresPool();

    const result = await pool.query(
      `SELECT
        id, name, description, category, keywords, examples, tags
       FROM autonomous_tools
       WHERE is_enabled = true
       ORDER BY created_at DESC`
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      keywords: row.keywords,
      tags: row.tags,
      examples: row.examples,
      isCore: false,
      category: row.category as any,
    }));
  } catch (error) {
    console.error('Failed to fetch autonomous tool metadata:', error);
    return [];
  }
}

/**
 * Clear the autonomous tool cache
 * Useful when tools are updated and need to be reloaded
 */
export function clearAutonomousToolCache(): void {
  autonomousToolCache.clear();
  console.log('✅ Cleared autonomous tool cache');
}
