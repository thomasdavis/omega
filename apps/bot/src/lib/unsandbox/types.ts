/**
 * Type definitions for Unsandbox API
 * Based on the OpenAPI specification at https://api.unsandbox.com/openapi
 */

/**
 * Programming language identifier
 * Accepts any string - the upstream Unsandbox API will validate and report errors for unsupported languages
 * Common languages: 'node', 'python', 'typescript', 'ruby', 'go', 'rust', 'java', 'cpp', 'c', 'php', 'bash'
 */
export type UnsandboxLanguage = string;

/**
 * Execution status states
 */
export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'timeout'
  | 'cancelled';

/**
 * Request to execute code (async workflow)
 */
export interface ExecuteCodeRequest {
  /** The runtime/language to use */
  language: UnsandboxLanguage;
  /** The code to execute */
  code: string;
  /** Time to live (TTL) in seconds for the execution (default: 5, max: 300) */
  ttl?: number;
  /** Environment variables for the execution */
  env?: Record<string, string>;
  /** Standard input to provide to the program */
  stdin?: string;
  /** Command-line arguments to pass to the program (e.g., sys.argv in Python) */
  args?: string[];
  /** Network mode: 'semitrust' (network access enabled) or 'zerotrust' (no network access) */
  network?: 'semitrust' | 'zerotrust';
}

/**
 * Response from initiating code execution (async workflow)
 * Returns immediately with a job ID
 */
export interface ExecuteCodeResponse {
  /** Unique job identifier for polling status */
  job_id: string;
  /** Initial status (typically 'pending' or 'running') */
  status: ExecutionStatus;
}

/**
 * Response from polling job status
 * All fields are at root level, matching the actual Unsandbox API response structure
 */
export interface JobStatusResponse {
  // Job metadata
  /** Unique identifier for this execution */
  job_id: string;
  /** Current status of the execution */
  status: ExecutionStatus;

  // Execution results (all at root level, matching actual API response)
  /** Whether the execution was successful */
  success?: boolean;
  /** Standard output from the execution */
  stdout?: string;
  /** Standard error from the execution */
  stderr?: string;
  /** Error message if execution failed */
  error?: string | null;
  /** Language used for execution */
  language?: string;
  /** Exit code (0 for success, non-zero for errors) */
  exit_code?: number;

  // Timing information
  /** Total execution time in milliseconds (API field) */
  total_time_ms?: number;
  /** Execution time in milliseconds (kept for backwards compatibility) */
  executionTime?: number;
  /** Timestamp when job was created */
  created_at?: string;
  /** Timestamp when execution started */
  started_at?: string;
  /** Timestamp when execution completed */
  completed_at?: string;
  /** Legacy field (use started_at instead) */
  startedAt?: string;
  /** Legacy field (use completed_at instead) */
  completedAt?: string;

  // Additional metadata
  /** Execution mode (e.g., 'pooled') */
  execution_mode?: string;
  /** Network mode (e.g., 'zerotrust') */
  network_mode?: string;
  /** Timeout in milliseconds */
  timeout?: number;

  // Artifacts
  /** Artifacts produced by the execution */
  artifacts?: Artifact[];
}

/**
 * Request to check execution status
 */
export interface GetExecutionStatusRequest {
  /** The job ID to check */
  job_id: string;
}

/**
 * Response when fetching execution status (alias for JobStatusResponse)
 */
export type GetExecutionStatusResponse = JobStatusResponse;

/**
 * Artifact information
 */
export interface Artifact {
  /** Name of the artifact file */
  name: string;
  /** Size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** URL to download the artifact */
  url: string;
}

/**
 * Request to list artifacts
 */
export interface ListArtifactsRequest {
  /** The execution ID */
  id: string;
}

/**
 * Response when listing artifacts
 */
export interface ListArtifactsResponse {
  /** List of artifacts produced by the execution */
  artifacts: Artifact[];
}

/**
 * Error response from API
 */
export interface UnsandboxError {
  /** Error message */
  message: string;
  /** HTTP status code */
  status: number;
  /** Error code (if available) */
  code?: string;
  /** Additional error details */
  details?: any;
}

/**
 * Configuration for Unsandbox client
 */
export interface UnsandboxConfig {
  /** API key for authentication (hardcoded to "open-says-me" as of issue #149) */
  apiKey?: string;
  /** Base URL for the API (default: https://api.unsandbox.com) */
  baseUrl?: string;
  /** Default timeout for requests in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Language information from /languages endpoint
 */
export interface LanguageInfo {
  /** Language identifier used in API calls */
  id: string;
  /** Display name for the language */
  name: string;
  /** Additional metadata if provided */
  [key: string]: any;
}

/**
 * Response from /languages endpoint
 */
export type LanguagesResponse = LanguageInfo[];

/**
 * Response from /validate endpoint
 * Validates if the API key is valid and returns account information
 */
export interface ValidateResponse {
  /** Whether the API key is valid */
  valid: boolean;
  /** Account email (if valid) */
  email?: string;
  /** Account tier/plan (if valid) */
  tier?: string;
  /** Additional account metadata */
  [key: string]: any;
}

/**
 * Response from /im-i-throttled endpoint
 * Checks if the current API key is being rate-limited
 */
export interface ThrottleStatusResponse {
  /** Whether the API key is currently throttled */
  throttled: boolean;
  /** Reason for throttling (if throttled) */
  reason?: string;
  /** Retry after timestamp or duration (if throttled) */
  retry_after?: string | number;
  /** Rate limit information */
  rate_limit?: {
    /** Maximum requests allowed in the window */
    limit?: number;
    /** Remaining requests in current window */
    remaining?: number;
    /** When the rate limit window resets */
    reset?: string | number;
  };
  /** Additional throttle metadata */
  [key: string]: any;
}

/**
 * Response from /stats endpoint
 * Returns API usage statistics for the account
 */
export interface StatsResponse {
  /** Total number of executions */
  total_executions?: number;
  /** Executions in current billing period */
  period_executions?: number;
  /** Total execution time in milliseconds */
  total_execution_time_ms?: number;
  /** Executions by language */
  by_language?: Record<string, number>;
  /** Executions by status */
  by_status?: {
    completed?: number;
    failed?: number;
    timeout?: number;
    cancelled?: number;
  };
  /** Current billing period start */
  period_start?: string;
  /** Current billing period end */
  period_end?: string;
  /** Account usage limits */
  limits?: {
    /** Maximum executions per period */
    max_executions?: number;
    /** Maximum execution time per period */
    max_execution_time_ms?: number;
  };
  /** Additional statistics metadata */
  [key: string]: any;
}
