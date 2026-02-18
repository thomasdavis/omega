import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export const maxDuration = 300;

const ENDPOINT = '/api/v1/chat/completions';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionsRequest {
  model?: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

function errorResponse(message: string, type: string, code: string | number, status: number) {
  return NextResponse.json(
    { error: { message, type, code } },
    { status }
  );
}

function extractBearerToken(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return undefined;
}

function validateAuth(request: NextRequest): string | null {
  const apiKey = process.env.OMEGA_API_KEY;
  if (!apiKey) {
    return 'API key not configured';
  }

  const token = extractBearerToken(request);
  if (!token) {
    return 'Missing or malformed Authorization header';
  }

  if (token !== apiKey) {
    return 'Invalid API key';
  }

  return null;
}

function logUsageAsync(params: {
  requestId: string;
  apiKey?: string;
  modelRequested?: string;
  httpStatus: number;
  durationMs: number;
  messageCount?: number;
  responseLength?: number;
  errorType?: string;
  errorMessage?: string;
}): void {
  import('@repo/database')
    .then(({ logApiUsage }) =>
      logApiUsage({
        ...params,
        endpoint: ENDPOINT,
      })
    )
    .catch((err) => console.error('Failed to log API usage:', err));
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = randomUUID();
  const bearerToken = extractBearerToken(request);

  // Auth check
  const authError = validateAuth(request);
  if (authError) {
    logUsageAsync({
      requestId,
      apiKey: bearerToken,
      httpStatus: 401,
      durationMs: Date.now() - startTime,
      errorType: 'authentication_error',
      errorMessage: authError,
    });
    return errorResponse(authError, 'authentication_error', 'invalid_api_key', 401);
  }

  // Parse body
  let body: ChatCompletionsRequest;
  try {
    body = await request.json();
  } catch {
    logUsageAsync({
      requestId,
      apiKey: bearerToken,
      httpStatus: 400,
      durationMs: Date.now() - startTime,
      errorType: 'invalid_request_error',
      errorMessage: 'Invalid JSON in request body',
    });
    return errorResponse('Invalid JSON in request body', 'invalid_request_error', 'invalid_json', 400);
  }

  // Validate messages
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    logUsageAsync({
      requestId,
      apiKey: bearerToken,
      modelRequested: body.model,
      httpStatus: 400,
      durationMs: Date.now() - startTime,
      errorType: 'invalid_request_error',
      errorMessage: 'messages is required and must be a non-empty array',
    });
    return errorResponse('messages is required and must be a non-empty array', 'invalid_request_error', 'invalid_messages', 400);
  }

  // Reject streaming
  if (body.stream) {
    logUsageAsync({
      requestId,
      apiKey: bearerToken,
      modelRequested: body.model,
      httpStatus: 400,
      durationMs: Date.now() - startTime,
      messageCount: body.messages.length,
      errorType: 'invalid_request_error',
      errorMessage: 'Streaming is not supported',
    });
    return errorResponse('Streaming is not supported', 'invalid_request_error', 'unsupported_parameter', 400);
  }

  // Extract last user message and build history
  const lastUserIndex = body.messages.findLastIndex((m) => m.role === 'user');
  if (lastUserIndex === -1) {
    logUsageAsync({
      requestId,
      apiKey: bearerToken,
      modelRequested: body.model,
      httpStatus: 400,
      durationMs: Date.now() - startTime,
      messageCount: body.messages.length,
      errorType: 'invalid_request_error',
      errorMessage: 'At least one user message is required',
    });
    return errorResponse('At least one user message is required', 'invalid_request_error', 'invalid_messages', 400);
  }

  const userMessage = body.messages[lastUserIndex].content;
  const precedingMessages = body.messages.slice(0, lastUserIndex);

  // Convert preceding messages to agent messageHistory format
  const messageHistory = precedingMessages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      username: m.role === 'user' ? 'api-user' : 'omega',
      content: m.content,
    }));

  try {
    // Dynamic import to avoid bundling agent at compile time
    const { runAgent } = await import('@repo/agent');

    const result = await runAgent(userMessage, {
      username: 'api-user',
      userId: 'api-completions',
      channelName: 'api',
      messageHistory: messageHistory.length > 0 ? messageHistory : undefined,
    });

    const responseText = result.response || '';

    // Build OpenAI-compatible response
    const responseBody = {
      id: `chatcmpl-${requestId}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: body.model || 'omega',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: responseText,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };

    logUsageAsync({
      requestId,
      apiKey: bearerToken,
      modelRequested: body.model,
      httpStatus: 200,
      durationMs: Date.now() - startTime,
      messageCount: body.messages.length,
      responseLength: responseText.length,
    });

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error('Agent execution error:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    logUsageAsync({
      requestId,
      apiKey: bearerToken,
      modelRequested: body.model,
      httpStatus: 500,
      durationMs: Date.now() - startTime,
      messageCount: body.messages.length,
      errorType: 'server_error',
      errorMessage: errMsg,
    });
    return errorResponse(
      'Internal server error during agent execution',
      'server_error',
      'agent_error',
      500
    );
  }
}
