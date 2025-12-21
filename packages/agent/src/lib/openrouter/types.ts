/**
 * Type definitions for OpenRouter API
 * Documentation: https://openrouter.ai/docs
 */

/**
 * OpenRouter model identifier
 * Examples: 'anthropic/claude-3.5-sonnet', 'openai/gpt-4-turbo', 'google/gemini-pro'
 */
export type OpenRouterModel = string;

/**
 * Message role in the conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Chat message
 */
export interface ChatMessage {
  /** Role of the message sender */
  role: MessageRole;
  /** Content of the message */
  content: string;
  /** Optional name of the sender */
  name?: string;
}

/**
 * Request to create a chat completion
 */
export interface ChatCompletionRequest {
  /** Model to use for completion */
  model: OpenRouterModel;
  /** Array of messages in the conversation */
  messages: ChatMessage[];
  /** Temperature for sampling (0-2, default: 1) */
  temperature?: number;
  /** Top-p sampling (0-1) */
  top_p?: number;
  /** Maximum tokens to generate */
  max_tokens?: number;
  /** Whether to stream the response */
  stream?: boolean;
  /** Stop sequences */
  stop?: string[];
  /** Frequency penalty (0-2) */
  frequency_penalty?: number;
  /** Presence penalty (0-2) */
  presence_penalty?: number;
  /** Number of completions to generate */
  n?: number;
}

/**
 * Usage information from the API
 */
export interface Usage {
  /** Number of tokens in the prompt */
  prompt_tokens: number;
  /** Number of tokens in the completion */
  completion_tokens: number;
  /** Total tokens used */
  total_tokens: number;
}

/**
 * Choice in the completion response
 */
export interface Choice {
  /** Index of this choice */
  index: number;
  /** The generated message */
  message: ChatMessage;
  /** Finish reason */
  finish_reason: string | null;
}

/**
 * Response from chat completion
 */
export interface ChatCompletionResponse {
  /** Unique identifier for the completion */
  id: string;
  /** Object type (always 'chat.completion') */
  object: string;
  /** Unix timestamp of creation */
  created: number;
  /** Model used for completion */
  model: string;
  /** Array of completion choices */
  choices: Choice[];
  /** Usage statistics */
  usage?: Usage;
}

/**
 * Error response from OpenRouter API
 */
export interface OpenRouterError {
  /** Error message */
  message: string;
  /** Error type */
  type?: string;
  /** Error code */
  code?: string;
  /** HTTP status code */
  status: number;
}

/**
 * Configuration for OpenRouter client
 */
export interface OpenRouterConfig {
  /** API key for authentication */
  apiKey?: string;
  /** Base URL for the API (default: https://openrouter.ai/api/v1) */
  baseUrl?: string;
  /** Default timeout for requests in milliseconds (default: 60000) */
  timeout?: number;
  /** HTTP Referer header (optional, for rankings) */
  httpReferer?: string;
  /** X-Title header (optional, for rankings) */
  appTitle?: string;
}

/**
 * Model information
 */
export interface ModelInfo {
  /** Model identifier */
  id: string;
  /** Model name */
  name: string;
  /** Model description */
  description?: string;
  /** Pricing information */
  pricing?: {
    prompt: string;
    completion: string;
  };
  /** Context length */
  context_length?: number;
}

/**
 * Response from /models endpoint
 */
export interface ModelsResponse {
  /** Array of available models */
  data: ModelInfo[];
}
