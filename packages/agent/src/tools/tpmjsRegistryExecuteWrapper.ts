/**
 * TPMJS Registry Execute Wrapper
 * Executes tools from the TPMJS registry with automatic API key injection.
 * Uses TPMJS_API_KEY for authenticated access and auto-injects Omega's
 * configured API keys (Firecrawl, EXA, etc.) into tool executions.
 *
 * Supports both the TPMJS REST API and the @tpmjs/registry-execute npm package
 * as a fallback.
 *
 * API Reference: https://tpmjs.com/llms.txt
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  executeTpmjsTool,
  getTpmjsToolMetadata,
  hasTpmjsApiKey,
} from './tpmjsApiClient.js';

/**
 * Environment variables to automatically inject into TPMJS tool executions.
 * Includes TPMJS_API_KEY and any other API keys Omega has configured.
 */
function getInjectedEnvVars(): Record<string, string> {
  const envVars: Record<string, string> = {};

  // TPMJS API key for registry authentication
  if (process.env.TPMJS_API_KEY) {
    envVars.TPMJS_API_KEY = process.env.TPMJS_API_KEY;
  }

  // Firecrawl API key for web scraping tools
  if (process.env.FIRECRAWL_API_KEY) {
    envVars.FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
  }

  // EXA API key for search
  if (process.env.EXA_API_KEY) {
    envVars.EXA_API_KEY = process.env.EXA_API_KEY;
  }

  // Serper API key for Google Search
  if (process.env.SERPER_API_KEY) {
    envVars.SERPER_API_KEY = process.env.SERPER_API_KEY;
  }

  // Browserless API key for browser automation
  if (process.env.BROWSERLESS_API_KEY) {
    envVars.BROWSERLESS_API_KEY = process.env.BROWSERLESS_API_KEY;
  }

  // Unsandbox API key for code execution
  if (process.env.UNSANDBOX_API_KEY) {
    envVars.UNSANDBOX_API_KEY = process.env.UNSANDBOX_API_KEY;
  }

  // OpenAI API key for AI-powered tools
  if (process.env.OPENAI_API_KEY) {
    envVars.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  }

  return envVars;
}

/**
 * Wrapped registry execute tool that uses TPMJS API with authentication
 * and automatically injects Omega's API keys
 */
export const tpmjsRegistryExecuteWrappedTool = tool({
  description:
    'Execute any tool from the TPMJS registry by its toolId. Tools run in a secure sandbox - no local installation required. Uses TPMJS_API_KEY for authenticated access. API keys (FIRECRAWL_API_KEY, OPENAI_API_KEY, etc.) are automatically injected from Omega\'s environment.',
  inputSchema: z.object({
    toolId: z
      .string()
      .describe('Tool identifier in format `package::exportName` (get this from tpmjsRegistrySearch)'),
    params: z
      .record(z.any())
      .describe('Arguments to pass to the tool (varies by tool)'),
    env: z
      .record(z.string())
      .optional()
      .describe('Additional environment variables (Omega\'s API keys are auto-injected)'),
  }),
  execute: async (args: {
    toolId: string;
    params: Record<string, unknown>;
    env?: Record<string, string>;
  }) => {
    const { toolId, params, env } = args;
    console.log(`🚀 TPMJS Registry Execute: ${toolId}`);

    // Validate toolId format
    if (!toolId || typeof toolId !== 'string') {
      return {
        success: false,
        error: 'invalid_tool_id',
        message: 'toolId is required and must be a string in format "package::exportName"',
        toolId,
      };
    }

    const hasApiKey = hasTpmjsApiKey();
    if (!hasApiKey) {
      console.warn('⚠️  TPMJS_API_KEY not configured - execution may be limited');
    }

    // Merge auto-injected env vars with any user-provided ones
    // User-provided env vars take precedence
    const injectedEnv = getInjectedEnvVars();
    const mergedEnv = {
      ...injectedEnv,
      ...(env || {}),
    };

    const envKeysInjected = Object.keys(injectedEnv);
    if (envKeysInjected.length > 0) {
      console.log(`   Auto-injected env vars: ${envKeysInjected.join(', ')}`);
    }

    try {
      // Try TPMJS API client first (authenticated)
      const apiResult = await executeTpmjsTool(toolId, params, mergedEnv);

      if (apiResult.success) {
        console.log(`✅ TPMJS tool executed successfully (${apiResult.executionTimeMs}ms)`);
        return {
          success: true,
          authenticated: hasApiKey,
          toolId,
          result: apiResult.result,
          executionTimeMs: apiResult.executionTimeMs,
        };
      }

      // If API execution failed, try npm package fallback
      console.log('⚠️  API execution failed, trying npm package fallback...');
      try {
        const { registryExecuteTool } = await import('@tpmjs/registry-execute');
        const executeFunc = registryExecuteTool.execute as (args: {
          toolId: string;
          params: Record<string, unknown>;
          env?: Record<string, string>;
        }) => Promise<unknown>;

        const fallbackResult = await executeFunc({
          toolId,
          params,
          env: mergedEnv,
        });

        console.log('✅ TPMJS tool executed via npm package fallback');
        return {
          success: true,
          authenticated: hasApiKey,
          toolId,
          source: 'npm-package-fallback',
          result: fallbackResult,
        };
      } catch (fallbackError) {
        // Both API and npm package failed
        console.error('❌ Both API and npm package execution failed');

        // Provide helpful error with tool metadata if available
        const metadataResult = await getTpmjsToolMetadata(toolId).catch(() => ({
          metadata: null,
          error: null,
        }));

        return {
          success: false,
          authenticated: hasApiKey,
          error: 'execution_failed',
          message: apiResult.error || 'Tool execution failed via both API and npm package',
          toolId,
          toolMetadata: metadataResult.metadata
            ? {
                name: metadataResult.metadata.name,
                description: metadataResult.metadata.description,
                requiredEnvVars: metadataResult.metadata.envVars,
              }
            : undefined,
          suggestions: [
            'Verify the toolId is correct (format: "package::exportName")',
            'Check that required parameters are provided',
            !hasApiKey ? 'Configure TPMJS_API_KEY for authenticated access' : null,
            'Use tpmjsRegistrySearch to find the correct toolId',
          ].filter(Boolean),
        };
      }
    } catch (error) {
      console.error('❌ TPMJS Registry Execute error:', error);
      return {
        success: false,
        authenticated: hasApiKey,
        error: 'execution_failed',
        message: error instanceof Error ? error.message : 'Unknown error during TPMJS tool execution',
        toolId,
      };
    }
  },
});
