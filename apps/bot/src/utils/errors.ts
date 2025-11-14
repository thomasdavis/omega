/**
 * Custom error classes for better error handling
 */

export class BotError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public userMessage?: string
  ) {
    super(message);
    this.name = 'BotError';
  }
}

export class DiscordAPIError extends BotError {
  constructor(message: string, statusCode: number = 500) {
    super(message, statusCode, 'Failed to communicate with Discord');
    this.name = 'DiscordAPIError';
  }
}

export class OpenAIError extends BotError {
  constructor(message: string, statusCode: number = 500) {
    super(message, statusCode, 'AI service is temporarily unavailable');
    this.name = 'OpenAIError';
  }
}

export class ValidationError extends BotError {
  constructor(message: string) {
    super(message, 400, 'Invalid request');
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends BotError {
  constructor(retryAfter?: number) {
    const message = retryAfter
      ? `Rate limited. Try again in ${retryAfter} seconds`
      : 'Rate limited. Please try again later';
    super(message, 429, message);
    this.name = 'RateLimitError';
  }
}

/**
 * Formats error for user-facing message
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof BotError && error.userMessage) {
    return `❌ ${error.userMessage}`;
  }

  if (error instanceof Error) {
    // Log full error for debugging
    console.error('Error:', error.message, error.stack);
    return '❌ An error occurred while processing your request. Please try again later.';
  }

  return '❌ An unexpected error occurred.';
}
