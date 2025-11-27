/**
 * Mock Unsandbox API Server for Testing
 * Provides deterministic state transitions for testing polling logic
 */

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';

export interface MockJobState {
  job_id: string;
  status: JobStatus;
  result?: {
    success: boolean;
    stdout: string;
    stderr: string;
    error: string | null;
    language: string;
    exit_code: number;
  };
  artifacts?: Array<{
    name: string;
    size: number;
    mimeType: string;
    url: string;
  }>;
  executionTime?: number;
  startedAt?: string;
  completedAt?: string;
  created_at?: string;
}

export interface MockJobSequence {
  job_id: string;
  sequence: MockJobState[];
  currentIndex: number;
}

/**
 * Mock Unsandbox API that simulates state transitions
 */
export class MockUnsandboxApi {
  private jobs: Map<string, MockJobSequence> = new Map();
  private submitCount: number = 0;
  private statusCheckCount: Map<string, number> = new Map();

  /**
   * Register a job with a sequence of states
   */
  registerJobSequence(job_id: string, states: MockJobState[]): void {
    this.jobs.set(job_id, {
      job_id,
      sequence: states,
      currentIndex: 0,
    });
  }

  /**
   * Submit a job for execution (returns first state)
   */
  async submit(language: string, _code: string, _ttl: number, _env?: Record<string, string>, _stdin?: string): Promise<MockJobState> {
    this.submitCount++;
    const job_id = `job_mock_${this.submitCount}`;

    // Default sequence: pending -> running -> completed
    const defaultSequence: MockJobState[] = [
      {
        job_id,
        status: 'pending',
        created_at: new Date().toISOString(),
      },
      {
        job_id,
        status: 'running',
        startedAt: new Date().toISOString(),
      },
      {
        job_id,
        status: 'completed',
        result: {
          success: true,
          stdout: 'Mock output\n',
          stderr: '',
          error: null,
          language,
          exit_code: 0,
        },
        startedAt: new Date(Date.now() - 1000).toISOString(),
        completedAt: new Date().toISOString(),
        executionTime: 100,
      },
    ];

    this.registerJobSequence(job_id, defaultSequence);
    return defaultSequence[0];
  }

  /**
   * Get job status (advances through sequence)
   */
  async getStatus(job_id: string): Promise<MockJobState> {
    const job = this.jobs.get(job_id);
    if (!job) {
      throw new Error(`Job not found: ${job_id}`);
    }

    // Track how many times this job has been checked
    const checkCount = (this.statusCheckCount.get(job_id) || 0) + 1;
    this.statusCheckCount.set(job_id, checkCount);

    // Return current state
    const state = job.sequence[job.currentIndex];

    // Advance to next state if not at end
    if (job.currentIndex < job.sequence.length - 1) {
      job.currentIndex++;
    }

    return state;
  }

  /**
   * Reset all mock state
   */
  reset(): void {
    this.jobs.clear();
    this.statusCheckCount.clear();
    this.submitCount = 0;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      submitCount: this.submitCount,
      jobCount: this.jobs.size,
      statusChecks: Object.fromEntries(this.statusCheckCount),
    };
  }
}

/**
 * Create mock fetch responses for testing
 */
export function createMockFetchResponse(data: unknown, status: number = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Map([['content-type', 'application/json']]) as unknown as Headers,
    text: async () => JSON.stringify(data),
    json: async () => data,
  } as Response;
}

/**
 * Sequence builders for common scenarios
 */
export const SequenceBuilders = {
  /**
   * Normal success: pending -> running -> completed
   */
  success(job_id: string, stdout: string = 'Success\n', language: string = 'node'): MockJobState[] {
    return [
      { job_id, status: 'pending', created_at: new Date().toISOString() },
      { job_id, status: 'running', startedAt: new Date().toISOString() },
      {
        job_id,
        status: 'completed',
        result: {
          success: true,
          stdout,
          stderr: '',
          error: null,
          language,
          exit_code: 0,
        },
        executionTime: 150,
        completedAt: new Date().toISOString(),
      },
    ];
  },

  /**
   * Completed with errors: pending -> completed (success=false, empty stdout)
   */
  completedWithErrors(job_id: string, error: string = 'Unknown error'): MockJobState[] {
    return [
      { job_id, status: 'pending' },
      {
        job_id,
        status: 'completed',
        result: {
          success: false,
          stdout: '',
          stderr: '',
          error,
          language: 'node',
          exit_code: 1,
        },
      },
    ];
  },

  /**
   * Timeout: pending -> running -> timeout
   */
  timeout(job_id: string): MockJobState[] {
    return [
      { job_id, status: 'pending' },
      { job_id, status: 'running' },
      {
        job_id,
        status: 'timeout',
        result: {
          success: false,
          stdout: '',
          stderr: 'Execution timed out',
          error: 'Timeout exceeded',
          language: 'node',
          exit_code: 124,
        },
      },
    ];
  },

  /**
   * Never completes: always returns pending/running
   */
  neverCompletes(job_id: string, states: number = 100): MockJobState[] {
    return Array(states).fill({ job_id, status: 'pending' });
  },

  /**
   * With artifacts: completed with file outputs
   */
  withArtifacts(job_id: string, artifacts: Array<{ name: string; size: number; mimeType: string; url: string }>, stdout: string = ''): MockJobState[] {
    return [
      { job_id, status: 'pending' },
      {
        job_id,
        status: 'completed',
        result: {
          success: true,
          stdout,
          stderr: '',
          error: null,
          language: 'python',
          exit_code: 0,
        },
        artifacts,
        executionTime: 200,
      },
    ];
  },
};

/**
 * Helper to create fetch mock that simulates full async workflow
 */
export function createAsyncWorkflowMock(sequence: MockJobState[]): typeof fetch {
  let callIndex = 0;

  return (async (_url: string, _options?: RequestInit) => {
    callIndex++;

    // First call is submit
    if (callIndex === 1) {
      return createMockFetchResponse(sequence[0]);
    }

    // Subsequent calls are status checks
    const stateIndex = Math.min(callIndex - 2, sequence.length - 1);
    return createMockFetchResponse(sequence[stateIndex]);
  }) as typeof fetch;
}
