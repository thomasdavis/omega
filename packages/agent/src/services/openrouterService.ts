/**
 * OpenRouter Service
 *
 * Provides integration with OpenRouter API for unified access to multiple LLM providers
 * (OpenAI, Anthropic, Google, Meta, etc.) through a single API interface.
 *
 * Documentation: https://openrouter.ai/docs
 */

export interface OpenRouterOptions {
  model: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  userId?: string;
  username?: string;
}

export interface OpenRouterResult {
  success: boolean;
  response?: string;
  model?: string;
  tokensUsed?: number;
  costUsd?: number;
  latencyMs?: number;
  error?: string;
  requestId?: string;
}

interface OpenRouterAPIResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate text completion using OpenRouter API
 */
export async function generateWithOpenRouter(
  options: OpenRouterOptions
): Promise<OpenRouterResult> {
  const { model, prompt, maxTokens = 1000, temperature = 0.7, userId, username } = options;

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  if (!OPENROUTER_API_KEY) {
    return {
      success: false,
      error: 'OPENROUTER_API_KEY is not configured in environment variables',
    };
  }

  const startTime = Date.now();

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://github.com/thomasdavis/omega',
        'X-Title': 'Omega AI Agent',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `OpenRouter API error (${response.status}): ${errorText}`,
        latencyMs,
      };
    }

    const data = (await response.json()) as OpenRouterAPIResponse;

    const responseText = data.choices?.[0]?.message?.content;
    const tokensUsed = data.usage?.total_tokens;

    if (!responseText) {
      return {
        success: false,
        error: 'No response content received from OpenRouter',
        latencyMs,
      };
    }

    // Note: Cost calculation would require checking OpenRouter's pricing API
    // For now, we'll leave it undefined and can enhance later
    const result: OpenRouterResult = {
      success: true,
      response: responseText,
      model: data.model,
      tokensUsed,
      latencyMs,
      requestId: data.id,
    };

    // Log request to database if tracking is needed (optional enhancement)
    // await logOpenRouterRequest({ userId, username, model, prompt, ...result });

    return result;
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.error('Error calling OpenRouter API:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error calling OpenRouter',
      latencyMs,
    };
  }
}

/**
 * Get list of available models from OpenRouter
 */
export async function getAvailableModels(): Promise<{
  success: boolean;
  models?: Array<{
    id: string;
    name: string;
    pricing?: {
      prompt: string;
      completion: string;
    };
  }>;
  error?: string;
}> {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  if (!OPENROUTER_API_KEY) {
    return {
      success: false,
      error: 'OPENROUTER_API_KEY is not configured in environment variables',
    };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to fetch models (${response.status}): ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      models: data.data,
    };
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching models',
    };
  }
}
