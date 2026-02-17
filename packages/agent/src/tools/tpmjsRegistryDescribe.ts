/**
 * TPMJS Registry Describe Tool
 * Returns full documentation for a specific TPMJS tool before execution.
 * Shows parameters, types, required/optional, defaults, and a ready-to-use example.
 *
 * API Reference: https://tpmjs.com/llms.txt
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  getTpmjsToolMetadata,
  getTpmjsToolParameters,
  type TpmjsToolParameter,
} from './tpmjsApiClient.js';

/**
 * Format parameters into a readable table
 */
function formatParametersTable(params: TpmjsToolParameter[]): string {
  if (!params || params.length === 0) {
    return 'No parameters documented.';
  }

  const lines = ['| Name | Type | Required | Description | Default |'];
  lines.push('|------|------|----------|-------------|---------|');

  for (const p of params) {
    const required = p.required ? 'Yes' : 'No';
    const defaultVal = p.default !== undefined ? String(p.default) : '-';
    const desc = p.description || '-';
    lines.push(`| ${p.name} | ${p.type} | ${required} | ${desc} | ${defaultVal} |`);
  }

  return lines.join('\n');
}

/**
 * Build an example tpmjsRegistryExecute call from parameters
 */
function buildExample(toolId: string, params: TpmjsToolParameter[]): string {
  const exampleParams: Record<string, string> = {};

  for (const p of params) {
    if (p.required) {
      // Use a placeholder based on type
      switch (p.type) {
        case 'string':
          exampleParams[p.name] = `"your_${p.name}"`;
          break;
        case 'number':
          exampleParams[p.name] = '0';
          break;
        case 'boolean':
          exampleParams[p.name] = 'true';
          break;
        default:
          exampleParams[p.name] = `"<${p.type}>"`;
      }
    }
  }

  const paramsStr = Object.entries(exampleParams)
    .map(([k, v]) => `    ${k}: ${v}`)
    .join(',\n');

  return `tpmjsRegistryExecute({\n  toolId: "${toolId}",\n  params: {\n${paramsStr}\n  }\n})`;
}

export const tpmjsRegistryDescribeTool = tool({
  description:
    'Get full documentation for a TPMJS tool before executing it. Returns parameter details (name, type, required, description, default), JSON Schema, required env vars, and a ready-to-copy example call. Use this when search results don\'t show enough parameter info, or before calling a tool for the first time.',
  inputSchema: z.object({
    toolId: z
      .string()
      .describe('Tool identifier in format "package::exportName" (from tpmjsRegistrySearch results)'),
  }),
  execute: async (args: { toolId: string }) => {
    const { toolId } = args;
    console.log(`📋 TPMJS Registry Describe: ${toolId}`);

    if (!toolId || !toolId.includes('::')) {
      return {
        success: false,
        error: 'invalid_tool_id',
        message: 'toolId must be in format "package::exportName" (e.g. "@tpmjs/official-memory::createMemoryTool")',
      };
    }

    const separatorIndex = toolId.lastIndexOf('::');
    const packageName = toolId.substring(0, separatorIndex);
    const exportName = toolId.substring(separatorIndex + 2);

    try {
      // Fetch metadata and parameters in parallel
      const [metadataResult, paramsResult] = await Promise.all([
        getTpmjsToolMetadata(toolId),
        getTpmjsToolParameters(packageName, exportName),
      ]);

      // Merge parameter info — prefer the /parameters endpoint, fall back to metadata
      const parameters = paramsResult.parameters.length > 0
        ? paramsResult.parameters
        : metadataResult.metadata?.parameters || [];

      const inputSchema = paramsResult.inputSchema || null;

      if (!metadataResult.metadata && parameters.length === 0) {
        return {
          success: false,
          error: 'tool_not_found',
          message: `Tool "${toolId}" not found in TPMJS registry. Use tpmjsRegistrySearch to find the correct toolId.`,
          toolId,
        };
      }

      const meta = metadataResult.metadata;
      const requiredParams = parameters.filter(p => p.required);
      const optionalParams = parameters.filter(p => !p.required);

      return {
        success: true,
        toolId,
        name: meta?.name || exportName,
        description: meta?.description || 'No description available.',
        package: meta?.package || packageName,
        version: meta?.version || 'latest',
        category: meta?.category || null,

        parameters: {
          total: parameters.length,
          required: requiredParams.length,
          optional: optionalParams.length,
          details: parameters,
          table: formatParametersTable(parameters),
        },

        inputSchema: inputSchema || undefined,
        envVars: meta?.envVars || [],

        example: buildExample(toolId, parameters),

        tips: [
          requiredParams.length > 0
            ? `This tool requires ${requiredParams.length} parameter(s): ${requiredParams.map(p => p.name).join(', ')}`
            : 'This tool has no required parameters.',
          'All of Omega\'s env vars are auto-forwarded — no need to pass them manually.',
          'Use the example above as a template for your tpmjsRegistryExecute call.',
        ],
      };
    } catch (error) {
      console.error('❌ TPMJS Registry Describe error:', error);
      return {
        success: false,
        error: 'describe_failed',
        message: error instanceof Error ? error.message : 'Unknown error describing TPMJS tool',
        toolId,
      };
    }
  },
});
