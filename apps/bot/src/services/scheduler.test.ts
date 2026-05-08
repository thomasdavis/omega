/**
 * Scheduler Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to ensure mock functions are available when vi.mock factories run
const { mockSchedule, mockGenerateDailyBlog } = vi.hoisted(() => ({
  mockSchedule: vi.fn(),
  mockGenerateDailyBlog: vi.fn(),
}));

vi.mock('node-cron', () => ({
  default: {
    schedule: mockSchedule,
  },
}));

vi.mock('@repo/agent', () => ({
  generateDailyBlog: (...args: any[]) => mockGenerateDailyBlog(...args),
}));

import { initializeScheduler, triggerDailyBlogNow } from './scheduler.js';

describe('scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('initializeScheduler', () => {
    it('should register a cron job with the correct schedule', () => {
      initializeScheduler();

      expect(mockSchedule).toHaveBeenCalledTimes(1);
      expect(mockSchedule).toHaveBeenCalledWith('0 9 * * *', expect.any(Function));
    });

    it('should log initialization messages', () => {
      initializeScheduler();

      expect(console.log).toHaveBeenCalledWith('⏰ Initializing task scheduler...');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Scheduler initialized')
      );
    });

    describe('cron callback', () => {
      it('should call generateDailyBlog when cron triggers', async () => {
        mockGenerateDailyBlog.mockResolvedValue({
          success: true,
          filename: 'blog-2026-05-08.md',
        });

        initializeScheduler();

        // Extract the callback passed to cron.schedule
        const cronCallback = mockSchedule.mock.calls[0][1];
        await cronCallback();

        expect(mockGenerateDailyBlog).toHaveBeenCalledTimes(1);
      });

      it('should log success when blog generation succeeds', async () => {
        mockGenerateDailyBlog.mockResolvedValue({
          success: true,
          filename: 'blog-2026-05-08.md',
        });

        initializeScheduler();
        const cronCallback = mockSchedule.mock.calls[0][1];
        await cronCallback();

        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Daily blog generated successfully: blog-2026-05-08.md')
        );
      });

      it('should log error when blog generation fails', async () => {
        mockGenerateDailyBlog.mockResolvedValue({
          success: false,
          error: 'No topics available',
        });

        initializeScheduler();
        const cronCallback = mockSchedule.mock.calls[0][1];
        await cronCallback();

        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining('Daily blog generation failed: No topics available')
        );
      });

      it('should catch and log exceptions from generateDailyBlog', async () => {
        mockGenerateDailyBlog.mockRejectedValue(new Error('Network error'));

        initializeScheduler();
        const cronCallback = mockSchedule.mock.calls[0][1];
        await cronCallback();

        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining('Error in daily blog cron job'),
          expect.any(Error)
        );
      });
    });
  });

  describe('triggerDailyBlogNow', () => {
    it('should call generateDailyBlog and return its result', async () => {
      const expectedResult = { success: true, filename: 'blog-manual.md' };
      mockGenerateDailyBlog.mockResolvedValue(expectedResult);

      const result = await triggerDailyBlogNow();

      expect(mockGenerateDailyBlog).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('should return failure result from generateDailyBlog', async () => {
      const expectedResult = { success: false, error: 'API down' };
      mockGenerateDailyBlog.mockResolvedValue(expectedResult);

      const result = await triggerDailyBlogNow();

      expect(result).toEqual(expectedResult);
    });

    it('should log manual trigger message', async () => {
      mockGenerateDailyBlog.mockResolvedValue({ success: true });
      await triggerDailyBlogNow();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Manual trigger')
      );
    });

    it('should propagate errors from generateDailyBlog', async () => {
      mockGenerateDailyBlog.mockRejectedValue(new Error('Fatal error'));

      await expect(triggerDailyBlogNow()).rejects.toThrow('Fatal error');
    });
  });
});
