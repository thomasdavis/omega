/**
 * Provider exports and factory
 */

export { BaseProvider } from './base.js';
export { OpenAIProvider } from './openai.js';
export { AnthropicProvider } from './anthropic.js';

import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import type { Provider, ProviderConfig } from '../types/index.js';

/**
 * Create provider instance from config
 */
export function createProvider(config?: ProviderConfig): Provider {
  const type = config?.type || detectProviderFromEnv();

  switch (type) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'generic':
      throw new Error('Generic provider not yet implemented. Use openai or anthropic.');
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

/**
 * Auto-detect provider from environment variables
 */
function detectProviderFromEnv(): 'openai' | 'anthropic' {
  if (process.env.OPENAI_API_KEY) {
    return 'openai';
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return 'anthropic';
  }

  // Default to OpenAI if neither is set (will throw error when trying to use)
  return 'openai';
}
