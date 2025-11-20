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
    this.timeout = config.timeout || 30000; // Default: 30000ms (TTS - Thirty Thousand milliseconds)
  }

  /**
   * Make an authenticated request to the Unsandbox API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const requestStartTime = Date.now();
    const timestamp = new Date().toISOString();

    // Log request details
    console.log(`\n🌐 [${timestamp}] Unsandbox API Request`);
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
      const requestDuration = Date.now() - requestStartTime;

      // Log response details
      console.log(`\n📥 [${new Date().toISOString()}] Unsandbox API Response`);
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

        console.log(`\n❌ [${new Date().toISOString()}] Unsandbox API Error Response`);
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
        console.log(`      - Error Code: ${errorData.code || 'N/A'}`);
        console.log(`      - Message: ${errorData.message || errorText}`);

        throw new UnsandboxApiError(
          response.status,
          errorData.code,
          errorData.message || `API request failed with status ${response.status}`,
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
        console.log(`   Response Data:`, JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.log(`   ❌ Failed to parse response as JSON:`, parseError);
        throw new UnsandboxApiError(
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

      console.log(`\n💥 [${new Date().toISOString()}] Unsandbox API Request Failed`);
      console.log(`   Duration: ${requestDuration}ms`);
      console.log(`   URL: ${url}`);
      console.log(`   Method: ${options.method || 'GET'}`);

      // Re-throw UnsandboxApiError as-is
      if (error instanceof UnsandboxApiError) {
        console.log(`   Error Type: UnsandboxApiError`);
        console.log(`   Status: ${error.status}`);
        console.log(`   Code: ${error.code}`);
        console.log(`   Message: ${error.message}`);
        console.log(`   Details:`, JSON.stringify(error.details, null, 2));
        throw error;
      }

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`   ⏱️ Error Type: Timeout`);
        console.log(`   Timeout Duration: ${this.timeout}ms`);
        console.log(`   Actual Duration: ${requestDuration}ms`);
        throw new UnsandboxApiError(
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
        console.log(`   Stack Trace:`, error.stack);
        throw new UnsandboxApiError(
          0,
          'NETWORK_ERROR',
          `Network error: ${error.message}`,
          { originalError: error }
        );
      }

      // Unknown error
      console.log(`   ❓ Error Type: Unknown`);
      console.log(`   Error:`, error);
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
    const timestamp = new Date().toISOString();
    console.log(`\n🔧 [${timestamp}] Executing Code via Unsandbox`);
    console.log(`   Language: ${request.language}`);
    console.log(`   Code Length: ${request.code.length} characters`);
    console.log(`   Code Preview: ${request.code.substring(0, 100)}${request.code.length > 100 ? '...' : ''}`);
    console.log(`   Timeout: ${request.timeout || 5000}ms`);
    console.log(`   Environment Variables: ${request.env ? Object.keys(request.env).join(', ') : 'none'}`);
    console.log(`   Stdin Provided: ${request.stdin ? 'yes' : 'no'}`);

    const result = await this.request<ExecuteCodeResponse>('/v1/execute', {
      method: 'POST',
      body: JSON.stringify({
        language: request.language,
        code: request.code,
        timeout: request.timeout || 5000,
        env: request.env,
        stdin: request.stdin,
      }),
    });

    console.log(`\n✅ [${new Date().toISOString()}] Code Execution Completed`);
    console.log(`   Execution ID: ${result.id}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Exit Code: ${result.exitCode ?? 'N/A'}`);
    console.log(`   Execution Time: ${result.executionTime ?? 'N/A'}ms`);
    console.log(`   Stdout Length: ${result.stdout?.length ?? 0} characters`);
    console.log(`   Stderr Length: ${result.stderr?.length ?? 0} characters`);
    if (result.stdout) {
      console.log(`   Stdout Preview: ${result.stdout.substring(0, 200)}${result.stdout.length > 200 ? '...' : ''}`);
    }
    if (result.stderr) {
      console.log(`   Stderr: ${result.stderr}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    return result;
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
    console.log(`\n🔍 [${new Date().toISOString()}] Getting Execution Status`);
    console.log(`   Execution ID: ${request.id}`);

    const result = await this.request<GetExecutionStatusResponse>(`/v1/executions/${request.id}`, {
      method: 'GET',
    });

    console.log(`\n📊 [${new Date().toISOString()}] Execution Status Retrieved`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Exit Code: ${result.exitCode ?? 'N/A'}`);
    console.log(`   Execution Time: ${result.executionTime ?? 'N/A'}ms`);
    console.log(`   Started At: ${result.startedAt ?? 'N/A'}`);
    console.log(`   Completed At: ${result.completedAt ?? 'N/A'}`);

    return result;
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
    console.log(`\n📦 [${new Date().toISOString()}] Listing Artifacts`);
    console.log(`   Execution ID: ${request.id}`);

    const result = await this.request<ListArtifactsResponse>(
      `/v1/executions/${request.id}/artifacts`,
      {
        method: 'GET',
      }
    );

    console.log(`\n📋 [${new Date().toISOString()}] Artifacts Retrieved`);
    console.log(`   Artifact Count: ${result.artifacts.length}`);
    if (result.artifacts.length > 0) {
      console.log(`   Artifacts:`);
      result.artifacts.forEach((artifact, index) => {
        console.log(`      ${index + 1}. ${artifact.name} (${artifact.size} bytes, ${artifact.mimeType})`);
      });
    }

    return result;
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
    console.log(`\n🛑 [${new Date().toISOString()}] Cancelling Execution`);
    console.log(`   Execution ID: ${id}`);

    const result = await this.request<GetExecutionStatusResponse>(`/v1/executions/${id}/cancel`, {
      method: 'POST',
    });

    console.log(`\n✋ [${new Date().toISOString()}] Execution Cancelled`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Execution ID: ${result.id}`);

    return result;
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
      await this.request<{ status: string }>('/health', {
        method: 'GET',
      });
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
