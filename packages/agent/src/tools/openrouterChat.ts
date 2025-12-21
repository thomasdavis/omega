/**
 * OpenRouter Chat Tool - Generate chat completions using OpenRouter API
 * Provides access to multiple LLM providers through a unified interface
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createOpenRouterClient } from '../lib/openrouter/client.js';
import type { ChatMessage } from '../lib/openrouter/types.js';

export const openrouterChatTool = tool({
  description: `Generate chat completions using OpenRouter API. OpenRouter provides access to multiple LLM providers including Claude, GPT-4, Gemini, and more through a unified API. Use this when you need to leverage specific models from different providers or want model flexibility.`,
  inputSchema: z.object({
    model: z.string().describe('Model to use (e.g., "anthropic/claude-3.5-sonnet", "openai/gpt-4-turbo", "google/gemini-pro")'),
    messages: z.array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']).describe('Role of the message sender'),
        content: z.string().describe('Content of the message'),
      })
    ).describe('Array of messages in the conversation'),
    maxTokens: z.number().int().min(1).max(100000).optional().describe('Maximum tokens to generate (default: model-specific)'),
    temperature: z.number().min(0).max(2).optional().describe('Temperature for sampling (0-2, default: 1). Lower is more deterministic.'),
    topP: z.number().min(0).max(1).optional().describe('Top-p sampling (0-1). Alternative to temperature.'),
  }),
  execute: async ({ model, messages, maxTokens, temperature, topP }) => {
    try {
      console.log(`🤖 Generating OpenRouter chat completion`);
      console.log(`   Model: ${model}`);
      console.log(`   Messages: ${messages.length}`);

      // Check if API key is configured
      if (!process.env.OPENROUTER_API_KEY) {
        return {
          success: false,
          error: 'OpenRouter API key is not configured. Please set OPENROUTER_API_KEY environment variable.',
        };
      }

      // Create OpenRouter client
      const client = createOpenRouterClient({
        apiKey: process.env.OPENROUTER_API_KEY,
      });

      // Convert messages to OpenRouter format
      const openrouterMessages: ChatMessage[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Create chat completion
      const response = await client.createChatCompletion({
        model,
        messages: openrouterMessages,
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
      });

      // Extract the first choice
      if (response.choices.length === 0) {
        return {
          success: false,
          error: 'No completion choices returned from OpenRouter API',
        };
      }

      const choice = response.choices[0];
      const content = choice.message.content;

      return {
        success: true,
        model: response.model,
        content,
        finishReason: choice.finish_reason,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
        id: response.id,
      };
    } catch (error) {
      console.error('OpenRouter chat error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OpenRouter chat completion failed',
      };
    }
  },
});
