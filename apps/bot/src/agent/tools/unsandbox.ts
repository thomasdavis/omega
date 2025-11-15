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
  description: 'Execute code in a sandboxed environment. Supports multiple programming languages with configurable execution parameters. Returns stdout, stderr, exit code, and execution time.',
  inputSchema: z.object({
    language: z.enum(SUPPORTED_LANGUAGES).describe('The programming language to execute (javascript, python, typescript, ruby, go, rust, java, cpp, c, php, bash)'),
    code: z.string().describe('The code to execute'),
    timeout: z.number().int().min(100).max(30000).optional().default(5000).describe('Execution timeout in milliseconds (default: 5000ms, max: 30000ms)'),
    stdin: z.string().optional().describe('Standard input to provide to the program'),
    env: z.record(z.string()).optional().describe('Environment variables to set for the execution'),
  }),
  execute: async ({ language, code, timeout, stdin, env }) => {
    try {
      const apiKey = process.env.UNSANDBOX_API_KEY;

      if (!apiKey) {
        return {
          success: false,
          error: 'Unsandbox API key not configured. Please set UNSANDBOX_API_KEY environment variable.',
          language,
        };
      }

      // Create client instance
      const client = createUnsandboxClient({
        apiKey,
        timeout: 35000, // Client timeout should be longer than execution timeout
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

      // Execute code using the SDK
      const result = await client.executeCode({
        language: runtimeLanguage,
        code,
        timeout,
        stdin,
        env,
      });

      // Return standardized response
      return {
        success: result.status === 'completed' && result.exitCode === 0,
        language,
        output: result.stdout || '',
        error: result.stderr || result.error || '',
        exitCode: result.exitCode,
        executionTime: result.executionTime,
        status: result.status,
        executionId: result.id,
      };
    } catch (error) {
      console.error('Error executing code via Unsandbox:', error);

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
