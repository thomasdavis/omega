/**
 * Unsandbox API Client
 * Comprehensive SDK for interacting with all Unsandbox API endpoints
 *
 * API Documentation: https://api.unsandbox.com/docs
 * OpenAPI Spec: https://api.unsandbox.com/openapi
 */

import type {
  UnsandboxConfig,
  ExecuteCodeRequest,
  ExecuteCodeResponse,
  GetExecutionStatusRequest,
  GetExecutionStatusResponse,
  ListArtifactsRequest,
  ListArtifactsResponse,
  UnsandboxError,
} from './types.js';

/**
 * Custom error class for Unsandbox API errors
 */
export class UnsandboxApiError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'UnsandboxApiError';
  }
}

/**
 * Unsandbox API Client
 * Handles authentication, request formatting, and error handling for all API endpoints
 */
export class UnsandboxClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config: UnsandboxConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required for Unsandbox client');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.unsandbox.com';
    this.timeout = config.timeout || 30000;
  }

  /**
   * Make an authenticated request to the Unsandbox API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any;

        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        throw new UnsandboxApiError(
          response.status,
          errorData.code,
          errorData.message || `API request failed with status ${response.status}`,
          errorData
        );
      }

      // Parse and return response
      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Re-throw UnsandboxApiError as-is
      if (error instanceof UnsandboxApiError) {
        throw error;
      }

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new UnsandboxApiError(
          408,
          'TIMEOUT',
          `Request timed out after ${this.timeout}ms`
        );
      }

      // Handle network errors
      if (error instanceof Error) {
        throw new UnsandboxApiError(
          0,
          'NETWORK_ERROR',
          `Network error: ${error.message}`,
          { originalError: error }
        );
      }

      // Unknown error
      throw new UnsandboxApiError(
        0,
        'UNKNOWN_ERROR',
        'An unknown error occurred',
        { originalError: error }
      );
    }
  }

  /**
   * Execute code in a sandboxed environment
   *
   * @param request - Code execution request
   * @returns Execution result with stdout, stderr, exit code, and timing
   *
   * @example
   * ```typescript
   * const result = await client.executeCode({
   *   language: 'python',
   *   code: 'print("Hello, World!")',
   *   timeout: 5000
   * });
   * console.log(result.stdout); // "Hello, World!\n"
   * ```
   */
  async executeCode(request: ExecuteCodeRequest): Promise<ExecuteCodeResponse> {
    console.log(`🔧 Executing ${request.language} code via Unsandbox API...`);
    console.log(`   Timeout: ${request.timeout || 5000}ms`);

    return this.request<ExecuteCodeResponse>('/v1/execute', {
      method: 'POST',
      body: JSON.stringify({
        language: request.language,
        code: request.code,
        timeout: request.timeout || 5000,
        env: request.env,
        stdin: request.stdin,
      }),
    });
  }

  /**
   * Get the status of a code execution
   * Useful for long-running executions to poll for completion
   *
   * @param request - Status request with execution ID
   * @returns Current execution status and results (if completed)
   *
   * @example
   * ```typescript
   * const status = await client.getExecutionStatus({ id: 'exec_123' });
   * if (status.status === 'completed') {
   *   console.log(status.stdout);
   * }
   * ```
   */
  async getExecutionStatus(
    request: GetExecutionStatusRequest
  ): Promise<GetExecutionStatusResponse> {
    return this.request<GetExecutionStatusResponse>(`/v1/executions/${request.id}`, {
      method: 'GET',
    });
  }

  /**
   * List artifacts produced by a code execution
   * Artifacts are files created during execution that persist after completion
   *
   * @param request - Request with execution ID
   * @returns List of artifacts with download URLs
   *
   * @example
   * ```typescript
   * const artifacts = await client.listArtifacts({ id: 'exec_123' });
   * artifacts.artifacts.forEach(artifact => {
   *   console.log(`${artifact.name}: ${artifact.url}`);
   * });
   * ```
   */
  async listArtifacts(request: ListArtifactsRequest): Promise<ListArtifactsResponse> {
    return this.request<ListArtifactsResponse>(
      `/v1/executions/${request.id}/artifacts`,
      {
        method: 'GET',
      }
    );
  }

  /**
   * Cancel a running execution
   *
   * @param id - Execution ID to cancel
   * @returns Execution status after cancellation
   *
   * @example
   * ```typescript
   * const result = await client.cancelExecution('exec_123');
   * console.log(result.status); // 'cancelled'
   * ```
   */
  async cancelExecution(id: string): Promise<GetExecutionStatusResponse> {
    return this.request<GetExecutionStatusResponse>(`/v1/executions/${id}/cancel`, {
      method: 'POST',
    });
  }

  /**
   * Health check - verify API is reachable
   *
   * @returns True if API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.request<{ status: string }>('/health', {
        method: 'GET',
      });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a new Unsandbox client instance
 *
 * @param config - Client configuration
 * @returns Configured Unsandbox client
 *
 * @example
 * ```typescript
 * const client = createUnsandboxClient({
 *   apiKey: process.env.UNSANDBOX_API_KEY!,
 * });
 *
 * const result = await client.executeCode({
 *   language: 'python',
 *   code: 'print(2 + 2)',
 * });
 * ```
 */
export function createUnsandboxClient(config: UnsandboxConfig): UnsandboxClient {
  return new UnsandboxClient(config);
}
