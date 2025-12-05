/**
 * OpenAI provider implementation
 */

import { BaseProvider } from './base.js';
import type { ProviderRequest, ProviderResponse, ProviderConfig } from '../types/index.js';

/**
 * OpenAI provider using official SDK
 */
export class OpenAIProvider extends BaseProvider {
  name = 'openai';
  private apiKey: string;
  private model: string;
  private client: any; // Dynamic import to avoid hard dependency

  constructor(config?: ProviderConfig) {
    super();
    this.apiKey = this.getApiKey('OPENAI_API_KEY', config?.apiKey);
    this.model = config?.model || 'gpt-4o';
  }

  private async getClient() {
    if (!this.client) {
      try {
        const { OpenAI } = await import('openai');
        this.client = new OpenAI({ apiKey: this.apiKey });
      } catch (error) {
        throw new Error(
          'OpenAI SDK not installed. Install with: npm install openai'
        );
      }
    }
    return this.client;
  }

  async generate(request: ProviderRequest): Promise<ProviderResponse> {
    const client = await this.getClient();

    const response = await this.retry(async () => {
      return await client.chat.completions.create({
        model: this.model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt },
        ],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4096,
      });
    });

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No response from OpenAI');
    }

    return {
      text: choice.message.content || '',
      model: response.model,
      tokensUsed: response.usage?.total_tokens,
      finishReason: choice.finish_reason,
    };
  }
}
