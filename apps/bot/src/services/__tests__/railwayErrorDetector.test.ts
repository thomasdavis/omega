/**
 * Tests for Railway Error Detector
 */

import { describe, it, expect } from 'vitest';
import { parseRailwayWebhook, analyzeEnvironmentVariables, type RailwayError } from '../railwayErrorDetector.js';

describe('parseRailwayWebhook', () => {
  it('should parse deployment failure webhook', () => {
    const payload = {
      type: 'DEPLOY',
      timestamp: '2025-11-23T00:00:00Z',
      service: { name: 'bot' },
      deployment: {
        id: 'deploy-123',
        status: 'FAILED',
        meta: {
          commitSha: 'abc123',
          commitMessage: 'test commit',
        },
      },
      snapshot: {
        error: 'Build failed',
        exitCode: 1,
      },
    };

    const error = parseRailwayWebhook(payload);

    expect(error).toBeDefined();
    expect(error?.type).toBe('deployment');
    expect(error?.serviceName).toBe('bot');
    expect(error?.message).toBe('Build failed');
    expect(error?.deploymentId).toBe('deploy-123');
    expect(error?.commitSha).toBe('abc123');
  });

  it('should parse crash webhook', () => {
    const payload = {
      type: 'DEPLOY',
      timestamp: '2025-11-23T00:00:00Z',
      service: { name: 'bot' },
      deployment: {
        id: 'deploy-456',
        status: 'CRASHED',
      },
      snapshot: {
        error: 'Application crashed',
      },
    };

    const error = parseRailwayWebhook(payload);

    expect(error).toBeDefined();
    expect(error?.type).toBe('crash');
    expect(error?.message).toBe('Application crashed');
  });

  it('should detect OOM from exit code 137', () => {
    const payload = {
      type: 'DEPLOY',
      timestamp: '2025-11-23T00:00:00Z',
      service: { name: 'bot' },
      deployment: {
        id: 'deploy-789',
        status: 'FAILED',
      },
      snapshot: {
        exitCode: 137,
      },
    };

    const error = parseRailwayWebhook(payload);

    expect(error).toBeDefined();
    expect(error?.type).toBe('oom');
    expect(error?.exitCode).toBe(137);
  });

  it('should parse runtime error from logs', () => {
    const payload = {
      log: {
        level: 'error',
        message: 'TypeError: Cannot read property "foo" of undefined',
        timestamp: '2025-11-23T00:00:00Z',
      },
      service: { name: 'bot' },
    };

    const error = parseRailwayWebhook(payload);

    expect(error).toBeDefined();
    expect(error?.type).toBe('runtime');
    expect(error?.message).toContain('TypeError');
  });

  it('should return null for non-error webhooks', () => {
    const payload = {
      type: 'DEPLOY',
      deployment: {
        status: 'SUCCESS',
      },
    };

    const error = parseRailwayWebhook(payload);

    expect(error).toBeNull();
  });
});

describe('analyzeEnvironmentVariables', () => {
  it('should detect missing environment variables', () => {
    const error: RailwayError = {
      type: 'runtime',
      timestamp: '2025-11-23T00:00:00Z',
      message: 'Error: OPENAI_API_KEY is not defined',
      serviceName: 'bot',
    };

    const vars = analyzeEnvironmentVariables(error);

    expect(vars).toContain('OPENAI_API_KEY');
  });

  it('should detect multiple missing variables', () => {
    const error: RailwayError = {
      type: 'runtime',
      timestamp: '2025-11-23T00:00:00Z',
      message: 'Missing required variables: DATABASE_URL and REDIS_URL',
      serviceName: 'bot',
    };

    const vars = analyzeEnvironmentVariables(error);

    expect(vars).toContain('DATABASE_URL');
    expect(vars).toContain('REDIS_URL');
  });

  it('should filter out common non-env-var words', () => {
    const error: RailwayError = {
      type: 'runtime',
      timestamp: '2025-11-23T00:00:00Z',
      message: 'ERROR: HTTP GET request failed',
      serviceName: 'bot',
    };

    const vars = analyzeEnvironmentVariables(error);

    // Should not include ERROR, HTTP, GET as env vars
    expect(vars).not.toContain('ERROR');
    expect(vars).not.toContain('HTTP');
    expect(vars).not.toContain('GET');
  });

  it('should return empty array when no env vars mentioned', () => {
    const error: RailwayError = {
      type: 'runtime',
      timestamp: '2025-11-23T00:00:00Z',
      message: 'Simple error message',
      serviceName: 'bot',
    };

    const vars = analyzeEnvironmentVariables(error);

    expect(vars).toEqual([]);
  });
});
