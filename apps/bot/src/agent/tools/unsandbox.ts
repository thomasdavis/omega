/**
 * Unsandbox Tool - Execute code in various programming languages
 * Integrates with Unsandbox API for safe code execution
 */

import { tool } from 'ai';
import { z } from 'zod';

// Supported programming languages
const SUPPORTED_LANGUAGES = [
  'javascript',
  'python',
  'typescript',
  'ruby',
  'go',
  'rust',
  'java',
  'cpp',
  'c',
  'php',
  'bash',
] as const;

export const unsandboxTool = tool({
  description: 'Execute code in a sandboxed environment. Supports multiple programming languages with configurable execution parameters.',
  inputSchema: z.object({
    language: z.enum(SUPPORTED_LANGUAGES).describe('The programming language to execute'),
    code: z.string().describe('The code to execute'),
    timeout: z.number().int().min(100).max(30000).optional().default(5000).describe('Execution timeout in milliseconds (default: 5000ms)'),
  }),
  execute: async ({ language, code, timeout }) => {
    try {
      const apiKey = process.env.UNSANDBOX_API_KEY;

      if (!apiKey) {
        return {
          success: false,
          error: 'Unsandbox API key not configured. Please set UNSANDBOX_API_KEY environment variable.',
          language,
        };
      }

      console.log(`🔧 Executing ${language} code via Unsandbox API...`);
      console.log(`   Timeout: ${timeout}ms`);

      // Call Unsandbox API
      const response = await fetch('https://api.unsandbox.com/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          language,
          code,
          timeout,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Unsandbox API error (${response.status}): ${errorText}`,
          language,
        };
      }

      const result = await response.json() as {
        stdout?: string;
        stderr?: string;
        exitCode?: number;
        executionTime?: number;
      };

      return {
        success: true,
        language,
        output: result.stdout || '',
        error: result.stderr || '',
        exitCode: result.exitCode,
        executionTime: result.executionTime,
      };
    } catch (error) {
      console.error('Error executing code via Unsandbox:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        language,
      };
    }
  },
});
