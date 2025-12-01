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
 * Response from POST /keys/am-i-throttled endpoint
 * Fast throttle check that returns last 60s requests and active executions
 * No expensive usage calculations
 */
export interface AmIThrottledResponse {
  /** Number of requests in the last 60 seconds */
  requests_last_60s?: number;
  /** Number of currently active executions */
  active_executions?: number;
  /** Whether the key is currently throttled */
  throttled?: boolean;
  /** Additional metadata from the API */
  [key: string]: any;
}

/**
 * Response from POST /keys/stats endpoint
 * Returns detailed usage statistics for analytics dashboards
 */
export interface KeyStatsResponse {
  /** Total number of requests made with this key */
  total_requests?: number;
  /** Total execution time in milliseconds */
  total_execution_time_ms?: number;
  /** Usage statistics and quotas */
  [key: string]: any;
}

/**
 * Response from POST /keys/validate endpoint
 * Validates API key and returns configuration
 * Responses are cacheable for hours
 */
export interface ValidateKeyResponse {
  /** Whether the API key is valid */
  valid: boolean;
  /** Key configuration and permissions */
  config?: {
    /** Maximum execution time in seconds */
    max_ttl?: number;
    /** Rate limit information */
    rate_limit?: {
      /** Requests per time window */
      requests_per_window?: number;
      /** Time window in seconds */
      window_seconds?: number;
    };
    /** Additional configuration fields */
    [key: string]: any;
  };
  /** Additional metadata from the API */
  [key: string]: any;
}
