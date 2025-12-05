/**
 * Base provider interface for LLM interactions
 */

import type { Provider, ProviderRequest, ProviderResponse } from '../types/index.js';

/**
 * Abstract base provider with common functionality
 */
export abstract class BaseProvider implements Provider {
  abstract name: string;

  abstract generate(request: ProviderRequest): Promise<ProviderResponse>;

  /**
   * Validate API key from environment or config
   */
  protected getApiKey(envVar: string, configKey?: string): string {
    const key = configKey || process.env[envVar];
    if (!key) {
      throw new Error(
        `API key not found. Set ${envVar} environment variable or provide apiKey in config.`
      );
    }
    return key;
  }

  /**
   * Parse JSON response with error handling
   */
  protected parseJSON<T = any>(text: string): T {
    try {
      // Handle cases where the LLM wraps JSON in markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      return JSON.parse(jsonText.trim());
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  protected async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors (4xx)
        if (lastError.message.includes('400') || lastError.message.includes('401') || lastError.message.includes('403')) {
          throw lastError;
        }

        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }
}
