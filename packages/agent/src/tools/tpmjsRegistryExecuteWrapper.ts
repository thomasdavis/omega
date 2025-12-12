/**
 * TPMJS Registry Execute Wrapper
 * Wraps the official @tpmjs/registry-execute tool to automatically inject
 * environment variables (API keys) from Omega's environment.
 *
 * This allows tools in the TPMJS registry to use Omega's configured API keys
 * without requiring users to manually pass them on each execution.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { registryExecuteTool } from '@tpmjs/registry-execute';

/**
 * Environment variables to automatically inject into TPMJS tool executions.
 * Add any API keys that Omega has configured that TPMJS tools might need.
 */
function getInjectedEnvVars(): Record<string, string> {
  const envVars: Record<string, string> = {};

  // Firecrawl API key for web scraping tools
  if (process.env.FIRECRAWL_API_KEY) {
    envVars.FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
  }

  // Add other API keys as needed
  if (process.env.EXA_API_KEY) {
    envVars.EXA_API_KEY = process.env.EXA_API_KEY;
  }

  if (process.env.SERPER_API_KEY) {
    envVars.SERPER_API_KEY = process.env.SERPER_API_KEY;
  }

  if (process.env.BROWSERLESS_API_KEY) {
    envVars.BROWSERLESS_API_KEY = process.env.BROWSERLESS_API_KEY;
  }

  return envVars;
}

/**
 * Wrapped registry execute tool that automatically injects Omega's API keys
 */
export const tpmjsRegistryExecuteWrappedTool = tool({
  description: 'Execute any tool from the TPMJS registry by its toolId. Tools run in a secure sandbox - no local installation required. API keys (FIRECRAWL_API_KEY, etc.) are automatically injected from Omega\'s environment.',
  inputSchema: z.object({
    toolId: z.string().describe('Tool identifier in format `package::exportName` (get this from tpmjsRegistrySearch)'),
    params: z.record(z.any()).describe('Arguments to pass to the tool (varies by tool)'),
    env: z.record(z.string()).optional().describe('Additional environment variables (Omega\'s API keys are auto-injected)'),
  }),
  execute: async (args: { toolId: string; params: Record<string, unknown>; env?: Record<string, string> }) => {
    const { toolId, params, env } = args;
    console.log(`🚀 TPMJS Registry Execute (wrapped): ${toolId}`);

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
      // Call the original tool's execute function directly
      // Cast to any to handle AI SDK version differences
      const executeFunc = registryExecuteTool.execute as (args: { toolId: string; params: Record<string, unknown>; env?: Record<string, string> }) => Promise<unknown>;
      const result = await executeFunc({
        toolId,
        params,
        env: mergedEnv,
      });

      return result;
    } catch (error) {
      console.error('❌ TPMJS Registry Execute error:', error);
      return {
        success: false,
        error: 'execution_failed',
        message: error instanceof Error ? error.message : 'Unknown error during TPMJS tool execution',
        toolId,
      };
    }
  },
});
