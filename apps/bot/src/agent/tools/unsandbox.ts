/**
 * Unsandbox Tools - Execute code in various programming languages
 * Integrates with Unsandbox API for safe code execution
 *
 * Provides three tools:
 * 1. unsandbox - Full workflow with automatic polling and progress updates
 * 2. unsandboxSubmit - Submit job and return immediately (for long-running code)
 * 3. unsandboxStatus - Check status of a submitted job
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { Message } from 'discord.js';
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

// Language-specific emojis for better UX
const LANGUAGE_EMOJIS: Record<string, string> = {
  'python': '🐍',
  'javascript': '📜',
  'node': '📜',
  'typescript': '📘',
  'ruby': '💎',
  'rust': '🦀',
  'go': '⚡',
  'java': '☕',
  'cpp': '🔧',
  'c': '🔧',
  'php': '🐘',
  'bash': '🐚',
};

// Supported programming languages (user-facing)
const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_MAP) as [string, ...string[]];

// Message context for sending Discord updates during tool execution
let currentMessageContext: Message | null = null;

export function setUnsandboxMessageContext(message: Message) {
  currentMessageContext = message;
}

export function clearUnsandboxMessageContext() {
  currentMessageContext = null;
}

/**
 * Get the emoji for a language
 */
function getLanguageEmoji(language: string): string {
  return LANGUAGE_EMOJIS[language.toLowerCase()] || '💻';
}

/**
 * Send a Discord message if context is available
 */
async function sendDiscordUpdate(content: string): Promise<void> {
  if (currentMessageContext && 'send' in currentMessageContext.channel) {
    try {
      await currentMessageContext.channel.send({ content });
    } catch (error) {
      console.error('Failed to send Discord update:', error);
    }
  }
}

/**
 * Main unsandbox tool - Full workflow with automatic polling and progress updates
 */
export const unsandboxTool = tool({
  description: 'Execute code in a sandboxed environment with automatic polling and progress updates. Supports multiple programming languages. Returns stdout, stderr, exit code, execution time, and artifacts. Use this for normal code execution (< 30s expected).',
  inputSchema: z.object({
    language: z.enum(SUPPORTED_LANGUAGES).describe('The programming language to execute (javascript, python, typescript, ruby, go, rust, java, cpp, c, php, bash)'),
    code: z.string().describe('The code to execute'),
    ttl: z.number().int().min(1).max(30).optional().default(5).describe('Time to live (TTL) in seconds for the execution (default: 5s, max: 30s)'),
    stdin: z.string().optional().describe('Standard input to provide to the program'),
    env: z.record(z.string()).optional().describe('Environment variables to set for the execution'),
  }),
  execute: async ({ language, code, ttl, stdin, env }) => {
    const timestamp = new Date().toISOString();
    const emoji = getLanguageEmoji(language);

    console.log(`\n🚀 [${timestamp}] Unsandbox Tool Execution Started`);
    console.log(`   Language: ${language}`);
    console.log(`   Code Length: ${code.length} characters`);
    console.log(`   TTL: ${ttl}s`);
    console.log(`   Has Stdin: ${stdin ? 'yes' : 'no'}`);
    console.log(`   Has Env Vars: ${env ? 'yes' : 'no'}`);

    try {
      // Create client instance
      console.log(`   🔧 Creating Unsandbox client...`);
      const client = createUnsandboxClient({
        timeout: 30000, // 30 seconds timeout for HTTP requests
      });
      console.log(`   ✅ Client created`);

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

      // Submit job to Unsandbox
      console.log(`   📤 Submitting code for execution...`);
      const submitResponse = await fetch('https://api.unsandbox.com/execute/async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer open-says-me',
        },
        body: JSON.stringify({
          language: runtimeLanguage,
          code,
          ttl: ttl || 5,
          env,
          stdin,
        }),
      });

      if (!submitResponse.ok) {
        throw new Error(`Failed to submit job: ${submitResponse.status} ${submitResponse.statusText}`);
      }

      const submitData: any = await submitResponse.json();
      const jobId: string = submitData.job_id;
      console.log(`   ✅ Job submitted: ${jobId}`);

      // Send initial Discord message
      await sendDiscordUpdate(`${emoji} Executing ${language} code... (Job ID: \`${jobId}\`)`);

      // Poll for completion with progress updates
      const maxAttempts = 60; // 60 attempts
      const pollInterval = 2000; // 2 seconds
      const progressInterval = 10000; // Send progress update every 10 seconds
      let lastProgressUpdate = Date.now();
      let lastStatus = submitData.status;

      console.log(`   🔄 Starting polling (max ${maxAttempts} attempts, ${pollInterval}ms interval)...`);

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Wait before polling
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        // Check status
        const statusResponse = await client.getExecutionStatus({ job_id: jobId });
        console.log(`   📊 Poll ${attempt + 1}/${maxAttempts}: ${statusResponse.status}`);

        // Send progress update if status changed or enough time has passed
        const elapsed = Date.now() - lastProgressUpdate;
        if (statusResponse.status !== lastStatus && statusResponse.status === 'running') {
          await sendDiscordUpdate(`🔄 Code is now executing...`);
          lastProgressUpdate = Date.now();
          lastStatus = statusResponse.status;
        } else if (attempt > 0 && elapsed >= progressInterval && statusResponse.status === 'running') {
          const elapsedSeconds = Math.floor((Date.now() - Date.parse(submitData.created_at || new Date().toISOString())) / 1000);
          await sendDiscordUpdate(`🔄 Still running... (${elapsedSeconds}s elapsed)`);
          lastProgressUpdate = Date.now();
        }

        // Check for terminal states
        if (statusResponse.status === 'completed' ||
            statusResponse.status === 'failed' ||
            statusResponse.status === 'timeout' ||
            statusResponse.status === 'cancelled') {
          console.log(`   ✅ Job reached terminal state: ${statusResponse.status}`);

          const success = statusResponse.status === 'completed' && (statusResponse.result?.success ?? false);
          return {
            success,
            language,
            output: statusResponse.result?.stdout || '',
            error: statusResponse.result?.stderr || statusResponse.result?.error || '',
            exitCode: statusResponse.result?.exit_code,
            executionTime: statusResponse.executionTime,
            status: statusResponse.status,
            jobId: statusResponse.job_id,
            artifacts: statusResponse.artifacts || [],
          };
        }
      }

      // Timeout
      console.log(`   ⏱️ Polling timeout after ${maxAttempts} attempts`);
      return {
        success: false,
        error: `Execution polling timed out after ${maxAttempts * pollInterval / 1000} seconds`,
        language,
        jobId,
      };

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

/**
 * Submit tool - Submit code for async execution without waiting
 */
export const unsandboxSubmitTool = tool({
  description: 'Advanced: Submit code for async execution and return immediately with a job ID. Use this for long-running code (> 30s) or when you want manual control over polling. Returns job_id that can be checked with unsandboxStatus.',
  inputSchema: z.object({
    language: z.enum(SUPPORTED_LANGUAGES).describe('The programming language to execute (javascript, python, typescript, ruby, go, rust, java, cpp, c, php, bash)'),
    code: z.string().describe('The code to execute'),
    ttl: z.number().int().min(1).max(300).optional().default(60).describe('Time to live (TTL) in seconds for the execution (default: 60s, max: 300s for long jobs)'),
    stdin: z.string().optional().describe('Standard input to provide to the program'),
    env: z.record(z.string()).optional().describe('Environment variables to set for the execution'),
  }),
  execute: async ({ language, code, ttl, stdin, env }) => {
    const timestamp = new Date().toISOString();
    const emoji = getLanguageEmoji(language);

    console.log(`\n📤 [${timestamp}] Unsandbox Submit Tool - Async Job Submission`);
    console.log(`   Language: ${language}`);
    console.log(`   Code Length: ${code.length} characters`);
    console.log(`   TTL: ${ttl}s`);

    try {
      // Map language
      const runtimeLanguage = LANGUAGE_MAP[language.toLowerCase()];
      if (!runtimeLanguage) {
        return {
          success: false,
          error: `Unsupported language: ${language}. Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`,
          language,
        };
      }

      // Submit job
      const submitResponse = await fetch('https://api.unsandbox.com/execute/async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer open-says-me',
        },
        body: JSON.stringify({
          language: runtimeLanguage,
          code,
          ttl: ttl || 60,
          env,
          stdin,
        }),
      });

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        throw new Error(`Failed to submit job: ${submitResponse.status} ${submitResponse.statusText} - ${errorText}`);
      }

      const submitData: any = await submitResponse.json();
      console.log(`   ✅ Job submitted: ${submitData.job_id}`);

      // Send Discord notification
      await sendDiscordUpdate(`${emoji} ${language} code submitted for execution! Job ID: \`${submitData.job_id}\`\nUse unsandboxStatus to check progress.`);

      return {
        success: true,
        job_id: submitData.job_id,
        status: submitData.status,
        language,
        message: `Job submitted successfully. Use unsandboxStatus with job_id "${submitData.job_id}" to check progress.`,
      };

    } catch (error) {
      console.error(`   ❌ Submit failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        language,
      };
    }
  },
});

/**
 * Status tool - Check the status of a previously submitted job
 */
export const unsandboxStatusTool = tool({
  description: 'Advanced: Check the status of a previously submitted code execution job. Returns current status and results (if completed). Use this to poll for long-running jobs submitted with unsandboxSubmit.',
  inputSchema: z.object({
    job_id: z.string().describe('The job ID returned from unsandboxSubmit'),
  }),
  execute: async ({ job_id }) => {
    const timestamp = new Date().toISOString();
    console.log(`\n🔍 [${timestamp}] Unsandbox Status Tool - Checking Job Status`);
    console.log(`   Job ID: ${job_id}`);

    try {
      // Create client and check status
      const client = createUnsandboxClient({ timeout: 30000 });
      const statusResponse = await client.getExecutionStatus({ job_id });

      console.log(`   Status: ${statusResponse.status}`);
      console.log(`   Completed: ${statusResponse.status === 'completed' ? 'yes' : 'no'}`);

      // Build response based on status
      const isTerminal = ['completed', 'failed', 'timeout', 'cancelled'].includes(statusResponse.status);
      const success = statusResponse.status === 'completed' && (statusResponse.result?.success ?? false);

      const response: any = {
        job_id,
        status: statusResponse.status,
        isComplete: isTerminal,
        success: isTerminal ? success : undefined,
      };

      // Add execution details if available
      if (statusResponse.executionTime) {
        response.executionTime = statusResponse.executionTime;
      }
      if (statusResponse.startedAt) {
        response.startedAt = statusResponse.startedAt;
      }
      if (statusResponse.completedAt) {
        response.completedAt = statusResponse.completedAt;
      }

      // Add results if completed
      if (isTerminal && statusResponse.result) {
        response.output = statusResponse.result.stdout || '';
        response.error = statusResponse.result.stderr || statusResponse.result.error || '';
        response.exitCode = statusResponse.result.exit_code;
        response.artifacts = statusResponse.artifacts || [];
      }

      // Add helpful message
      if (statusResponse.status === 'pending') {
        response.message = 'Job is queued and waiting to start.';
      } else if (statusResponse.status === 'running') {
        response.message = 'Job is currently executing. Check again in a moment.';
      } else if (statusResponse.status === 'completed') {
        response.message = success ? 'Job completed successfully!' : 'Job completed with errors.';
      } else if (statusResponse.status === 'failed') {
        response.message = 'Job failed during execution.';
      } else if (statusResponse.status === 'timeout') {
        response.message = 'Job execution timed out.';
      } else if (statusResponse.status === 'cancelled') {
        response.message = 'Job was cancelled.';
      }

      return response;

    } catch (error) {
      console.error(`   ❌ Status check failed:`, error);

      if (error instanceof UnsandboxApiError && error.status === 404) {
        return {
          job_id,
          success: false,
          error: 'Job not found. It may have already completed and been deleted, or the job ID is invalid.',
          notFound: true,
        };
      }

      return {
        job_id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
});
