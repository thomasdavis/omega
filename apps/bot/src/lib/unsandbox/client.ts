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
  JobStatusResponse,
  GetExecutionStatusRequest,
  GetExecutionStatusResponse,
  ListArtifactsRequest,
  ListArtifactsResponse,
  UnsandboxError,
  LanguagesResponse,
  ValidateResponse,
  ThrottleStatusResponse,
  StatsResponse,
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
    // Use API key from config, environment variable, or default to empty string
    this.apiKey = config.apiKey || process.env.UNSANDBOX_API_KEY || '';
    this.baseUrl = config.baseUrl || 'https://api.unsandbox.com';
    this.timeout = config.timeout || 30000; // Default: 30000ms timeout for HTTP requests
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
   * Execute code in a sandboxed environment (async workflow)
   *
   * This method:
   * 1. Submits code for execution and receives a job ID
   * 2. Polls the job status until completion
   * 3. Returns the final result with stdout, stderr, exit code, and artifacts
   *
   * @param request - Code execution request
   * @returns Execution result with stdout, stderr, exit code, and artifacts
   *
   * @example
   * ```typescript
   * const result = await client.executeCode({
   *   language: 'python',
   *   code: 'print("Hello, World!")',
   *   ttl: 5
   * });
   * console.log(result.result?.stdout); // "Hello, World!\n"
   * console.log(result.result?.exit_code); // 0
   * console.log(result.result?.success); // true
   * ```
   */
  async executeCode(request: ExecuteCodeRequest): Promise<JobStatusResponse> {
    const timestamp = new Date().toISOString();
    console.log(`\n🔧 [${timestamp}] Executing Code via Unsandbox (Async Workflow)`);
    console.log(`   Language: ${request.language}`);
    console.log(`   Code Length: ${request.code.length} characters`);
    console.log(`   Code Preview: ${request.code.substring(0, 100)}${request.code.length > 100 ? '...' : ''}`);
    console.log(`   TTL: ${request.ttl || 5} seconds`);
    console.log(`   Environment Variables: ${request.env ? Object.keys(request.env).join(', ') : 'none'}`);
    console.log(`   Stdin Provided: ${request.stdin ? 'yes' : 'no'}`);

    // Step 1: Submit execution and get job ID
    console.log(`\n📤 [${new Date().toISOString()}] Submitting code for execution...`);
    const requestBody: any = {
      language: request.language,
      code: request.code,
      ttl: request.ttl || 5,
      env: request.env,
      stdin: request.stdin,
      args: request.args,
    };

    // Include network mode if specified
    if (request.network) {
      requestBody.network = request.network;
    }

    let executeResponse: ExecuteCodeResponse;
    try {
      executeResponse = await this.request<ExecuteCodeResponse>('/execute/async', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      // Enhanced error handling: check for throttling on 429 errors
      if (error instanceof UnsandboxApiError && error.status === 429) {
        console.log(`\n⚠️ [${new Date().toISOString()}] Rate limit detected, checking throttle status...`);
        try {
          const throttleStatus = await this.checkThrottleStatus();
          if (throttleStatus.throttled) {
            throw new UnsandboxApiError(
              429,
              'RATE_LIMITED',
              `API key is throttled: ${throttleStatus.reason || 'Rate limit exceeded'}. ${
                throttleStatus.retry_after ? `Retry after: ${throttleStatus.retry_after}` : ''
              }`,
              { throttleStatus }
            );
          }
        } catch (throttleError) {
          // If throttle check fails, rethrow original error
          if (!(throttleError instanceof UnsandboxApiError && throttleError.code === 'RATE_LIMITED')) {
            console.log(`   ⚠️ Throttle status check failed, using original error`);
          } else {
            throw throttleError;
          }
        }
      }
      throw error;
    }

    console.log(`\n✅ [${new Date().toISOString()}] Job submitted successfully`);
    console.log(`   Job ID: ${executeResponse.job_id}`);
    console.log(`   Initial Status: ${executeResponse.status}`);

    // Step 2: Poll for job completion
    console.log(`\n🔄 [${new Date().toISOString()}] Polling for job completion...`);
    const result = await this.pollJobStatus(executeResponse.job_id);

    console.log(`\n✅ [${new Date().toISOString()}] Code Execution Completed`);
    console.log(`   Job ID: ${result.job_id}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Exit Code: ${result.exit_code ?? 'N/A'}`);
    console.log(`   Success: ${result.success ?? 'N/A'}`);
    console.log(`   Execution Time: ${result.total_time_ms ?? result.executionTime ?? 'N/A'}ms`);
    console.log(`   Stdout Length: ${result.stdout?.length ?? 0} characters`);
    console.log(`   Stderr Length: ${result.stderr?.length ?? 0} characters`);
    console.log(`   Artifacts: ${result.artifacts?.length ?? 0}`);
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
   * Poll job status until completion
   *
   * @param jobId - The job ID to poll
   * @param maxAttempts - Maximum number of polling attempts (default: 60)
   * @param pollInterval - Interval between polls in milliseconds (default: 1000)
   * @returns Final job status with results
   */
  private async pollJobStatus(
    jobId: string,
    maxAttempts: number = 60,
    pollInterval: number = 1000
  ): Promise<JobStatusResponse> {
    console.log(`\n🔍 [${new Date().toISOString()}] Starting job status polling`);
    console.log(`   Job ID: ${jobId}`);
    console.log(`   Max Attempts: ${maxAttempts}`);
    console.log(`   Poll Interval: ${pollInterval}ms`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`\n📊 [${new Date().toISOString()}] Polling attempt ${attempt}/${maxAttempts}`);

      const status = await this.getJobStatus(jobId);

      console.log(`   Status: ${status.status}`);

      // Check if job is in a terminal state
      if (status.status === 'completed' ||
          status.status === 'failed' ||
          status.status === 'timeout' ||
          status.status === 'cancelled') {
        console.log(`\n✅ [${new Date().toISOString()}] Job reached terminal state: ${status.status}`);
        return status;
      }

      // Wait before next poll (unless it's the last attempt)
      if (attempt < maxAttempts) {
        console.log(`   ⏳ Waiting ${pollInterval}ms before next poll...`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    // Max attempts reached without completion
    console.log(`\n⏱️ [${new Date().toISOString()}] Max polling attempts reached`);
    throw new UnsandboxApiError(
      408,
      'POLLING_TIMEOUT',
      `Job did not complete within ${maxAttempts} polling attempts`,
      { jobId }
    );
  }

  /**
   * Get the current status of a job
   *
   * @param jobId - The job ID
   * @returns Current job status
   * @throws UnsandboxApiError with status 404 if job not found (already completed or never existed)
   */
  private async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    try {
      return await this.request<JobStatusResponse>(`/jobs/${jobId}`, {
        method: 'GET',
      });
    } catch (error) {
      // Handle 404 errors for completed/expired jobs
      if (error instanceof UnsandboxApiError && error.status === 404) {
        console.log(`   ⚠️ Job not found (already completed or never existed)`);
        throw error;
      }
      throw error;
    }
  }

  /**
   * Get the status of a code execution (public method)
   * Useful for long-running executions to poll for completion
   *
   * @param request - Status request with job ID
   * @returns Current execution status and results (if completed)
   *
   * @example
   * ```typescript
   * const status = await client.getExecutionStatus({ job_id: 'job_123' });
   * if (status.status === 'completed') {
   *   console.log(status.stdout);
   *   console.log(status.success);
   * }
   * ```
   */
  async getExecutionStatus(
    request: GetExecutionStatusRequest
  ): Promise<GetExecutionStatusResponse> {
    console.log(`\n🔍 [${new Date().toISOString()}] Getting Execution Status`);
    console.log(`   Job ID: ${request.job_id}`);

    const result = await this.getJobStatus(request.job_id);

    console.log(`\n📊 [${new Date().toISOString()}] Execution Status Retrieved`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Success: ${result.success ?? 'N/A'}`);
    console.log(`   Exit Code: ${result.exit_code ?? 'N/A'}`);
    console.log(`   Execution Time: ${result.total_time_ms ?? result.executionTime ?? 'N/A'}ms`);
    console.log(`   Started At: ${result.started_at ?? result.startedAt ?? 'N/A'}`);
    console.log(`   Completed At: ${result.completed_at ?? result.completedAt ?? 'N/A'}`);

    return result;
  }

  /**
   * List artifacts produced by a code execution
   * Note: In the async workflow, artifacts are included in the job status response
   * This method is kept for backward compatibility
   *
   * @param request - Request with job ID
   * @returns List of artifacts with download URLs
   *
   * @example
   * ```typescript
   * const artifacts = await client.listArtifacts({ id: 'job_123' });
   * artifacts.artifacts.forEach(artifact => {
   *   console.log(`${artifact.name}: ${artifact.url}`);
   * });
   * ```
   */
  async listArtifacts(request: ListArtifactsRequest): Promise<ListArtifactsResponse> {
    console.log(`\n📦 [${new Date().toISOString()}] Listing Artifacts`);
    console.log(`   Job ID: ${request.id}`);

    // Get job status which includes artifacts
    const status = await this.getJobStatus(request.id);

    console.log(`\n📋 [${new Date().toISOString()}] Artifacts Retrieved`);
    const artifacts = status.artifacts || [];
    console.log(`   Artifact Count: ${artifacts.length}`);
    if (artifacts.length > 0) {
      console.log(`   Artifacts:`);
      artifacts.forEach((artifact, index) => {
        console.log(`      ${index + 1}. ${artifact.name} (${artifact.size} bytes, ${artifact.mimeType})`);
      });
    }

    return { artifacts };
  }

  /**
   * Cancel a running execution
   *
   * @param id - Job ID to cancel
   * @returns Execution status after cancellation
   *
   * @example
   * ```typescript
   * const result = await client.cancelExecution('job_123');
   * console.log(result.status); // 'cancelled'
   * ```
   */
  async cancelExecution(id: string): Promise<GetExecutionStatusResponse> {
    console.log(`\n🛑 [${new Date().toISOString()}] Cancelling Execution`);
    console.log(`   Job ID: ${id}`);

    const result = await this.request<GetExecutionStatusResponse>(`/jobs/${id}/cancel`, {
      method: 'POST',
    });

    console.log(`\n✋ [${new Date().toISOString()}] Execution Cancelled`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Job ID: ${result.job_id}`);

    return result;
  }

  /**
   * Get list of supported programming languages
   * Fetches the definitive list of execution languages from the Unsandbox API
   *
   * @returns List of supported languages with their identifiers
   *
   * @example
   * ```typescript
   * const languages = await client.getLanguages();
   * console.log(`Supported languages: ${languages.map(l => l.id).join(', ')}`);
   * // Output: python, javascript, typescript, ruby, go, rust, ...
   * ```
   */
  async getLanguages(): Promise<LanguagesResponse> {
    console.log(`\n🌐 [${new Date().toISOString()}] Fetching Supported Languages`);
    console.log(`   Querying /languages endpoint...`);

    const languages = await this.request<LanguagesResponse>('/languages', {
      method: 'GET',
    });

    console.log(`\n📋 [${new Date().toISOString()}] Languages Retrieved`);
    console.log(`   Total Languages: ${languages.length}`);
    console.log(`   Languages: ${languages.map(l => l.id || l).join(', ')}`);

    return languages;
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

  /**
   * Validate API key
   * Checks if the current API key is valid and returns account information
   *
   * @returns Validation result with account details
   * @throws UnsandboxApiError if API key is invalid or request fails
   *
   * @example
   * ```typescript
   * try {
   *   const result = await client.validate();
   *   if (result.valid) {
   *     console.log(`API key is valid for ${result.email}`);
   *     console.log(`Account tier: ${result.tier}`);
   *   }
   * } catch (error) {
   *   console.error('API key validation failed:', error.message);
   * }
   * ```
   */
  async validate(): Promise<ValidateResponse> {
    console.log(`\n🔑 [${new Date().toISOString()}] Validating API Key`);
    console.log(`   Checking API key validity...`);

    try {
      const result = await this.request<ValidateResponse>('/validate', {
        method: 'GET',
      });

      console.log(`\n✅ [${new Date().toISOString()}] API Key Validation Complete`);
      console.log(`   Valid: ${result.valid}`);
      if (result.valid) {
        console.log(`   Email: ${result.email || 'N/A'}`);
        console.log(`   Tier: ${result.tier || 'N/A'}`);
      }

      return result;
    } catch (error) {
      console.log(`\n❌ [${new Date().toISOString()}] API Key Validation Failed`);
      if (error instanceof UnsandboxApiError) {
        console.log(`   Status: ${error.status}`);
        console.log(`   Message: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check throttle status
   * Determines if the current API key is being rate-limited
   *
   * @returns Throttle status with rate limit information
   * @throws UnsandboxApiError if request fails
   *
   * @example
   * ```typescript
   * const status = await client.checkThrottleStatus();
   * if (status.throttled) {
   *   console.log(`Throttled: ${status.reason}`);
   *   console.log(`Retry after: ${status.retry_after}`);
   *   if (status.rate_limit) {
   *     console.log(`Rate limit: ${status.rate_limit.remaining}/${status.rate_limit.limit}`);
   *   }
   * } else {
   *   console.log('Not throttled - safe to proceed');
   * }
   * ```
   */
  async checkThrottleStatus(): Promise<ThrottleStatusResponse> {
    console.log(`\n🚦 [${new Date().toISOString()}] Checking Throttle Status`);
    console.log(`   Querying /im-i-throttled endpoint...`);

    try {
      const result = await this.request<ThrottleStatusResponse>('/im-i-throttled', {
        method: 'GET',
      });

      console.log(`\n📊 [${new Date().toISOString()}] Throttle Status Retrieved`);
      console.log(`   Throttled: ${result.throttled}`);
      if (result.throttled) {
        console.log(`   Reason: ${result.reason || 'N/A'}`);
        console.log(`   Retry After: ${result.retry_after || 'N/A'}`);
      }
      if (result.rate_limit) {
        console.log(`   Rate Limit: ${result.rate_limit.remaining || 'N/A'}/${result.rate_limit.limit || 'N/A'}`);
        console.log(`   Resets: ${result.rate_limit.reset || 'N/A'}`);
      }

      return result;
    } catch (error) {
      console.log(`\n❌ [${new Date().toISOString()}] Throttle Status Check Failed`);
      if (error instanceof UnsandboxApiError) {
        console.log(`   Status: ${error.status}`);
        console.log(`   Message: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get API usage statistics
   * Retrieves detailed usage statistics for the account
   *
   * @returns Usage statistics including execution counts, timing, and limits
   * @throws UnsandboxApiError if request fails
   *
   * @example
   * ```typescript
   * const stats = await client.getStats();
   * console.log(`Total executions: ${stats.total_executions}`);
   * console.log(`Period executions: ${stats.period_executions}`);
   * if (stats.by_language) {
   *   console.log('Executions by language:', stats.by_language);
   * }
   * if (stats.limits) {
   *   const usage = (stats.period_executions || 0) / (stats.limits.max_executions || 1) * 100;
   *   console.log(`Usage: ${usage.toFixed(1)}% of limit`);
   * }
   * ```
   */
  async getStats(): Promise<StatsResponse> {
    console.log(`\n📈 [${new Date().toISOString()}] Fetching API Statistics`);
    console.log(`   Querying /stats endpoint...`);

    try {
      const result = await this.request<StatsResponse>('/stats', {
        method: 'GET',
      });

      console.log(`\n📊 [${new Date().toISOString()}] Statistics Retrieved`);
      console.log(`   Total Executions: ${result.total_executions || 'N/A'}`);
      console.log(`   Period Executions: ${result.period_executions || 'N/A'}`);
      console.log(`   Total Execution Time: ${result.total_execution_time_ms || 'N/A'}ms`);

      if (result.by_language) {
        console.log(`   Top Languages: ${Object.entries(result.by_language)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([lang, count]) => `${lang}(${count})`)
          .join(', ')}`);
      }

      if (result.by_status) {
        console.log(`   By Status:`);
        console.log(`      Completed: ${result.by_status.completed || 0}`);
        console.log(`      Failed: ${result.by_status.failed || 0}`);
        console.log(`      Timeout: ${result.by_status.timeout || 0}`);
        console.log(`      Cancelled: ${result.by_status.cancelled || 0}`);
      }

      if (result.limits) {
        console.log(`   Limits:`);
        console.log(`      Max Executions: ${result.limits.max_executions || 'N/A'}`);
        console.log(`      Max Execution Time: ${result.limits.max_execution_time_ms || 'N/A'}ms`);
        if (result.period_executions !== undefined && result.limits.max_executions) {
          const usage = (result.period_executions / result.limits.max_executions * 100).toFixed(1);
          console.log(`      Current Usage: ${usage}%`);
        }
      }

      if (result.period_start || result.period_end) {
        console.log(`   Billing Period: ${result.period_start || 'N/A'} to ${result.period_end || 'N/A'}`);
      }

      return result;
    } catch (error) {
      console.log(`\n❌ [${new Date().toISOString()}] Statistics Retrieval Failed`);
      if (error instanceof UnsandboxApiError) {
        console.log(`   Status: ${error.status}`);
        console.log(`   Message: ${error.message}`);
      }
      throw error;
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
