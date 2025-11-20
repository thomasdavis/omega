/**
 * Submit Code Job Tool - Submit code for execution and get job_id (non-blocking)
 * Returns job_id immediately without waiting for completion
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

export const submitCodeJobTool = tool({
  description: 'Submit code for execution and receive a job_id immediately (non-blocking). Use this for long-running code where you want to check status later using checkJobStatus tool. For quick code execution with immediate results, use the regular unsandbox tool instead.',
  inputSchema: z.object({
    language: z.enum(SUPPORTED_LANGUAGES).describe('The programming language to execute (javascript, python, typescript, ruby, go, rust, java, cpp, c, php, bash)'),
    code: z.string().describe('The code to execute'),
    ttl: z.number().int().min(1).max(300).optional().default(5).describe('Time to live (TTL) in seconds for the execution (default: 5s, max: 300s for long jobs)'),
    stdin: z.string().optional().describe('Standard input to provide to the program'),
    env: z.record(z.string()).optional().describe('Environment variables to set for the execution'),
  }),
  execute: async ({ language, code, ttl, stdin, env }) => {
    const timestamp = new Date().toISOString();
    console.log(`\n🚀 [${timestamp}] Submit Code Job Tool Execution Started`);
    console.log(`   Language: ${language}`);
    console.log(`   Code Length: ${code.length} characters`);
    console.log(`   TTL: ${ttl}s`);

    try {
      // Create client instance
      const client = createUnsandboxClient({
        timeout: 30000,
      });

      // Map user-friendly language name to runtime identifier
      const runtimeLanguage = LANGUAGE_MAP[language.toLowerCase()];
      if (!runtimeLanguage) {
        return {
          success: false,
          error: `Unsupported language: ${language}. Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`,
          language,
        };
      }

      // Submit code execution (NO POLLING - returns immediately)
      const result = await client.submitCodeExecution({
        language: runtimeLanguage,
        code,
        ttl,
        stdin,
        env,
      });

      console.log(`\n✅ [${new Date().toISOString()}] Code Job Submitted`);
      console.log(`   Job ID: ${result.job_id}`);
      console.log(`   Initial Status: ${result.status}`);

      return {
        success: true,
        job_id: result.job_id,
        status: result.status,
        language,
        message: `Code execution job submitted successfully. Use checkJobStatus tool with job_id "${result.job_id}" to check the results later.`,
      };
    } catch (error) {
      console.log(`\n💥 [${new Date().toISOString()}] Submit Code Job Failed`);
      console.error('   Error details:', error);

      // Handle UnsandboxApiError specifically
      if (error instanceof UnsandboxApiError) {
        return {
          success: false,
          error: `Unsandbox API error (${error.status}): ${error.message}`,
          language,
          errorCode: error.code,
        };
      }

      // Handle generic errors
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        language,
      };
    }
  },
});
