import { describe, it, expect, vi } from 'vitest';
import { RateLimiter, withRetry } from './base.js';

describe('RateLimiter', () => {
  it('should allow requests within rate limit', async () => {
    const limiter = new RateLimiter(5, 10);

    const start = Date.now();
    await limiter.acquire();
    await limiter.acquire();
    const elapsed = Date.now() - start;

    // Should complete quickly since we're under the limit
    expect(elapsed).toBeLessThan(100);
  });

  it('should delay requests when over limit', async () => {
    const limiter = new RateLimiter(1, 10); // 1 token, refill at 10/sec

    await limiter.acquire(); // Use the token
    const start = Date.now();
    await limiter.acquire(); // Should wait for refill
    const elapsed = Date.now() - start;

    // Should have waited for token refill
    expect(elapsed).toBeGreaterThan(50);
  });
});

describe('withRetry', () => {
  it('should succeed on first try', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn, 3, 10);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const result = await withRetry(fn, 3, 10);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(withRetry(fn, 3, 10)).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
