/**
 * Functional tests for Unsandbox Tool
 * Tests the AI tool integration and real-world usage scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { unsandboxTool } from './unsandbox.js';
import { UnsandboxApiError } from '../../lib/unsandbox/client.js';

// Mock the unsandbox client
vi.mock('../../lib/unsandbox/client.js', async () => {
  const actual = await vi.importActual('../../lib/unsandbox/client.js');
  return {
    ...actual,
    createUnsandboxClient: vi.fn(() => ({
      executeCode: vi.fn(),
    })),
  };
});

describe('Unsandbox Tool', () => {
  let mockExecuteCode: any;

  beforeEach(() => {
    const { createUnsandboxClient } = await import('../../lib/unsandbox/client.js');
    const mockClient = (createUnsandboxClient as any)();
    mockExecuteCode = mockClient.executeCode;
    mockExecuteCode.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Tool Configuration', () => {
    it('should have correct tool description', () => {
      expect(unsandboxTool.description).toContain('sandboxed environment');
      expect(unsandboxTool.description).toContain('programming languages');
    });

    it('should have required input schema fields', () => {
      const schema = unsandboxTool.inputSchema;
      expect(schema).toBeDefined();
      expect(schema.shape.language).toBeDefined();
      expect(schema.shape.code).toBeDefined();
      expect(schema.shape.ttl).toBeDefined();
    });
  });

  describe('Language Mapping', () => {
    it('should map javascript to node runtime', async () => {
      mockExecuteCode.mockResolvedValueOnce({
        job_id: 'job123',
        status: 'completed',
        result: {
          success: true,
          stdout: 'Hello\n',
          stderr: '',
          error: null,
          language: 'node',
          exit_code: 0,
        },
      });

      const result = await unsandboxTool.execute({
        language: 'javascript',
        code: 'console.log("Hello")',
        ttl: 5,
      });

      expect(result.success).toBe(true);
      expect(mockExecuteCode).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'node', // Should be mapped from 'javascript'
        })
      );
    });

    it('should handle python language correctly', async () => {
      mockExecuteCode.mockResolvedValueOnce({
        job_id: 'job456',
        status: 'completed',
        result: {
          success: true,
          stdout: 'Python works\n',
          stderr: '',
          error: null,
          language: 'python',
          exit_code: 0,
        },
      });

      const result = await unsandboxTool.execute({
        language: 'python',
        code: 'print("Python works")',
        ttl: 5,
      });

      expect(result.success).toBe(true);
      expect(mockExecuteCode).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'python',
        })
      );
    });
  });

  describe('Successful Executions', () => {
    it('should execute Python code and return output', async () => {
      const stdout = '[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]\n';

      mockExecuteCode.mockResolvedValueOnce({
        job_id: 'job_fib123',
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
      });

      const result = await unsandboxTool.execute({
        language: 'python',
        code: 'def fib(n): return [0,1,1,2,3,5,8,13,21,34][:n]\nprint(fib(10))',
        ttl: 5,
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe(stdout);
      expect(result.exitCode).toBe(0);
      expect(result.executionTime).toBe(123);
      expect(result.error).toBe('');
    });

    it('should execute JavaScript (Node) code', async () => {
      mockExecuteCode.mockResolvedValueOnce({
        job_id: 'job_js123',
        status: 'completed',
        result: {
          success: true,
          stdout: '15\n',
          stderr: '',
          error: null,
          language: 'node',
          exit_code: 0,
        },
        executionTime: 45,
      });

      const result = await unsandboxTool.execute({
        language: 'javascript',
        code: 'const sum = [1,2,3,4,5].reduce((a,b) => a+b, 0); console.log(sum);',
        ttl: 5,
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe('15\n');
      expect(result.language).toBe('javascript');
    });

    it('should handle code with stdin', async () => {
      mockExecuteCode.mockResolvedValueOnce({
        job_id: 'job_stdin123',
        status: 'completed',
        result: {
          success: true,
          stdout: 'You entered: test input\n',
          stderr: '',
          error: null,
          language: 'python',
          exit_code: 0,
        },
      });

      const result = await unsandboxTool.execute({
        language: 'python',
        code: 'data = input(); print(f"You entered: {data}")',
        ttl: 5,
        stdin: 'test input',
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('test input');
      expect(mockExecuteCode).toHaveBeenCalledWith(
        expect.objectContaining({
          stdin: 'test input',
        })
      );
    });

    it('should handle code with environment variables', async () => {
      mockExecuteCode.mockResolvedValueOnce({
        job_id: 'job_env123',
        status: 'completed',
        result: {
          success: true,
          stdout: 'API_KEY=secret123\n',
          stderr: '',
          error: null,
          language: 'python',
          exit_code: 0,
        },
      });

      const result = await unsandboxTool.execute({
        language: 'python',
        code: 'import os; print(f"API_KEY={os.getenv(\'API_KEY\')}")',
        ttl: 5,
        env: { API_KEY: 'secret123' },
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('secret123');
      expect(mockExecuteCode).toHaveBeenCalledWith(
        expect.objectContaining({
          env: { API_KEY: 'secret123' },
        })
      );
    });

    it('should include artifacts in response', async () => {
      const artifacts = [
        {
          name: 'output.txt',
          size: 1024,
          mimeType: 'text/plain',
          url: 'https://example.com/artifact1',
        },
      ];

      mockExecuteCode.mockResolvedValueOnce({
        job_id: 'job_artifacts123',
        status: 'completed',
        result: {
          success: true,
          stdout: 'File created\n',
          stderr: '',
          error: null,
          language: 'python',
          exit_code: 0,
        },
        artifacts,
      });

      const result = await unsandboxTool.execute({
        language: 'python',
        code: 'with open("output.txt", "w") as f: f.write("test")\nprint("File created")',
        ttl: 5,
      });

      expect(result.success).toBe(true);
      expect(result.artifacts).toHaveLength(1);
      expect(result.artifacts[0].name).toBe('output.txt');
    });
  });

  describe('Failed Executions', () => {
    it('should handle syntax errors', async () => {
      const stderr = 'SyntaxError: invalid syntax\n  File "main.py", line 1\n    invalid syntax here\n';

      mockExecuteCode.mockResolvedValueOnce({
        job_id: 'job_syntax_err',
        status: 'failed',
        result: {
          success: false,
          stdout: '',
          stderr,
          error: 'Syntax error in code',
          language: 'python',
          exit_code: 1,
        },
      });

      const result = await unsandboxTool.execute({
        language: 'python',
        code: 'invalid syntax here +++',
        ttl: 5,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('SyntaxError');
      expect(result.exitCode).toBe(1);
    });

    it('should handle runtime errors', async () => {
      const stderr = 'ZeroDivisionError: division by zero\n';

      mockExecuteCode.mockResolvedValueOnce({
        job_id: 'job_runtime_err',
        status: 'failed',
        result: {
          success: false,
          stdout: '',
          stderr,
          error: 'Runtime error',
          language: 'python',
          exit_code: 1,
        },
      });

      const result = await unsandboxTool.execute({
        language: 'python',
        code: 'x = 1 / 0',
        ttl: 5,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('ZeroDivisionError');
    });

    it('should handle timeout status', async () => {
      mockExecuteCode.mockResolvedValueOnce({
        job_id: 'job_timeout',
        status: 'timeout',
        result: {
          success: false,
          stdout: '',
          stderr: 'Execution timed out after 5 seconds',
          error: 'Timeout exceeded',
          language: 'python',
          exit_code: 124,
        },
      });

      const result = await unsandboxTool.execute({
        language: 'python',
        code: 'import time; time.sleep(100)',
        ttl: 5,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('timeout');
      expect(result.error).toContain('timed out');
    });
  });

  describe('Error Handling', () => {
    it('should pass unsupported language to API and let it handle validation', async () => {
      // When an unsupported language is used, the API should return an error
      mockExecuteCode.mockRejectedValueOnce(
        new UnsandboxApiError(
          400,
          'UNSUPPORTED_LANGUAGE',
          'Unsupported language: cobol',
          {}
        )
      );

      const result = await unsandboxTool.execute({
        language: 'cobol',
        code: 'DISPLAY "Hello"',
        ttl: 5,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported language');
      expect(result.errorCode).toBe('UNSUPPORTED_LANGUAGE');
    });

    it('should handle API errors gracefully', async () => {
      mockExecuteCode.mockRejectedValueOnce(
        new UnsandboxApiError(
          404,
          'NOT_FOUND',
          'API endpoint not found',
          {}
        )
      );

      const result = await unsandboxTool.execute({
        language: 'python',
        code: 'print("test")',
        ttl: 5,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('404');
      expect(result.error).toContain('API endpoint not found');
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('should handle network errors', async () => {
      mockExecuteCode.mockRejectedValueOnce(
        new UnsandboxApiError(
          0,
          'NETWORK_ERROR',
          'Network error: Failed to fetch',
          {}
        )
      );

      const result = await unsandboxTool.execute({
        language: 'python',
        code: 'print("test")',
        ttl: 5,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      expect(result.errorCode).toBe('NETWORK_ERROR');
    });

    it('should handle timeout errors', async () => {
      mockExecuteCode.mockRejectedValueOnce(
        new UnsandboxApiError(
          408,
          'TIMEOUT',
          'Request timed out after 30000ms',
          {}
        )
      );

      const result = await unsandboxTool.execute({
        language: 'python',
        code: 'print("test")',
        ttl: 5,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
      expect(result.errorCode).toBe('TIMEOUT');
    });

    it('should handle generic errors', async () => {
      mockExecuteCode.mockRejectedValueOnce(
        new Error('Unexpected error occurred')
      );

      const result = await unsandboxTool.execute({
        language: 'python',
        code: 'print("test")',
        ttl: 5,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unexpected error');
    });
  });

  describe('Multiple Languages', () => {
    const testCases = [
      {
        language: 'python',
        code: 'print("Python")',
        expectedOutput: 'Python\n',
      },
      {
        language: 'javascript',
        code: 'console.log("JS")',
        expectedOutput: 'JS\n',
      },
      {
        language: 'typescript',
        code: 'const msg: string = "TS"; console.log(msg);',
        expectedOutput: 'TS\n',
      },
      {
        language: 'ruby',
        code: 'puts "Ruby"',
        expectedOutput: 'Ruby\n',
      },
      {
        language: 'go',
        code: 'package main\nimport "fmt"\nfunc main() { fmt.Println("Go") }',
        expectedOutput: 'Go\n',
      },
      {
        language: 'rust',
        code: 'fn main() { println!("Rust"); }',
        expectedOutput: 'Rust\n',
      },
      {
        language: 'bash',
        code: 'echo "Bash"',
        expectedOutput: 'Bash\n',
      },
    ];

    testCases.forEach(({ language, code, expectedOutput }) => {
      it(`should execute ${language} code successfully`, async () => {
        mockExecuteCode.mockResolvedValueOnce({
          job_id: `job_${language}_test`,
          status: 'completed',
          result: {
            success: true,
            stdout: expectedOutput,
            stderr: '',
            error: null,
            language: language === 'javascript' ? 'node' : language,
            exit_code: 0,
          },
        });

        const result = await unsandboxTool.execute({
          language,
          code,
          ttl: 5,
        });

        expect(result.success).toBe(true);
        expect(result.output).toBe(expectedOutput);
        expect(result.language).toBe(language);
      });
    });
  });

  describe('TTL Configuration', () => {
    it('should use default TTL of 5 seconds', async () => {
      mockExecuteCode.mockResolvedValueOnce({
        job_id: 'job_default_ttl',
        status: 'completed',
        result: {
          success: true,
          stdout: 'Done\n',
          stderr: '',
          error: null,
          language: 'python',
          exit_code: 0,
        },
      });

      await unsandboxTool.execute({
        language: 'python',
        code: 'print("Done")',
      });

      expect(mockExecuteCode).toHaveBeenCalledWith(
        expect.objectContaining({
          ttl: 5, // Default value
        })
      );
    });

    it('should accept custom TTL', async () => {
      mockExecuteCode.mockResolvedValueOnce({
        job_id: 'job_custom_ttl',
        status: 'completed',
        result: {
          success: true,
          stdout: 'Done\n',
          stderr: '',
          error: null,
          language: 'python',
          exit_code: 0,
        },
      });

      await unsandboxTool.execute({
        language: 'python',
        code: 'print("Done")',
        ttl: 15,
      });

      expect(mockExecuteCode).toHaveBeenCalledWith(
        expect.objectContaining({
          ttl: 15,
        })
      );
    });

    it('should enforce maximum TTL of 30 seconds', async () => {
      // This test validates the Zod schema enforcement
      const schema = unsandboxTool.inputSchema;
      const validationResult = schema.safeParse({
        language: 'python',
        code: 'print("test")',
        ttl: 35, // Exceeds max
      });

      expect(validationResult.success).toBe(false);
    });

    it('should enforce minimum TTL of 1 second', async () => {
      const schema = unsandboxTool.inputSchema;
      const validationResult = schema.safeParse({
        language: 'python',
        code: 'print("test")',
        ttl: 0, // Below min
      });

      expect(validationResult.success).toBe(false);
    });
  });

  describe('Response Format', () => {
    it('should return standardized response structure', async () => {
      mockExecuteCode.mockResolvedValueOnce({
        job_id: 'job_response123',
        status: 'completed',
        result: {
          success: true,
          stdout: 'Test output\n',
          stderr: '',
          error: null,
          language: 'python',
          exit_code: 0,
        },
        executionTime: 234,
        artifacts: [],
      });

      const result = await unsandboxTool.execute({
        language: 'python',
        code: 'print("Test output")',
        ttl: 5,
      });

      // Verify all expected fields are present
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('language');
      expect(result).toHaveProperty('output');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('exitCode');
      expect(result).toHaveProperty('executionTime');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('artifacts');
    });

    it('should handle missing optional fields', async () => {
      mockExecuteCode.mockResolvedValueOnce({
        job_id: 'job_minimal',
        status: 'completed',
        result: {
          success: true,
          stdout: 'Output\n',
          stderr: '',
          error: null,
          language: 'python',
          exit_code: 0,
        },
        // No executionTime or artifacts
      });

      const result = await unsandboxTool.execute({
        language: 'python',
        code: 'print("Output")',
        ttl: 5,
      });

      expect(result.success).toBe(true);
      expect(result.executionTime).toBeUndefined();
      expect(result.artifacts).toEqual([]);
    });
  });
});
