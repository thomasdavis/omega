/**
 * Unit tests for Unsandbox API Client
 * Tests API interactions, error handling, and polling logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UnsandboxClient, UnsandboxApiError, createUnsandboxClient } from './client.js';
import type { ExecuteCodeRequest, JobStatusResponse } from './types.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('UnsandboxClient', () => {
  let client: UnsandboxClient;

  beforeEach(() => {
    // Set environment variable for tests
    process.env.UNSANDBOX_API_KEY = 'test-api-key';
    client = createUnsandboxClient({});
    mockFetch.mockClear();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Constructor and Configuration', () => {
    it('should create client with default configuration', () => {
      const client = createUnsandboxClient({});
      expect(client).toBeInstanceOf(UnsandboxClient);
    });

    it('should throw error if no API key is provided', () => {
      delete process.env.UNSANDBOX_API_KEY;
      expect(() => createUnsandboxClient({})).toThrow('Unsandbox API key must be provided');
    });

    it('should use API key from config', () => {
      delete process.env.UNSANDBOX_API_KEY;
      const client = createUnsandboxClient({
        apiKey: 'custom-key',
      });
      expect(client).toBeInstanceOf(UnsandboxClient);
    });

    it('should use custom base URL', () => {
      const customUrl = 'https://custom.api.com';
      const client = createUnsandboxClient({
        baseUrl: customUrl,
      });
      expect(client).toBeInstanceOf(UnsandboxClient);
    });

    it('should use custom timeout', () => {
      const client = createUnsandboxClient({
        timeout: 60000,
      });
      expect(client).toBeInstanceOf(UnsandboxClient);
    });
  });

  describe('executeCode', () => {
    it('should execute Python code successfully', async () => {
      const jobId = 'job_test123';
      const stdout = 'Hello, World!\n';

      // Mock initial execution response
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

      // Mock job status response (completed)
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
            stdout,
            stderr: '',
            error: null,
            language: 'python',
            exit_code: 0,
          },
          executionTime: 123,
        }),
      });

      const request: ExecuteCodeRequest = {
        language: 'python',
        code: 'print("Hello, World!")',
        ttl: 5,
      };

      const promise = client.executeCode(request);

      // Advance timers to trigger polling
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.status).toBe('completed');
      expect(result.result?.success).toBe(true);
      expect(result.result?.stdout).toBe(stdout);
      expect(result.result?.exit_code).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Verify correct endpoint was called
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://api.unsandbox.com/v1/execute',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer open-says-me',
            'Content-Type': 'application/json',
          }),
        })
      );

      // Verify job status endpoint
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        `https://api.unsandbox.com/v1/jobs/${jobId}`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle execution with stdin and env vars', async () => {
      const jobId = 'job_test456';

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
            stdout: 'test output',
            stderr: '',
            error: null,
            language: 'python',
            exit_code: 0,
          },
        }),
      });

      const request: ExecuteCodeRequest = {
        language: 'python',
        code: 'import os; print(os.getenv("TEST_VAR"))',
        ttl: 5,
        stdin: 'test input',
        env: { TEST_VAR: 'test value' },
      };

      const promise = client.executeCode(request);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('completed');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.unsandbox.com/v1/execute',
        expect.objectContaining({
          body: expect.stringContaining('test input'),
        })
      );
    });

    it('should handle failed execution with stderr', async () => {
      const jobId = 'job_fail123';
      const stderr = 'SyntaxError: invalid syntax';

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
            stderr,
            error: 'Execution failed',
            language: 'python',
            exit_code: 1,
          },
        }),
      });

      const request: ExecuteCodeRequest = {
        language: 'python',
        code: 'invalid python code +++',
        ttl: 5,
      };

      const promise = client.executeCode(request);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('failed');
      expect(result.result?.success).toBe(false);
      expect(result.result?.stderr).toBe(stderr);
      expect(result.result?.exit_code).toBe(1);
    });

    it('should poll until job completion', async () => {
      const jobId = 'job_poll123';

      // Initial execution
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

      // First poll - still running
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

      // Second poll - completed
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
            stdout: 'Done',
            stderr: '',
            error: null,
            language: 'python',
            exit_code: 0,
          },
        }),
      });

      const request: ExecuteCodeRequest = {
        language: 'python',
        code: 'print("Done")',
        ttl: 5,
      };

      const promise = client.executeCode(request);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('completed');
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 execute + 2 polls
    });

    it('should handle timeout status', async () => {
      const jobId = 'job_timeout123';

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
            stderr: 'Execution timed out',
            error: 'Timeout exceeded',
            language: 'python',
            exit_code: 124,
          },
        }),
      });

      const request: ExecuteCodeRequest = {
        language: 'python',
        code: 'import time; time.sleep(100)',
        ttl: 5,
      };

      const promise = client.executeCode(request);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('timeout');
      expect(result.result?.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 error from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          message: 'Endpoint not found',
          code: 'NOT_FOUND',
        }),
      });

      const request: ExecuteCodeRequest = {
        language: 'python',
        code: 'print("test")',
        ttl: 5,
      };

      await expect(client.executeCode(request)).rejects.toThrow(UnsandboxApiError);
      await expect(client.executeCode(request)).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const request: ExecuteCodeRequest = {
        language: 'python',
        code: 'print("test")',
        ttl: 5,
      };

      await expect(client.executeCode(request)).rejects.toThrow(UnsandboxApiError);
      await expect(client.executeCode(request)).rejects.toMatchObject({
        status: 0,
        code: 'NETWORK_ERROR',
      });
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockImplementationOnce(() => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            const error = new Error('AbortError');
            error.name = 'AbortError';
            reject(error);
          }, 100);
        });
      });

      const request: ExecuteCodeRequest = {
        language: 'python',
        code: 'print("test")',
        ttl: 5,
      };

      const promise = client.executeCode(request);
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(UnsandboxApiError);
      await expect(promise).rejects.toMatchObject({
        status: 408,
        code: 'TIMEOUT',
      });
    });

    it('should handle invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => 'Invalid JSON{{{',
      });

      const request: ExecuteCodeRequest = {
        language: 'python',
        code: 'print("test")',
        ttl: 5,
      };

      await expect(client.executeCode(request)).rejects.toThrow(UnsandboxApiError);
      await expect(client.executeCode(request)).rejects.toMatchObject({
        code: 'PARSE_ERROR',
        message: 'Failed to parse API response as JSON',
      });
    });

    it('should handle 401 unauthorized error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          message: 'Invalid API key',
          code: 'UNAUTHORIZED',
        }),
      });

      const request: ExecuteCodeRequest = {
        language: 'python',
        code: 'print("test")',
        ttl: 5,
      };

      await expect(client.executeCode(request)).rejects.toThrow(UnsandboxApiError);
      await expect(client.executeCode(request)).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('getExecutionStatus', () => {
    it('should get status of running job', async () => {
      const jobId = 'job_status123';

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

      const result = await client.getExecutionStatus({ job_id: jobId });

      expect(result.status).toBe('running');
      expect(result.job_id).toBe(jobId);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.unsandbox.com/v1/jobs/${jobId}`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should get status of completed job with results', async () => {
      const jobId = 'job_complete123';

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
            stdout: 'Output data',
            stderr: '',
            error: null,
            language: 'python',
            exit_code: 0,
          },
          executionTime: 456,
        }),
      });

      const result = await client.getExecutionStatus({ job_id: jobId });

      expect(result.status).toBe('completed');
      expect(result.result?.stdout).toBe('Output data');
      expect(result.executionTime).toBe(456);
    });
  });

  describe('listArtifacts', () => {
    it('should list artifacts from completed job', async () => {
      const jobId = 'job_artifacts123';
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
          status: 'completed',
          result: {
            success: true,
            stdout: '',
            stderr: '',
            error: null,
            language: 'python',
            exit_code: 0,
          },
          artifacts,
        }),
      });

      const result = await client.listArtifacts({ id: jobId });

      expect(result.artifacts).toHaveLength(2);
      expect(result.artifacts[0].name).toBe('output.txt');
      expect(result.artifacts[1].name).toBe('chart.png');
    });

    it('should return empty array when no artifacts', async () => {
      const jobId = 'job_noartifacts123';

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
            stdout: '',
            stderr: '',
            error: null,
            language: 'python',
            exit_code: 0,
          },
        }),
      });

      const result = await client.listArtifacts({ id: jobId });

      expect(result.artifacts).toEqual([]);
    });
  });

  describe('cancelExecution', () => {
    it('should cancel running execution', async () => {
      const jobId = 'job_cancel123';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({
          job_id: jobId,
          status: 'cancelled',
        }),
      });

      const result = await client.cancelExecution(jobId);

      expect(result.status).toBe('cancelled');
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.unsandbox.com/v1/jobs/${jobId}/cancel`,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({ status: 'ok' }),
      });

      const result = await client.healthCheck();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.unsandbox.com/health',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should return false when API is unhealthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({ message: 'Service unavailable' }),
      });

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('Multiple Language Support', () => {
    const languages: Array<{ lang: string; code: string; expectedOutput: string }> = [
      { lang: 'python', code: 'print("Python")', expectedOutput: 'Python\n' },
      { lang: 'node', code: 'console.log("Node")', expectedOutput: 'Node\n' },
      { lang: 'typescript', code: 'console.log("TS")', expectedOutput: 'TS\n' },
      { lang: 'ruby', code: 'puts "Ruby"', expectedOutput: 'Ruby\n' },
      { lang: 'go', code: 'package main\nimport "fmt"\nfunc main() { fmt.Println("Go") }', expectedOutput: 'Go\n' },
    ];

    languages.forEach(({ lang, code, expectedOutput }) => {
      it(`should execute ${lang} code`, async () => {
        const jobId = `job_${lang}_123`;

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
              language: lang,
              exit_code: 0,
            },
          }),
        });

        const request: ExecuteCodeRequest = {
          language: lang as any,
          code,
          ttl: 5,
        };

        const promise = client.executeCode(request);
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result.status).toBe('completed');
        expect(result.result?.stdout).toBe(expectedOutput);
      });
    });
  });

  describe('Key Management Endpoints', () => {
    describe('amIThrottled', () => {
      it('should check throttle status successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Map([['content-type', 'application/json']]),
          text: async () => JSON.stringify({
            requests_last_60s: 42,
            active_executions: 3,
            throttled: false,
          }),
        });

        const result = await client.amIThrottled();

        expect(result.requests_last_60s).toBe(42);
        expect(result.active_executions).toBe(3);
        expect(result.throttled).toBe(false);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.unsandbox.com/keys/am-i-throttled',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': 'Bearer open-says-me',
            }),
          })
        );
      });

      it('should indicate when throttled', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Map([['content-type', 'application/json']]),
          text: async () => JSON.stringify({
            requests_last_60s: 100,
            active_executions: 10,
            throttled: true,
          }),
        });

        const result = await client.amIThrottled();

        expect(result.throttled).toBe(true);
        expect(result.requests_last_60s).toBe(100);
      });
    });

    describe('getKeyStats', () => {
      it('should retrieve key statistics successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Map([['content-type', 'application/json']]),
          text: async () => JSON.stringify({
            total_requests: 1234,
            total_execution_time_ms: 567890,
          }),
        });

        const result = await client.getKeyStats();

        expect(result.total_requests).toBe(1234);
        expect(result.total_execution_time_ms).toBe(567890);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.unsandbox.com/keys/stats',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': 'Bearer open-says-me',
            }),
          })
        );
      });
    });

    describe('validateKey', () => {
      it('should validate key successfully with config', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Map([['content-type', 'application/json']]),
          text: async () => JSON.stringify({
            valid: true,
            config: {
              max_ttl: 300,
              rate_limit: {
                requests_per_window: 100,
                window_seconds: 60,
              },
            },
          }),
        });

        const result = await client.validateKey();

        expect(result.valid).toBe(true);
        expect(result.config?.max_ttl).toBe(300);
        expect(result.config?.rate_limit?.requests_per_window).toBe(100);
        expect(result.config?.rate_limit?.window_seconds).toBe(60);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.unsandbox.com/keys/validate',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': 'Bearer open-says-me',
            }),
          })
        );
      });

      it('should handle invalid key', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Map([['content-type', 'application/json']]),
          text: async () => JSON.stringify({
            valid: false,
          }),
        });

        const result = await client.validateKey();

        expect(result.valid).toBe(false);
        expect(result.config).toBeUndefined();
      });
    });
  });
});
