/**
 * Type definitions for Unsandbox API
 * Based on the OpenAPI specification at https://api.unsandbox.com/openapi
 */

/**
 * Supported programming languages
 * These are the runtime identifiers used by the Unsandbox API
 */
export type UnsandboxLanguage =
  | 'node' // JavaScript (Node.js)
  | 'python'
  | 'typescript'
  | 'ruby'
  | 'go'
  | 'rust'
  | 'java'
  | 'cpp'
  | 'c'
  | 'php'
  | 'bash';

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
  /** Time to live (TTL) in seconds for the execution (default: 5, max: 30) */
  ttl?: number;
  /** Environment variables for the execution */
  env?: Record<string, string>;
  /** Standard input to provide to the program */
  stdin?: string;
}

/**
 * Response from initiating code execution (async workflow)
 * Returns immediately with a job ID
 */
export interface ExecuteCodeResponse {
  /** Unique job identifier for polling status */
  jobId: string;
  /** Initial status (typically 'pending' or 'running') */
  status: ExecutionStatus;
}

/**
 * Response from polling job status
 */
export interface JobStatusResponse {
  /** Unique identifier for this execution */
  jobId: string;
  /** Current status of the execution */
  status: ExecutionStatus;
  /** Standard output from the execution */
  stdout?: string;
  /** Standard error from the execution */
  stderr?: string;
  /** Exit code (0 for success, non-zero for errors) */
  exitCode?: number;
  /** Execution time in milliseconds */
  executionTime?: number;
  /** Error message if execution failed */
  error?: string;
  /** Timestamp when execution started */
  startedAt?: string;
  /** Timestamp when execution completed */
  completedAt?: string;
  /** Artifacts produced by the execution */
  artifacts?: Artifact[];
}

/**
 * Request to check execution status
 */
export interface GetExecutionStatusRequest {
  /** The job ID to check */
  jobId: string;
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
