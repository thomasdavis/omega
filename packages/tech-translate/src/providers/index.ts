/**
 * Provider Registry
 *
 * Exports all available LLM providers.
 */

export * from './base.js';
export * from './openai.js';
export * from './anthropic.js';

import type { LLMProvider } from './base.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import type { Provider, ProviderConfig } from '../types/index.js';

/**
 * Create a provider instance from configuration
 */
export function createProvider(config?: ProviderConfig): LLMProvider {
  if (!config) {
    // Default to OpenAI if available, otherwise Anthropic
    if (process.env.OPENAI_API_KEY) {
      return new OpenAIProvider();
    } else if (process.env.ANTHROPIC_API_KEY) {
      return new AnthropicProvider();
    } else {
      throw new Error('No LLM provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.');
    }
  }

  const providerType = config.provider || 'openai';

  switch (providerType) {
    case 'openai':
      return new OpenAIProvider({
        apiKey: config.apiKey,
        model: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        baseURL: config.baseURL,
      });

    case 'anthropic':
      return new AnthropicProvider({
        apiKey: config.apiKey,
        model: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        baseURL: config.baseURL,
      });

    case 'generic':
      throw new Error('Generic REST provider not yet implemented');

    default:
      throw new Error(`Unknown provider type: ${providerType}`);
  }
}
