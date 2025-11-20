/**
 * Check Job Status Tool - Check the status of a submitted code execution job
 * Use after submitCodeJob to get the results
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createUnsandboxClient, UnsandboxApiError } from '../../lib/unsandbox/index.js';

export const checkJobStatusTool = tool({
  description: 'Check the status of a code execution job by job_id. Use this after submitting a job with submitCodeJob tool. Returns the current status and results if completed.',
  inputSchema: z.object({
    job_id: z.string().describe('The job ID returned from submitCodeJob tool'),
  }),
  execute: async ({ job_id }) => {
    const timestamp = new Date().toISOString();
    console.log(`\n🔍 [${timestamp}] Check Job Status Tool Execution Started`);
    console.log(`   Job ID: ${job_id}`);

    try {
      // Create client instance
      const client = createUnsandboxClient({
        timeout: 30000,
      });

      // Get job status
      const result = await client.getExecutionStatus({ job_id });

      console.log(`\n✅ [${new Date().toISOString()}] Job Status Retrieved`);
      console.log(`   Job ID: ${result.job_id}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Exit Code: ${result.result?.exit_code ?? 'N/A'}`);
      console.log(`   Success: ${result.result?.success ?? 'N/A'}`);

      const success = result.status === 'completed' && (result.result?.success ?? false);

      const response = {
        success,
        job_id: result.job_id,
        status: result.status,
        output: result.result?.stdout || '',
        error: result.result?.stderr || result.result?.error || '',
        exitCode: result.result?.exit_code,
        executionTime: result.executionTime,
        artifacts: result.artifacts || [],
      };

      // Generate AI summary if job is completed
      if (result.status === 'completed') {
        console.log(`   🤖 Generating AI summary of execution results...`);
        try {
          const summaryResult = await generateText({
            model: openai.chat('gpt-5-mini'),
            prompt: `Analyze this code execution result and provide a brief, helpful summary for debugging purposes.

Job ID: ${job_id}
Status: ${result.status}

Execution Results:
- Success: ${success}
- Exit Code: ${result.result?.exit_code ?? 'N/A'}
- Execution Time: ${result.executionTime}ms

Standard Output:
${response.output || '(empty)'}

Standard Error:
${response.error || '(empty)'}

Artifacts: ${response.artifacts.length > 0 ? response.artifacts.map(a => a.name).join(', ') : 'none'}

Provide a concise 2-3 sentence summary that:
1. States what happened
2. Whether it succeeded or failed and why
3. Any notable outputs or errors

Keep it technical but clear for debugging purposes.`,
          });

          const aiSummary = summaryResult.text.trim();
          console.log(`   ✅ AI summary generated: ${aiSummary}`);

          return {
            ...response,
            aiSummary,
          };
        } catch (summaryError) {
          console.log(`   ⚠️ Failed to generate AI summary:`, summaryError);
          return response;
        }
      }

      // For non-completed jobs, return status info
      return {
        ...response,
        message: result.status === 'pending' || result.status === 'running'
          ? `Job is still ${result.status}. Check again in a few seconds.`
          : `Job ${result.status}.`,
      };
    } catch (error) {
      console.log(`\n💥 [${new Date().toISOString()}] Check Job Status Failed`);
      console.error('   Error details:', error);

      // Handle UnsandboxApiError specifically
      if (error instanceof UnsandboxApiError) {
        // Handle 404 - job not found (already completed or never existed)
        if (error.status === 404) {
          return {
            success: false,
            job_id,
            error: `Job not found. It may have already completed and been cleaned up, or never existed.`,
            errorCode: 'JOB_NOT_FOUND',
          };
        }

        return {
          success: false,
          job_id,
          error: `Unsandbox API error (${error.status}): ${error.message}`,
          errorCode: error.code,
        };
      }

      // Handle generic errors
      return {
        success: false,
        job_id,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
});
