/**
 * Anthropic Provider
 *
 * Implementation of LLMProvider for Anthropic Claude models.
 */

import type { LLMProvider } from './base.js';
import { RateLimiter, withRetry } from './base.js';

export interface AnthropicConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  baseURL?: string;
}

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  private config: Required<AnthropicConfig>;
  private rateLimiter: RateLimiter;

  constructor(config: AnthropicConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || '',
      model: config.model || 'claude-3-5-sonnet-20241022',
      maxTokens: config.maxTokens || 4000,
      temperature: config.temperature || 0.7,
      baseURL: config.baseURL || 'https://api.anthropic.com/v1',
    };
    this.rateLimiter = new RateLimiter(10, 1);
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  async generateText(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Anthropic provider not configured. Set ANTHROPIC_API_KEY environment variable or provide apiKey in config.');
    }

    await this.rateLimiter.acquire();

    return withRetry(async () => {
      const response = await fetch(`${this.config.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      return data.content[0]?.text || '';
    });
  }
}
