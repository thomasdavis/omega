/**
 * OpenAI Provider
 *
 * Implementation of LLMProvider for OpenAI models.
 */

import type { LLMProvider } from './base.js';
import { RateLimiter, withRetry } from './base.js';

export interface OpenAIConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  baseURL?: string;
}

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  private config: Required<OpenAIConfig>;
  private rateLimiter: RateLimiter;

  constructor(config: OpenAIConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.OPENAI_API_KEY || '',
      model: config.model || 'gpt-4o',
      maxTokens: config.maxTokens || 4000,
      temperature: config.temperature || 0.7,
      baseURL: config.baseURL || 'https://api.openai.com/v1',
    };
    this.rateLimiter = new RateLimiter(10, 1);
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  async generateText(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI provider not configured. Set OPENAI_API_KEY environment variable or provide apiKey in config.');
    }

    await this.rateLimiter.acquire();

    return withRetry(async () => {
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    });
  }
}
