/**
 * OpenRouter Completion Tool - Unified LLM access
 *
 * Features:
 * - Access to multiple LLM providers through single API
 * - Support for OpenAI, Anthropic, Google, Meta, and more
 * - Automatic routing and load balancing
 * - Cost-effective model selection
 * - Unified interface for all providers
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateWithOpenRouter } from '../services/openrouterService.js';

export const openrouterCompletionTool = tool({
  description: 'Generate text completions using OpenRouter API with access to multiple LLM providers (OpenAI, Anthropic, Google, Meta, etc.). OpenRouter provides unified access to many AI models through a single API, with automatic routing, load balancing, and competitive pricing. Use this when you need to access specific models or providers not directly available, or when you want to compare responses from different providers.',
  inputSchema: z.object({
    model: z.string().describe('The model to use for completion. Examples: "openai/gpt-4", "anthropic/claude-3.5-sonnet", "google/gemini-pro", "meta-llama/llama-3.1-70b-instruct". See https://openrouter.ai/models for full list.'),
    prompt: z.string().describe('The text prompt to send to the model. Be clear and specific for best results.'),
    maxTokens: z.number().optional().describe('Maximum number of tokens to generate. Default: 1000'),
    temperature: z.number().optional().describe('Temperature for sampling (0.0-2.0). Higher = more creative. Default: 0.7'),
    userId: z.string().optional().describe('User ID making the request. Use current user ID from context if available.'),
    username: z.string().optional().describe('Username making the request. Use current username from context if available.'),
  }),
  execute: async ({ model, prompt, maxTokens, temperature, userId, username }) => {
    try {
      console.log('🔀 OpenRouter Completion: Processing request...');
      console.log(`   🤖 Model: ${model}`);
      console.log(`   📝 Prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);
      console.log(`   👤 User: ${username || userId || 'anonymous'}`);

      const result = await generateWithOpenRouter({
        model,
        prompt,
        maxTokens,
        temperature,
        userId,
        username,
      });

      if (!result.success) {
        console.error('❌ OpenRouter API error:', result.error);
        return {
          success: false,
          error: result.error,
          message: `Failed to generate completion: ${result.error}`,
        };
      }

      console.log(`   ✅ Completion generated successfully`);
      console.log(`   📊 Tokens used: ${result.tokensUsed || 'unknown'}`);
      console.log(`   ⏱️  Latency: ${result.latencyMs}ms`);
      if (result.costUsd) {
        console.log(`   💰 Cost: $${result.costUsd.toFixed(6)}`);
      }

      return {
        success: true,
        response: result.response,
        model: result.model,
        tokensUsed: result.tokensUsed,
        latencyMs: result.latencyMs,
        costUsd: result.costUsd,
        requestId: result.requestId,
        message: `Successfully generated completion using ${result.model}`,
      };
    } catch (error) {
      console.error('❌ Error in openrouterCompletion tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to generate completion. Please check your API key and try again.',
      };
    }
  },
});
