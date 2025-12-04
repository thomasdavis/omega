/**
 * Generic AxLLM DSL Tool Executor
 * Uses Ax LLM SDK v15+ to execute arbitrary tasks via dynamic DSL generation
 *
 * This tool allows users to specify tasks dynamically and translates them
 * into AxLLM DSL signatures for execution.
 *
 * Examples:
 * - "make a contextual joke about the conversation above"
 * - "summarize the key points from the discussion"
 * - "generate a creative story prompt based on the context"
 */

import { tool } from 'ai';
import { z } from 'zod';
import { ai, ax } from '@ax-llm/ax';

export const axllmExecutorTool = tool({
  description: `Execute arbitrary AI tasks using dynamic DSL generation with the Ax LLM framework.

  This is a generic, flexible tool that can handle various AI tasks by dynamically creating
  the appropriate DSL (Domain Specific Language) signature and executing it.

  The tool takes a task description and optional context, then:
  1. Analyzes the task to determine the appropriate input/output schema
  2. Generates a dynamic AxLLM DSL signature
  3. Executes the task using the Ax LLM SDK
  4. Returns both the result and the DSL signature used

  Example use cases:
  - "make a contextual joke about the conversation above" with context from chat history
  - "summarize this text in 3 bullet points" with the text as context
  - "generate a creative story opening" with optional theme context
  - "translate this to French" with the text to translate
  - "extract key entities from this description" with the description text

  The tool is context-aware and can use provided context to perform tasks that reference
  "the conversation above", "this text", or other contextual information.`,

  inputSchema: z.object({
    task: z.string().describe('Description of the task to perform (e.g., "make a joke about the context", "summarize this text", "generate creative ideas")'),
    context: z.string().optional().describe('Optional context for the task (e.g., conversation history, text to process, background information)'),
    outputFormat: z.enum(['text', 'list', 'json']).optional().default('text').describe('Desired output format: text (default), list (bullet points), or json (structured data)'),
  }),

  execute: async ({ task, context, outputFormat = 'text' }) => {
    try {
      console.log(`🚀 Executing AxLLM task: "${task.substring(0, 60)}..."`);

      // Validate API key is set
      if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY environment variable is not set');
        return {
          success: false,
          task,
          error: 'OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.',
        };
      }

      // Generate dynamic DSL signature based on task and output format
      const dslSignature = generateDSLSignature(task, outputFormat);
      console.log(`   Generated DSL: ${dslSignature}`);

      // Initialize AI client with OpenAI
      const llm = ai({
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Create executor with dynamic DSL signature
      const executor = ax(dslSignature);

      // Prepare input for the executor
      const input: Record<string, any> = {
        task,
      };

      if (context) {
        input.context = context;
      }

      // Execute the task
      const result = await executor.forward(llm, input);

      console.log(`✅ Task completed successfully`);

      // Extract the output field name from the DSL signature
      // DSL format: "inputs -> fieldName:type description"
      const outputFieldMatch = dslSignature.match(/-> ([a-z_]+):/);
      const expectedFieldName = outputFieldMatch ? outputFieldMatch[1] : null;

      // Try to find the output field in the result
      // Priority: expected field name > common alternatives > first field
      const outputKey = expectedFieldName && result[expectedFieldName]
        ? expectedFieldName
        : Object.keys(result).find(key =>
            key === 'result' || key === 'response' || key === 'output'
          ) || Object.keys(result)[0];

      return {
        success: true,
        task,
        result: result[outputKey],
        dslUsed: dslSignature,
        outputFieldName: outputKey,
        fullOutput: result,
        note: 'Task executed using the Ax LLM framework with dynamically generated DSL',
      };

    } catch (error) {
      console.error('Error executing AxLLM task:', error);

      return {
        success: false,
        task,
        error: error instanceof Error ? error.message : 'Failed to execute task',
        note: 'If the error persists, try simplifying your task description or providing clearer context.',
      };
    }
  },
});

/**
 * Generate a dynamic DSL signature based on the task and output format
 *
 * DSL signature format: "input1:type, input2:type -> outputFieldName:type description"
 *
 * @param task - The task description
 * @param outputFormat - The desired output format
 * @returns A valid AxLLM DSL signature string
 */
function generateDSLSignature(task: string, outputFormat: string): string {
  // Determine if context is needed based on task keywords
  const needsContext = /\b(this|above|context|conversation|following|given|provided)\b/i.test(task);

  // Build input part of signature
  const inputs: string[] = ['task:string'];
  if (needsContext) {
    inputs.push('context:string');
  }

  // Generate a task-specific output field name (non-generic)
  const outputFieldName = generateOutputFieldName(task);

  // Determine output type based on format
  let outputType = 'string';

  if (outputFormat === 'list') {
    outputType = 'list';
  } else if (outputFormat === 'json') {
    outputType = 'json';
  } else {
    // Analyze task to determine if output should be structured
    if (/\b(list|items|points|steps|bullet)\b/i.test(task)) {
      outputType = 'list';
    } else if (/\b(json|structure|object|data|entities)\b/i.test(task)) {
      outputType = 'json';
    }
  }

  // Combine field name and type
  const outputSpec = `${outputFieldName}:${outputType}`;

  // Generate description based on task
  const description = generateOutputDescription(task);

  // Construct full DSL signature
  return `${inputs.join(', ')} -> ${outputSpec} ${description}`;
}

/**
 * Generate a task-specific output field name (non-generic)
 * This ensures the DSL signature passes validation by avoiding generic names like "output"
 *
 * @param task - The task description
 * @returns A specific field name based on the task type
 */
function generateOutputFieldName(task: string): string {
  const taskLower = task.toLowerCase();

  // Map common task patterns to specific output field names
  if (taskLower.includes('joke') || taskLower.includes('humor')) {
    return 'joke';
  } else if (taskLower.includes('summarize') || taskLower.includes('summary')) {
    return 'summary';
  } else if (taskLower.includes('translate') || taskLower.includes('translation')) {
    return 'translation';
  } else if (taskLower.includes('generate') || taskLower.includes('create')) {
    return 'generated_content';
  } else if (taskLower.includes('extract')) {
    return 'extracted_data';
  } else if (taskLower.includes('analyze') || taskLower.includes('analysis')) {
    return 'analysis';
  } else if (taskLower.includes('compare') || taskLower.includes('comparison')) {
    return 'comparison';
  } else if (taskLower.includes('explain') || taskLower.includes('explanation')) {
    return 'explanation';
  } else if (taskLower.includes('list')) {
    return 'items';
  } else if (taskLower.includes('classify') || taskLower.includes('classification')) {
    return 'classification';
  } else if (taskLower.includes('find') || taskLower.includes('search')) {
    return 'findings';
  } else if (taskLower.includes('transform') || taskLower.includes('convert')) {
    return 'transformed_text';
  } else if (taskLower.includes('evaluate') || taskLower.includes('evaluation')) {
    return 'evaluation';
  } else if (taskLower.includes('recommend') || taskLower.includes('suggestion')) {
    return 'recommendation';
  }

  // Fallback: use "result" with a qualifier based on first verb/noun
  // Try to extract first meaningful word as qualifier
  const words = taskLower.match(/\b[a-z]{4,}\b/g);
  if (words && words.length > 0) {
    return `${words[0]}_result`;
  }

  // Last resort fallback (still better than just "output")
  return 'task_result';
}

/**
 * Generate a description for the output based on the task
 *
 * @param task - The task description
 * @returns A description string for the DSL output
 */
function generateOutputDescription(task: string): string {
  // Extract action from task (first verb or key action word)
  const taskLower = task.toLowerCase();

  // Common task patterns and their output descriptions
  if (taskLower.includes('joke')) {
    return '"a humorous response"';
  } else if (taskLower.includes('summarize') || taskLower.includes('summary')) {
    return '"a concise summary"';
  } else if (taskLower.includes('translate')) {
    return '"translated text"';
  } else if (taskLower.includes('generate') || taskLower.includes('create')) {
    return '"generated content"';
  } else if (taskLower.includes('extract') || taskLower.includes('find')) {
    return '"extracted information"';
  } else if (taskLower.includes('analyze') || taskLower.includes('analysis')) {
    return '"analysis result"';
  } else if (taskLower.includes('compare') || taskLower.includes('comparison')) {
    return '"comparison result"';
  } else if (taskLower.includes('explain')) {
    return '"explanation"';
  } else if (taskLower.includes('list')) {
    return '"list of items"';
  }

  // Default description
  return '"task result"';
}
