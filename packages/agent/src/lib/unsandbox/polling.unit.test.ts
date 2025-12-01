/**
 * Unit tests for Unsandbox async polling loop
 * Tests polling behavior, backoff strategy, terminal states, retry limits, and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UnsandboxClient, UnsandboxApiError, createUnsandboxClient } from './client.js';
import type { JobStatusResponse } from './types.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('Unsandbox Polling Logic - Unit Tests', () => {
  let client: UnsandboxClient;

  beforeEach(() => {
    client = createUnsandboxClient({
      timeout: 30000,
    });
    mockFetch.mockClear();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Polling Behavior', () => {
    it('should poll until job reaches completed state', async () => {
      const jobId = 'job_poll_completed';

      // Initial submit
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'pending',
        }),
      });

      // Poll 1: pending
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'pending',
        }),
      });

      // Poll 2: running
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'running',
        }),
      });

      // Poll 3: completed
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'completed',
          result: {
            success: true,
            stdout: 'hello\n',
            stderr: '',
            error: null,
            language: 'node',
            exit_code: 0,
          },
          executionTime: 150,
        }),
      });

      const promise = client.executeCode({
        language: 'node',
        code: 'console.log("hello")',
        ttl: 5,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('completed');
      expect(result.result?.success).toBe(true);
      expect(result.result?.stdout).toBe('hello\n');
      expect(mockFetch).toHaveBeenCalledTimes(4); // 1 submit + 3 polls
    });

    it('should stop polling immediately when job reaches failed state', async () => {
      const jobId = 'job_poll_failed';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'pending',
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'failed',
          result: {
            success: false,
            stdout: '',
            stderr: 'SyntaxError: Unexpected token',
            error: 'Compilation failed',
            language: 'node',
            exit_code: 1,
          },
        }),
      });

      const promise = client.executeCode({
        language: 'node',
        code: 'invalid code +++',
        ttl: 5,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('failed');
      expect(result.result?.success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(2); // 1 submit + 1 poll (stops immediately)
    });

    it('should stop polling when job reaches timeout state', async () => {
      const jobId = 'job_poll_timeout';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'pending',
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'timeout',
          result: {
            success: false,
            stdout: '',
            stderr: 'Execution timed out after 5 seconds',
            error: 'Timeout exceeded',
            language: 'node',
            exit_code: 124,
          },
        }),
      });

      const promise = client.executeCode({
        language: 'node',
        code: 'while(true) {}',
        ttl: 5,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('timeout');
      expect(result.result?.success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should stop polling when job reaches cancelled state', async () => {
      const jobId = 'job_poll_cancelled';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'pending',
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'cancelled',
          result: {
            success: false,
            stdout: '',
            stderr: '',
            error: 'Job was cancelled by user',
            language: 'node',
            exit_code: 130,
          },
        }),
      });

      const promise = client.executeCode({
        language: 'node',
        code: 'console.log("test")',
        ttl: 5,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('cancelled');
      expect(result.result?.success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Terminal States', () => {
    it('should recognize completed with success=true as successful', async () => {
      const jobId = 'job_success_true';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'pending',
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'completed',
          result: {
            success: true,
            stdout: 'hello\n',
            stderr: '',
            error: null,
            language: 'node',
            exit_code: 0,
          },
        }),
      });

      const promise = client.executeCode({
        language: 'node',
        code: 'console.log("hello")',
        ttl: 5,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('completed');
      expect(result.result?.success).toBe(true);
    });

    it('should recognize completed with success=false as error', async () => {
      const jobId = 'job_completed_with_errors';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'pending',
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'completed',
          result: {
            success: false,
            stdout: '',
            stderr: '',
            error: 'Unknown runtime error',
            language: 'node',
            exit_code: 1,
          },
        }),
      });

      const promise = client.executeCode({
        language: 'node',
        code: 'for (let i = 0; i < 5; i++) { console.log("hello"); }',
        ttl: 5,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('completed');
      expect(result.result?.success).toBe(false);
      expect(result.result?.stdout).toBe('');
      expect(result.result?.stderr).toBe('');
    });
  });

  describe('Error Propagation', () => {
    it('should handle unexpected payload with missing stdout/stderr', async () => {
      const jobId = 'job_missing_fields';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'pending',
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'completed',
          result: {
            success: false,
            // Missing stdout, stderr
            language: 'node',
            exit_code: 1,
          },
        }),
      });

      const promise = client.executeCode({
        language: 'node',
        code: 'console.log("test")',
        ttl: 5,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('completed');
      expect(result.result?.success).toBe(false);
      // Should handle missing fields gracefully
      expect(result.result?.stdout).toBeUndefined();
      expect(result.result?.stderr).toBeUndefined();
    });

    it('should propagate API error when getJobStatus returns 404', async () => {
      const jobId = 'job_not_found';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'pending',
        }),
      });

      // Job not found during polling
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          message: 'Job not found',
          code: 'NOT_FOUND',
        }),
      });

      const promise = client.executeCode({
        language: 'node',
        code: 'console.log("test")',
        ttl: 5,
      });

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(UnsandboxApiError);
      await expect(promise).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    it('should propagate network errors during polling', async () => {
      const jobId = 'job_network_error';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'pending',
        }),
      });

      // Network error during polling
      mockFetch.mockRejectedValueOnce(new Error('Network connection lost'));

      const promise = client.executeCode({
        language: 'node',
        code: 'console.log("test")',
        ttl: 5,
      });

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(UnsandboxApiError);
      await expect(promise).rejects.toMatchObject({
        status: 0,
        code: 'NETWORK_ERROR',
      });
    });
  });

  describe('Retry Limits and Polling Timeout', () => {
    it('should timeout after max polling attempts', async () => {
      const jobId = 'job_max_attempts';

      // Submit
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'pending',
        }),
      });

      // Mock 60 polls (max attempts) all returning 'running'
      for (let i = 0; i < 60; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Map([['content-type', 'application/json']]),
          text: async () => JSON.stringify({
            job_id: jobId,
            status: 'running',
          }),
        });
      }

      const promise = client.executeCode({
        language: 'node',
        code: 'console.log("test")',
        ttl: 5,
      });

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(UnsandboxApiError);
      await expect(promise).rejects.toMatchObject({
        status: 408,
        code: 'POLLING_TIMEOUT',
      });
      expect(mockFetch).toHaveBeenCalledTimes(61); // 1 submit + 60 polls
    });

    it('should not exceed max polling attempts', async () => {
      const jobId = 'job_never_completes';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'pending',
        }),
      });

      // Always return 'pending'
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'pending',
        }),
      });

      const promise = client.executeCode({
        language: 'node',
        code: 'console.log("test")',
        ttl: 5,
      });

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(UnsandboxApiError);
      // Should stop at exactly 60 attempts, not more
      expect(mockFetch).toHaveBeenCalledTimes(61); // 1 submit + 60 polls (max)
    });
  });

  describe('Idempotency and Duplicate Job ID Handling', () => {
    it('should handle multiple status checks for same job_id', async () => {
      const jobId = 'job_idempotent';

      // Mock multiple calls to getExecutionStatus with same job_id
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Map([['content-type', 'application/json']]),
          text: async () => JSON.stringify({
            job_id: jobId,
            status: 'running',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Map([['content-type', 'application/json']]),
          text: async () => JSON.stringify({
            job_id: jobId,
            status: 'running',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Map([['content-type', 'application/json']]),
          text: async () => JSON.stringify({
            job_id: jobId,
            status: 'completed',
            result: {
              success: true,
              stdout: 'result',
              stderr: '',
              error: null,
              language: 'node',
              exit_code: 0,
            },
          }),
        });

      // Call getExecutionStatus multiple times
      const status1 = await client.getExecutionStatus({ job_id: jobId });
      expect(status1.status).toBe('running');

      const status2 = await client.getExecutionStatus({ job_id: jobId });
      expect(status2.status).toBe('running');

      const status3 = await client.getExecutionStatus({ job_id: jobId });
      expect(status3.status).toBe('completed');

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Artifacts Handling', () => {
    it('should include artifacts in completed job response', async () => {
      const jobId = 'job_with_artifacts';
      const artifacts = [
        {
          name: 'output.txt',
          size: 1024,
          mimeType: 'text/plain',
          url: 'https://example.com/artifact1',
        },
        {
          name: 'chart.png',
          size: 2048,
          mimeType: 'image/png',
          url: 'https://example.com/artifact2',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'pending',
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'completed',
          result: {
            success: true,
            stdout: 'Files created',
            stderr: '',
            error: null,
            language: 'python',
            exit_code: 0,
          },
          artifacts,
        }),
      });

      const promise = client.executeCode({
        language: 'python',
        code: 'with open("output.txt", "w") as f: f.write("test")',
        ttl: 5,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('completed');
      expect(result.artifacts).toHaveLength(2);
      expect(result.artifacts?.[0].name).toBe('output.txt');
      expect(result.artifacts?.[1].name).toBe('chart.png');
    });

    it('should handle empty stdout but artifacts present', async () => {
      const jobId = 'job_artifacts_only';
      const artifacts = [
        {
          name: 'data.json',
          size: 512,
          mimeType: 'application/json',
          url: 'https://example.com/data.json',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'pending',
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'completed',
          result: {
            success: true,
            stdout: '', // Empty stdout
            stderr: '',
            error: null,
            language: 'python',
            exit_code: 0,
          },
          artifacts, // But artifacts exist
        }),
      });

      const promise = client.executeCode({
        language: 'python',
        code: 'import json; json.dump({"test": 1}, open("data.json", "w"))',
        ttl: 5,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('completed');
      expect(result.result?.success).toBe(true);
      expect(result.result?.stdout).toBe('');
      expect(result.artifacts).toHaveLength(1);
      expect(result.artifacts?.[0].name).toBe('data.json');
    });
  });
});
