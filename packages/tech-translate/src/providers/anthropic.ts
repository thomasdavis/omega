/**
 * Anthropic provider implementation
 */

import { BaseProvider } from './base.js';
import type { ProviderRequest, ProviderResponse, ProviderConfig } from '../types/index.js';

/**
 * Anthropic provider using official SDK
 */
export class AnthropicProvider extends BaseProvider {
  name = 'anthropic';
  private apiKey: string;
  private model: string;
  private client: any; // Dynamic import to avoid hard dependency

  constructor(config?: ProviderConfig) {
    super();
    this.apiKey = this.getApiKey('ANTHROPIC_API_KEY', config?.apiKey);
    this.model = config?.model || 'claude-3-5-sonnet-20241022';
  }

  private async getClient() {
    if (!this.client) {
      try {
        const { Anthropic } = await import('@anthropic-ai/sdk');
        this.client = new Anthropic({ apiKey: this.apiKey });
      } catch (error) {
        throw new Error(
          'Anthropic SDK not installed. Install with: npm install @anthropic-ai/sdk'
        );
      }
    }
    return this.client;
  }

  async generate(request: ProviderRequest): Promise<ProviderResponse> {
    const client = await this.getClient();

    const response = await this.retry(async () => {
      return await client.messages.create({
        model: this.model,
        max_tokens: request.maxTokens ?? 8192,
        temperature: request.temperature ?? 0.7,
        system: request.systemPrompt,
        messages: [
          { role: 'user', content: request.prompt },
        ],
      });
    });

    const content = response.content[0];
    if (!content || content.type !== 'text') {
      throw new Error('No text response from Anthropic');
    }

    return {
      text: content.text,
      model: response.model,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      finishReason: response.stop_reason,
    };
  }
}
