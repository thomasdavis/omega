/**
 * Unsandbox Tool - Execute code in various programming languages
 * Integrates with Unsandbox API for safe code execution
 *
 * Uses the comprehensive Unsandbox SDK with proper error handling,
 * correct endpoint usage, and support for all API features.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createUnsandboxClient, UnsandboxApiError, type UnsandboxLanguage } from '../../lib/unsandbox/index.js';

// Map user-friendly language names to Unsandbox runtime identifiers
const LANGUAGE_MAP: Record<string, UnsandboxLanguage> = {
  'javascript': 'node',
  'node': 'node',
  'python': 'python',
  'typescript': 'typescript',
  'ruby': 'ruby',
  'go': 'go',
  'rust': 'rust',
  'java': 'java',
  'cpp': 'cpp',
  'c': 'c',
  'php': 'php',
  'bash': 'bash',
};

// Supported programming languages (user-facing)
const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_MAP) as [string, ...string[]];

export const unsandboxTool = tool({
  description: 'Execute code in a sandboxed environment. Supports multiple programming languages with configurable execution parameters. Returns stdout, stderr, exit code, execution time, and artifacts.',
  inputSchema: z.object({
    language: z.enum(SUPPORTED_LANGUAGES).describe('The programming language to execute (javascript, python, typescript, ruby, go, rust, java, cpp, c, php, bash)'),
    code: z.string().describe('The code to execute'),
    ttl: z.number().int().min(1).max(30).optional().default(5).describe('Time to live (TTL) in seconds for the execution (default: 5s, max: 30s)'),
    stdin: z.string().optional().describe('Standard input to provide to the program'),
    env: z.record(z.string()).optional().describe('Environment variables to set for the execution'),
  }),
  execute: async ({ language, code, ttl, stdin, env }) => {
    const timestamp = new Date().toISOString();
    console.log(`\n🚀 [${timestamp}] Unsandbox Tool Execution Started`);
    console.log(`   Language: ${language}`);
    console.log(`   Code Length: ${code.length} characters`);
    console.log(`   TTL: ${ttl}s`);
    console.log(`   Has Stdin: ${stdin ? 'yes' : 'no'}`);
    console.log(`   Has Env Vars: ${env ? 'yes' : 'no'}`);

    try {
      // Create client instance (API key is hardcoded in client as per issue #149)
      console.log(`   🔧 Creating Unsandbox client...`);
      const client = createUnsandboxClient({
        timeout: 30000, // 30 seconds timeout for HTTP requests
      });
      console.log(`   ✅ Client created with hardcoded API key`);

      // Map user-friendly language name to runtime identifier
      console.log(`   🗺️ Mapping language '${language}' to runtime identifier...`);
      const runtimeLanguage = LANGUAGE_MAP[language.toLowerCase()];
      if (!runtimeLanguage) {
        console.log(`   ❌ Language '${language}' not supported`);
        console.log(`   Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`);
        return {
          success: false,
          error: `Unsupported language: ${language}. Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`,
          language,
        };
      }
      console.log(`   ✅ Mapped to runtime: ${runtimeLanguage}`);

      // Execute code using the SDK (async workflow with polling)
      console.log(`   ▶️ Executing code via SDK (async workflow)...`);
      const result = await client.executeCode({
        language: runtimeLanguage,
        code,
        ttl,
        stdin,
        env,
      });
      console.log(`   ✅ Code execution completed`);

      // Return standardized response
      console.log(`   📦 Preparing response...`);
      const success = result.status === 'completed' && (result.result?.success ?? false);
      console.log(`   Success: ${success} (status: ${result.status}, result.success: ${result.result?.success})`);

      const response = {
        success,
        language,
        output: result.result?.stdout || '',
        error: result.result?.stderr || result.result?.error || '',
        exitCode: result.result?.exit_code,
        executionTime: result.executionTime,
        status: result.status,
        jobId: result.job_id,
        artifacts: result.artifacts || [],
      };

      console.log(`\n✅ [${new Date().toISOString()}] Unsandbox Tool Execution Successful`);
      console.log(`   Output Length: ${response.output.length} characters`);
      console.log(`   Error Length: ${response.error.length} characters`);
      console.log(`   Artifacts: ${response.artifacts.length}`);

      return response;
    } catch (error) {
      console.log(`\n💥 [${new Date().toISOString()}] Unsandbox Tool Execution Failed`);
      console.error('   Error details:', error);

      // Handle UnsandboxApiError specifically
      if (error instanceof UnsandboxApiError) {
        console.log(`   Error Type: UnsandboxApiError`);
        console.log(`   Status: ${error.status}`);
        console.log(`   Code: ${error.code}`);
        console.log(`   Message: ${error.message}`);
        return {
          success: false,
          error: `Unsandbox API error (${error.status}): ${error.message}`,
          language,
          errorCode: error.code,
        };
      }

      // Handle generic errors
      console.log(`   Error Type: Generic Error`);
      console.log(`   Message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        language,
      };
    }
  },
});
