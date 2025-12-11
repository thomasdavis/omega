/**
 * TPMJS Registry Execute Tool
 * Execute any tool from the TPMJS registry by its toolId
 * Tools run in a secure sandbox - no local installation required
 *
 * @see https://tpmjs.com/sdk
 */

import { tool } from 'ai';
import { z } from 'zod';

const TPMJS_EXECUTOR_URL = process.env.TPMJS_EXECUTOR_URL || 'https://executor.tpmjs.com';

interface ExecuteResponse {
  output?: unknown;
  [key: string]: unknown;
}

export const tpmjsRegistryExecuteTool = tool({
  description: 'Execute any tool from the TPMJS registry by its toolId. Tools run in a secure sandbox - no local installation required. Use tpmjsRegistrySearch first to find tools and get their toolIds.',
  inputSchema: z.object({
    toolId: z.string().describe('Tool identifier in format `package::exportName` (get this from tpmjsRegistrySearch)'),
    params: z.record(z.any()).describe('Arguments to pass to the tool (varies by tool)'),
    env: z.record(z.string()).optional().describe('Environment variables and API keys needed by the tool'),
  }),
  execute: async ({ toolId, params, env }: { toolId: string; params: Record<string, unknown>; env?: Record<string, string> }) => {
    console.log(`🚀 TPMJS Registry Execute: ${toolId}`);
    console.log(`   Params: ${JSON.stringify(params)}`);

    const startTime = Date.now();

    try {
      // Validate toolId format
      if (!toolId.includes('::')) {
        return {
          success: false,
          error: 'invalid_tool_id',
          message: `Invalid toolId format. Expected "package::exportName", got "${toolId}". Use tpmjsRegistrySearch to find valid tool IDs.`,
          toolId,
        };
      }

      const executeUrl = `${TPMJS_EXECUTOR_URL}/api/execute`;

      const response = await fetch(executeUrl, {
        method: 'POST',
        headers: {
          'User-Agent': 'OmegaBot/1.0 (TPMJS Registry Execute)',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          toolId,
          params,
          env: env || {},
        }),
        signal: AbortSignal.timeout(60000), // 60 second timeout for execution
      });

      const executionTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`❌ TPMJS tool execution failed: ${response.status} ${response.statusText}`);

        // Parse error if JSON
        let errorDetails = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorDetails = errorJson.message || errorJson.error || errorText;
        } catch {
          // Not JSON, use as-is
        }

        return {
          success: false,
          error: 'execution_failed',
          message: `Tool execution failed: ${response.status} ${response.statusText}`,
          details: errorDetails,
          toolId,
          executionTimeMs: executionTime,
        };
      }

      const data = await response.json() as ExecuteResponse;

      console.log(`✅ TPMJS tool "${toolId}" executed in ${executionTime}ms`);

      return {
        success: true,
        toolId,
        executionTimeMs: executionTime,
        output: data.output || data,
        message: `Tool "${toolId}" executed successfully in ${executionTime}ms.`,
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('❌ TPMJS tool execution error:', error);

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'timeout',
          message: `Tool execution timed out after 60 seconds. The tool "${toolId}" may be taking too long to process.`,
          toolId,
          executionTimeMs: executionTime,
        };
      }

      // Handle network errors
      if (error instanceof Error && error.message.includes('fetch')) {
        return {
          success: false,
          error: 'network_error',
          message: `Network error connecting to TPMJS executor: ${error.message}`,
          toolId,
          executionTimeMs: executionTime,
        };
      }

      return {
        success: false,
        error: 'exception',
        message: `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
        toolId,
        executionTimeMs: executionTime,
      };
    }
  },
});
