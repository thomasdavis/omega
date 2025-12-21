/**
 * OpenRouter API Client
 * Comprehensive SDK for interacting with OpenRouter API
 *
 * API Documentation: https://openrouter.ai/docs
 */

import type {
  OpenRouterConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ModelsResponse,
  OpenRouterError,
} from './types.js';

/**
 * Custom error class for OpenRouter API errors
 */
export class OpenRouterApiError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'OpenRouterApiError';
  }
}

/**
 * OpenRouter API Client
 * Handles authentication, request formatting, and error handling for all API endpoints
 */
export class OpenRouterClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly httpReferer?: string;
  private readonly appTitle?: string;

  constructor(config: OpenRouterConfig) {
    // Use API key from config or environment variable
    this.apiKey = config.apiKey || process.env.OPENROUTER_API_KEY || '';
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
    this.timeout = config.timeout || 60000; // Default: 60000ms timeout for HTTP requests
    this.httpReferer = config.httpReferer;
    this.appTitle = config.appTitle || 'Omega Discord Bot';

    // Log initialization
    if (!this.apiKey) {
      console.log('⚠️ OpenRouter client initialized without API key');
    } else {
      console.log('🔑 OpenRouter client initialized successfully');
    }
  }

  /**
   * Make an authenticated request to the OpenRouter API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const requestStartTime = Date.now();
    const timestamp = new Date().toISOString();

    // Log request details
    console.log(`\n🌐 [${timestamp}] OpenRouter API Request`);
    console.log(`   URL: ${url}`);
    console.log(`   Method: ${options.method || 'GET'}`);
    console.log(`   Timeout: ${this.timeout}ms`);

    // Log request body (if present) - sanitize sensitive data
    if (options.body) {
      try {
        const bodyData = JSON.parse(options.body as string);
        console.log(`   Request Body:`, JSON.stringify(bodyData, null, 2));
      } catch {
        console.log(`   Request Body: [Unable to parse]`);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers as Record<string, string>,
      };

      // Add optional headers for rankings
      if (this.httpReferer) {
        headers['HTTP-Referer'] = this.httpReferer;
      }
      if (this.appTitle) {
        headers['X-Title'] = this.appTitle;
      }

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const requestDuration = Date.now() - requestStartTime;

      // Log response details
      console.log(`\n📥 [${new Date().toISOString()}] OpenRouter API Response`);
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Duration: ${requestDuration}ms`);
      console.log(`   Headers:`, {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length'),
        'x-request-id': response.headers.get('x-request-id'),
      });

      // Handle non-OK responses
      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any;

        console.log(`\n❌ [${new Date().toISOString()}] OpenRouter API Error Response`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Error Body:`, errorText);

        try {
          errorData = JSON.parse(errorText);
          console.log(`   Parsed Error:`, JSON.stringify(errorData, null, 2));
        } catch {
          errorData = { message: errorText };
          console.log(`   Error parsing response as JSON`);
        }

        console.log(`   🔍 Error Analysis:`);
        console.log(`      - Endpoint: ${endpoint}`);
        console.log(`      - Method: ${options.method || 'GET'}`);
        console.log(`      - Status Code: ${response.status}`);
        console.log(`      - Error Code: ${errorData.error?.code || errorData.code || 'N/A'}`);
        console.log(`      - Message: ${errorData.error?.message || errorData.message || errorText}`);

        throw new OpenRouterApiError(
          response.status,
          errorData.error?.code || errorData.code,
          errorData.error?.message || errorData.message || `API request failed with status ${response.status}`,
          errorData
        );
      }

      // Parse and return response
      const responseText = await response.text();
      console.log(`   Response Body (raw):`, responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));

      let data: T;
      try {
        data = JSON.parse(responseText) as T;
        console.log(`   ✅ Response parsed successfully`);
      } catch (parseError) {
        console.log(`   ❌ Failed to parse response as JSON:`, parseError);
        throw new OpenRouterApiError(
          response.status,
          'PARSE_ERROR',
          'Failed to parse API response as JSON',
          { originalResponse: responseText, parseError }
        );
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      const requestDuration = Date.now() - requestStartTime;

      console.log(`\n💥 [${new Date().toISOString()}] OpenRouter API Request Failed`);
      console.log(`   Duration: ${requestDuration}ms`);
      console.log(`   URL: ${url}`);
      console.log(`   Method: ${options.method || 'GET'}`);

      // Re-throw OpenRouterApiError as-is
      if (error instanceof OpenRouterApiError) {
        console.log(`   Error Type: OpenRouterApiError`);
        console.log(`   Status: ${error.status}`);
        console.log(`   Code: ${error.code}`);
        console.log(`   Message: ${error.message}`);
        throw error;
      }

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`   ⏱️ Error Type: Timeout`);
        console.log(`   Timeout Duration: ${this.timeout}ms`);
        console.log(`   Actual Duration: ${requestDuration}ms`);
        throw new OpenRouterApiError(
          408,
          'TIMEOUT',
          `Request timed out after ${this.timeout}ms`
        );
      }

      // Handle network errors
      if (error instanceof Error) {
        console.log(`   🌐 Error Type: Network Error`);
        console.log(`   Error Name: ${error.name}`);
        console.log(`   Error Message: ${error.message}`);
        throw new OpenRouterApiError(
          0,
          'NETWORK_ERROR',
          `Network error: ${error.message}`,
          { originalError: error }
        );
      }

      // Unknown error
      console.log(`   ❓ Error Type: Unknown`);
      console.log(`   Error:`, error);
      throw new OpenRouterApiError(
        0,
        'UNKNOWN_ERROR',
        'An unknown error occurred',
        { originalError: error }
      );
    }
  }

  /**
   * Create a chat completion
   *
   * @param request - Chat completion request
   * @returns Chat completion response with generated text
   *
   * @example
   * ```typescript
   * const response = await client.createChatCompletion({
   *   model: 'anthropic/claude-3.5-sonnet',
   *   messages: [
   *     { role: 'user', content: 'Hello!' }
   *   ],
   *   max_tokens: 100
   * });
   * console.log(response.choices[0].message.content);
   * ```
   */
  async createChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const timestamp = new Date().toISOString();
    console.log(`\n💬 [${timestamp}] Creating Chat Completion`);
    console.log(`   Model: ${request.model}`);
    console.log(`   Messages: ${request.messages.length}`);
    console.log(`   Max Tokens: ${request.max_tokens || 'default'}`);
    console.log(`   Temperature: ${request.temperature ?? 1}`);

    const response = await this.request<ChatCompletionResponse>('/chat/completions', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    console.log(`\n✅ [${new Date().toISOString()}] Chat Completion Created`);
    console.log(`   Completion ID: ${response.id}`);
    console.log(`   Model: ${response.model}`);
    console.log(`   Choices: ${response.choices.length}`);
    if (response.usage) {
      console.log(`   Prompt Tokens: ${response.usage.prompt_tokens}`);
      console.log(`   Completion Tokens: ${response.usage.completion_tokens}`);
      console.log(`   Total Tokens: ${response.usage.total_tokens}`);
    }
    if (response.choices.length > 0) {
      const content = response.choices[0].message.content;
      console.log(`   Response Preview: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`);
    }

    return response;
  }

  /**
   * Get list of available models
   *
   * @returns List of models with their information
   *
   * @example
   * ```typescript
   * const models = await client.getModels();
   * models.data.forEach(model => {
   *   console.log(`${model.id}: ${model.name}`);
   * });
   * ```
   */
  async getModels(): Promise<ModelsResponse> {
    console.log(`\n🌐 [${new Date().toISOString()}] Fetching Available Models`);
    console.log(`   Querying /models endpoint...`);

    const response = await this.request<ModelsResponse>('/models', {
      method: 'GET',
    });

    console.log(`\n📋 [${new Date().toISOString()}] Models Retrieved`);
    console.log(`   Total Models: ${response.data.length}`);
    console.log(`   Models: ${response.data.slice(0, 10).map(m => m.id).join(', ')}${response.data.length > 10 ? '...' : ''}`);

    return response;
  }

  /**
   * Health check - verify API is reachable
   *
   * @returns True if API is healthy
   */
  async healthCheck(): Promise<boolean> {
    console.log(`\n💓 [${new Date().toISOString()}] Health Check`);
    console.log(`   Checking API availability...`);

    try {
      await this.getModels();
      console.log(`   ✅ API is healthy`);
      return true;
    } catch (error) {
      console.log(`   ❌ API is not healthy`);
      if (error instanceof Error) {
        console.log(`   Error: ${error.message}`);
      }
      return false;
    }
  }
}

/**
 * Create a new OpenRouter client instance
 *
 * @param config - Client configuration
 * @returns Configured OpenRouter client
 *
 * @example
 * ```typescript
 * const client = createOpenRouterClient({
 *   apiKey: process.env.OPENROUTER_API_KEY!,
 * });
 *
 * const response = await client.createChatCompletion({
 *   model: 'anthropic/claude-3.5-sonnet',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * });
 * ```
 */
export function createOpenRouterClient(config: OpenRouterConfig): OpenRouterClient {
  return new OpenRouterClient(config);
}
