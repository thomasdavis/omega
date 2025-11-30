/**
 * Error Logger - Structured error logging utility
 * Provides consistent error tracking with context and stack traces
 */

export interface ErrorContext {
  operation?: string;
  toolName?: string;
  username?: string;
  channelName?: string;
  messageContent?: string;
  additionalInfo?: Record<string, unknown>;
}

export interface LoggedError {
  timestamp: string;
  errorType: string;
  errorMessage: string;
  context: ErrorContext;
  stack?: string;
}

/**
 * Log an error with full context and stack trace
 * Sanitizes sensitive information before logging
 */
export function logError(error: unknown, context: ErrorContext = {}): LoggedError {
  const timestamp = new Date().toISOString();
  const errorType = error?.constructor?.name || 'Unknown';
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // Sanitize message content to prevent logging of sensitive data
  const sanitizedContext = {
    ...context,
    messageContent: context.messageContent ? truncateString(context.messageContent, 200) : undefined,
  };

  const loggedError: LoggedError = {
    timestamp,
    errorType,
    errorMessage,
    context: sanitizedContext,
    stack,
  };

  // Log structured error information
  console.error('═══════════════════════════════════════');
  console.error('❌ ERROR OCCURRED');
  console.error('───────────────────────────────────────');
  console.error(`⏰ Timestamp: ${timestamp}`);
  console.error(`🏷️  Type: ${errorType}`);
  console.error(`💬 Message: ${errorMessage}`);

  if (sanitizedContext.operation) {
    console.error(`⚙️  Operation: ${sanitizedContext.operation}`);
  }

  if (sanitizedContext.toolName) {
    console.error(`🔧 Tool: ${sanitizedContext.toolName}`);
  }

  if (sanitizedContext.username) {
    console.error(`👤 User: ${sanitizedContext.username}`);
  }

  if (sanitizedContext.channelName) {
    console.error(`📍 Channel: #${sanitizedContext.channelName}`);
  }

  if (sanitizedContext.messageContent) {
    console.error(`📝 Message: ${sanitizedContext.messageContent}`);
  }

  if (sanitizedContext.additionalInfo) {
    console.error(`ℹ️  Additional Info: ${JSON.stringify(sanitizedContext.additionalInfo, null, 2)}`);
  }

  if (stack) {
    console.error('───────────────────────────────────────');
    console.error('📚 Stack Trace:');
    console.error(stack);
  }

  console.error('═══════════════════════════════════════');

  return loggedError;
}

/**
 * Generate a user-friendly error message based on error type
 * Provides actionable information without exposing sensitive details
 */
export function generateUserErrorMessage(error: unknown, context: ErrorContext = {}): string {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Handle specific error types with helpful messages
  if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
    return '❌ I encountered a network error while processing your request. This could be due to connectivity issues or an external service being unavailable. Please try again in a moment.';
  }

  if (errorMessage.includes('timeout')) {
    return '❌ The operation took too long and timed out. This might be due to a slow external service or high server load. Please try again.';
  }

  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    return '❌ I\'ve hit a rate limit with an external service. Please wait a moment and try again.';
  }

  if (errorMessage.includes('parse') || errorMessage.includes('JSON')) {
    return '❌ I encountered an error parsing data. This might be due to an unexpected response format from an external service.';
  }

  if (errorMessage.includes('unauthorized') || errorMessage.includes('401') || errorMessage.includes('403')) {
    return '❌ I don\'t have permission to access a required service. This is a configuration issue that needs to be resolved by the administrator.';
  }

  if (context.toolName) {
    return `❌ An error occurred while using the **${context.toolName}** tool: ${sanitizeErrorForUser(errorMessage)}. Please try rephrasing your request or try again later.`;
  }

  if (context.operation) {
    return `❌ An error occurred during **${context.operation}**: ${sanitizeErrorForUser(errorMessage)}. Please try again or contact support if the issue persists.`;
  }

  // Generic fallback with some context
  return `❌ I encountered an error processing your message: ${sanitizeErrorForUser(errorMessage)}. Please try again or rephrase your request.`;
}

/**
 * Sanitize error message for user display
 * Removes technical details and sensitive information
 */
function sanitizeErrorForUser(message: string): string {
  // Remove file paths
  let sanitized = message.replace(/\/[\w\-_./]+/g, '[path]');

  // Remove tokens and API keys
  sanitized = sanitized.replace(/[a-zA-Z0-9]{20,}/g, '[token]');

  // Truncate very long messages
  sanitized = truncateString(sanitized, 150);

  return sanitized;
}

/**
 * Truncate a string to a maximum length
 */
function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength) + '...';
}

/**
 * Check if an error is safe to expose to users
 * Returns true if the error contains no sensitive information
 */
export function isErrorSafeForUser(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStr = errorMessage.toLowerCase();

  // Check for sensitive patterns
  const sensitivePatterns = [
    'token',
    'api key',
    'password',
    'secret',
    'credential',
    'auth',
    'bearer',
  ];

  return !sensitivePatterns.some(pattern => errorStr.includes(pattern));
}
