/**
 * Integration tests for Unsandbox async submit/status flow
 * Tests full workflow: unsandboxSubmit -> unsandboxStatus polling -> completion
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createUnsandboxClient, UnsandboxApiError } from './client.js';
import type { UnsandboxClient } from './client.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('Unsandbox Async Submit/Status Flow - Integration Tests', () => {
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

  describe('Normal Success Flow', () => {
    it('should complete full async workflow: submit -> pending -> running -> completed', async () => {
      const jobId = 'job_integration_success';
      const code = 'for (let i = 0; i < 5; i++) { console.log("hello"); }';
      const expectedOutput = 'hello\nhello\nhello\nhello\nhello\n';

      // Step 1: Submit job
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'pending',
          created_at: new Date().toISOString(),
        }),
      });

      // Step 2: Poll - pending
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

      // Step 3: Poll - running
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'running',
          startedAt: new Date().toISOString(),
        }),
      });

      // Step 4: Poll - completed with stdout
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
            stdout: expectedOutput,
            stderr: '',
            error: null,
            language: 'node',
            exit_code: 0,
          },
          startedAt: new Date(Date.now() - 1000).toISOString(),
          completedAt: new Date().toISOString(),
          executionTime: 150,
          artifacts: [],
        }),
      });

      const promise = client.executeCode({
        language: 'node',
        code,
        ttl: 5,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('completed');
      expect(result.result?.success).toBe(true);
      expect(result.result?.stdout).toBe(expectedOutput);
      expect(result.result?.exit_code).toBe(0);
      expect(result.executionTime).toBe(150);
      expect(mockFetch).toHaveBeenCalledTimes(4); // 1 submit + 3 polls
    });

    it('should handle Python execution with imports', async () => {
      const jobId = 'job_python_success';
      const code = 'import json\\ndata = {"test": [1, 2, 3]}\\nprint(json.dumps(data))';
      const expectedOutput = '{"test": [1, 2, 3]}\n';

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
            stdout: expectedOutput,
            stderr: '',
            error: null,
            language: 'python',
            exit_code: 0,
          },
          executionTime: 200,
        }),
      });

      const promise = client.executeCode({
        language: 'python',
        code,
        ttl: 5,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('completed');
      expect(result.result?.stdout).toBe(expectedOutput);
    });
  });

  describe('Completed-with-Errors Flow', () => {
    it('should handle job that completes with success=false and empty stdout', async () => {
      const jobId = 'job_completed_error';
      const code = 'for (let i = 0; i < 5; i++) { console.log("hello"); }';

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
            stdout: '', // Empty stdout despite code that should print
            stderr: '', // Empty stderr too
            error: 'Runtime error occurred',
            language: 'node',
            exit_code: 1,
          },
          executionTime: 50,
        }),
      });

      const promise = client.executeCode({
        language: 'node',
        code,
        ttl: 5,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('completed');
      expect(result.result?.success).toBe(false);
      expect(result.result?.stdout).toBe('');
      expect(result.result?.stderr).toBe('');
      expect(result.result?.error).toBe('Runtime error occurred');
      expect(result.result?.exit_code).toBe(1);
    });

    it('should handle syntax errors with detailed stderr', async () => {
      const jobId = 'job_syntax_error';
      const code = 'console.log("unterminated string';
      const stderrOutput = 'SyntaxError: Invalid or unexpected token\n    at Module._compile\n';

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
            stderr: stderrOutput,
            error: 'Compilation failed',
            language: 'node',
            exit_code: 1,
          },
        }),
      });

      const promise = client.executeCode({
        language: 'node',
        code,
        ttl: 5,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('failed');
      expect(result.result?.success).toBe(false);
      expect(result.result?.stderr).toContain('SyntaxError');
      expect(result.result?.stdout).toBe('');
    });
  });

  describe('Timeout Flow', () => {
    it('should handle job that stays pending past TTL and times out', async () => {
      const jobId = 'job_timeout_pending';
      const code = 'import time; time.sleep(100)';

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

      // Simulate many polls returning 'pending' until timeout
      for (let i = 0; i < 60; i++) {
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
      }

      const promise = client.executeCode({
        language: 'python',
        code,
        ttl: 5,
      });

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(UnsandboxApiError);
      await expect(promise).rejects.toMatchObject({
        status: 408,
        code: 'POLLING_TIMEOUT',
      });
    });

    it('should handle job that reaches timeout status from API', async () => {
      const jobId = 'job_timeout_status';

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
          status: 'running',
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
            stdout: 'Started execution...\n',
            stderr: 'Execution timed out after 5 seconds',
            error: 'Timeout exceeded',
            language: 'python',
            exit_code: 124,
          },
        }),
      });

      const promise = client.executeCode({
        language: 'python',
        code: 'import time; time.sleep(100)',
        ttl: 5,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('timeout');
      expect(result.result?.success).toBe(false);
      expect(result.result?.exit_code).toBe(124);
    });
  });

  describe('Artifacts and File Output Handling', () => {
    it('should handle artifacts when stdout is empty', async () => {
      const jobId = 'job_artifacts_no_stdout';
      const code = 'import json; json.dump({"data": [1,2,3]}, open("output.json", "w"))';
      const artifacts = [
        {
          name: 'output.json',
          size: 24,
          mimeType: 'application/json',
          url: 'https://unsandbox.com/artifacts/job_artifacts_no_stdout/output.json',
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
            stdout: '', // Empty - no print statements
            stderr: '',
            error: null,
            language: 'python',
            exit_code: 0,
          },
          artifacts,
          executionTime: 100,
        }),
      });

      const promise = client.executeCode({
        language: 'python',
        code,
        ttl: 5,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('completed');
      expect(result.result?.success).toBe(true);
      expect(result.result?.stdout).toBe('');
      expect(result.artifacts).toHaveLength(1);
      expect(result.artifacts?.[0].name).toBe('output.json');
      expect(result.artifacts?.[0].url).toContain('output.json');
    });

    it('should handle multiple artifacts with partial stdout', async () => {
      const jobId = 'job_multi_artifacts';
      const code = `
import matplotlib.pyplot as plt
print("Generating charts...")
plt.plot([1,2,3])
plt.savefig("chart1.png")
plt.savefig("chart2.png")
print("Done!")
      `.trim();
      const artifacts = [
        {
          name: 'chart1.png',
          size: 5120,
          mimeType: 'image/png',
          url: 'https://unsandbox.com/artifacts/job_multi_artifacts/chart1.png',
        },
        {
          name: 'chart2.png',
          size: 5120,
          mimeType: 'image/png',
          url: 'https://unsandbox.com/artifacts/job_multi_artifacts/chart2.png',
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
            stdout: 'Generating charts...\nDone!\n',
            stderr: '',
            error: null,
            language: 'python',
            exit_code: 0,
          },
          artifacts,
          executionTime: 350,
        }),
      });

      const promise = client.executeCode({
        language: 'python',
        code,
        ttl: 10,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('completed');
      expect(result.result?.stdout).toContain('Generating charts');
      expect(result.result?.stdout).toContain('Done!');
      expect(result.artifacts).toHaveLength(2);
      expect(result.artifacts?.map(a => a.name)).toEqual(['chart1.png', 'chart2.png']);
    });
  });

  describe('Environment Variables and Stdin Handling', () => {
    it('should pass environment variables to execution', async () => {
      const jobId = 'job_with_env';
      const code = 'import os; print(f"API_KEY={os.getenv(\'API_KEY\')}")';
      const env = { API_KEY: 'test-secret-key-123' };

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
            stdout: 'API_KEY=test-secret-key-123\n',
            stderr: '',
            error: null,
            language: 'python',
            exit_code: 0,
          },
        }),
      });

      const promise = client.executeCode({
        language: 'python',
        code,
        ttl: 5,
        env,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('completed');
      expect(result.result?.stdout).toContain('test-secret-key-123');

      // Verify env was passed in request
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('API_KEY'),
        })
      );
    });

    it('should pass stdin to execution', async () => {
      const jobId = 'job_with_stdin';
      const code = 'data = input(); print(f"You entered: {data}")';
      const stdin = 'test input data';

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
            stdout: 'You entered: test input data\n',
            stderr: '',
            error: null,
            language: 'python',
            exit_code: 0,
          },
        }),
      });

      const promise = client.executeCode({
        language: 'python',
        code,
        ttl: 5,
        stdin,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('completed');
      expect(result.result?.stdout).toContain('test input data');

      // Verify stdin was passed
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('test input data'),
        })
      );
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle malformed API response during execution', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => 'Invalid JSON{{{',
      });

      const promise = client.executeCode({
        language: 'node',
        code: 'console.log("test")',
        ttl: 5,
      });

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(UnsandboxApiError);
      await expect(promise).rejects.toMatchObject({
        code: 'PARSE_ERROR',
      });
    });

    it('should handle API returning 500 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
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
        status: 500,
        code: 'INTERNAL_ERROR',
      });
    });

    it('should handle job that goes from running to cancelled', async () => {
      const jobId = 'job_cancelled';

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
          status: 'running',
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
            stdout: 'Starting...\n',
            stderr: '',
            error: 'Job was cancelled',
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
    });
  });

  describe('Real-world Job ID Examples from Issue', () => {
    it('should handle job_id: 77800820-184f-1e27-ae80-3da11d7efa5 (completed with errors, empty output)', async () => {
      const jobId = '77800820-184f-1e27-ae80-3da11d7efa5';
      const code = 'for (let i = 0; i < 5; i++) { console.log("hello"); }';

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
            stdout: '', // Empty despite console.log calls
            stderr: '', // Empty stderr
            error: null,
            language: 'node',
            exit_code: 0,
          },
        }),
      });

      const promise = client.executeCode({
        language: 'node',
        code,
        ttl: 5,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('completed');
      expect(result.result?.success).toBe(false);
      expect(result.result?.stdout).toBe('');
      expect(result.result?.stderr).toBe('');
    });

    it('should handle similar behavior for other failed job IDs', async () => {
      const jobIds = [
        'e5ab6f21-4e7d-9d78-493d-504abc86c09',
        '5ec962d1-9c60-7d57-f2bc-8af101b2020',
      ];

      for (const jobId of jobIds) {
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
              error: null,
              language: 'node',
              exit_code: 0,
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

        mockFetch.mockClear();
        vi.clearAllTimers();
        vi.useFakeTimers();
      }
    });
  });
});
