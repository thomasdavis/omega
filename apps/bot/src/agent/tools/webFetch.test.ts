/**
 * Unit tests for Web Fetch Tool with metadata extraction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { webFetchTool } from './webFetch.js';

// Mock the robotsChecker
vi.mock('../../utils/robotsChecker.js', () => ({
  robotsChecker: {
    isAllowed: vi.fn(),
  },
}));

// Mock global fetch
global.fetch = vi.fn();

describe('Web Fetch Tool with Metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Metadata Extraction', () => {
    it('should extract and return metadata for HTML pages', async () => {
      const { robotsChecker } = await import('../../utils/robotsChecker.js');

      // Mock robots.txt check to allow
      (robotsChecker.isAllowed as any).mockResolvedValue({
        allowed: true,
        reason: 'URL is allowed',
        matchedRules: ['Default: Allow (no matching rules)'],
        crawlDelay: undefined,
      });

      // Mock fetch response
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Test Page</title>
            <meta name="description" content="Test description">
            <link rel="canonical" href="https://example.com/canonical">
            <meta property="og:title" content="OG Test Title">
            <meta property="og:description" content="OG Test Description">
            <meta property="og:image" content="https://example.com/og-image.jpg">
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="Twitter Test Title">
          </head>
          <body>
            <h1>Test Content</h1>
            <p>This is test content.</p>
          </body>
        </html>
      `;

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        url: 'https://example.com/page',
        headers: {
          get: (name: string) => {
            const headers: Record<string, string> = {
              'content-type': 'text/html; charset=utf-8',
              'content-length': '1024',
              'cache-control': 'max-age=3600',
              'last-modified': 'Mon, 01 Jan 2024 00:00:00 GMT',
            };
            return headers[name.toLowerCase()] || null;
          },
        },
        text: async () => htmlContent,
      });

      const result = await webFetchTool.execute({
        url: 'https://example.com/page',
        userAgent: 'TestBot/1.0',
      });

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.requestedUrl).toBe('https://example.com/page');
      expect(result.metadata.finalUrl).toBe('https://example.com/page');
      expect(result.metadata.httpStatus).toBe(200);
      expect(result.metadata.contentType).toBe('text/html; charset=utf-8');
      expect(result.metadata.charset).toBe('utf-8');
      expect(result.metadata.title).toBe('Test Page');
      expect(result.metadata.description).toBe('Test description');
      expect(result.metadata.canonicalUrl).toBe('https://example.com/canonical');

      // Check OpenGraph metadata
      expect(result.metadata.openGraph).toBeDefined();
      expect(result.metadata.openGraph.title).toBe('OG Test Title');
      expect(result.metadata.openGraph.description).toBe('OG Test Description');
      expect(result.metadata.openGraph.image).toBe('https://example.com/og-image.jpg');

      // Check Twitter Card metadata
      expect(result.metadata.twitterCard).toBeDefined();
      expect(result.metadata.twitterCard.card).toBe('summary_large_image');
      expect(result.metadata.twitterCard.title).toBe('Twitter Test Title');

      // Check response headers
      expect(result.metadata.responseHeaders).toBeDefined();
      expect(result.metadata.responseHeaders['content-type']).toBe('text/html; charset=utf-8');
      expect(result.metadata.responseHeaders['cache-control']).toBe('max-age=3600');
    });

    it('should include robots.txt summary at top of response', async () => {
      const { robotsChecker } = await import('../../utils/robotsChecker.js');

      (robotsChecker.isAllowed as any).mockResolvedValue({
        allowed: true,
        reason: 'URL is allowed',
        matchedRules: ['Allow: /api'],
        crawlDelay: 5,
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        url: 'https://example.com/api',
        headers: {
          get: () => 'text/html',
        },
        text: async () => '<html><body>Content</body></html>',
      });

      const result = await webFetchTool.execute({
        url: 'https://example.com/api',
        userAgent: 'TestBot/1.0',
      });

      expect(result.robotsTxt).toBeDefined();
      expect(result.robotsTxt.allowed).toBe(true);
      expect(result.robotsTxt.rulesMatched).toEqual(['Allow: /api']);
      expect(result.robotsTxt.crawlDelay).toBe(5);
      expect(result.robotsTxt.note).toContain('respects robots.txt');
    });

    it('should handle redirects correctly', async () => {
      const { robotsChecker } = await import('../../utils/robotsChecker.js');

      (robotsChecker.isAllowed as any).mockResolvedValue({
        allowed: true,
        reason: 'URL is allowed',
        matchedRules: [],
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        url: 'https://example.com/final-page', // Different from requested URL
        headers: {
          get: () => 'text/html',
        },
        text: async () => '<html><title>Final Page</title><body>Content</body></html>',
      });

      const result = await webFetchTool.execute({
        url: 'https://example.com/original',
        userAgent: 'TestBot/1.0',
      });

      expect(result.metadata.requestedUrl).toBe('https://example.com/original');
      expect(result.metadata.finalUrl).toBe('https://example.com/final-page');
    });
  });

  describe('Robots.txt Compliance', () => {
    it('should return robots.txt summary when URL is blocked', async () => {
      const { robotsChecker } = await import('../../utils/robotsChecker.js');

      (robotsChecker.isAllowed as any).mockResolvedValue({
        allowed: false,
        reason: 'Disallowed by robots.txt',
        robotsUrl: 'https://example.com/robots.txt',
        matchedRules: ['Disallow: /private'],
        crawlDelay: 10,
      });

      const result = await webFetchTool.execute({
        url: 'https://example.com/private/page',
        userAgent: 'TestBot/1.0',
      });

      expect(result.success).toBe(false);
      expect(result.robotsTxt).toBeDefined();
      expect(result.robotsTxt.allowed).toBe(false);
      expect(result.robotsTxt.rulesMatched).toEqual(['Disallow: /private']);
      expect(result.robotsTxt.crawlDelay).toBe(10);
      expect(result.robotsTxt.note).toContain('blocked');
    });
  });

  describe('Error Handling', () => {
    it('should include metadata in error responses', async () => {
      const { robotsChecker } = await import('../../utils/robotsChecker.js');

      (robotsChecker.isAllowed as any).mockResolvedValue({
        allowed: true,
        reason: 'URL is allowed',
        matchedRules: [],
      });

      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        url: 'https://example.com/notfound',
        headers: {
          get: (name: string) => {
            if (name === 'content-type') return 'text/html';
            return null;
          },
        },
      });

      const result = await webFetchTool.execute({
        url: 'https://example.com/notfound',
        userAgent: 'TestBot/1.0',
      });

      expect(result.success).toBe(false);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.httpStatus).toBe(404);
      expect(result.metadata.requestedUrl).toBe('https://example.com/notfound');
    });

    it('should handle fetch exceptions', async () => {
      const { robotsChecker } = await import('../../utils/robotsChecker.js');

      (robotsChecker.isAllowed as any).mockResolvedValue({
        allowed: true,
        reason: 'URL is allowed',
        matchedRules: [],
      });

      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await webFetchTool.execute({
        url: 'https://example.com/error',
        userAgent: 'TestBot/1.0',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('exception');
      expect(result.message).toContain('Network error');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.requestedUrl).toBe('https://example.com/error');
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain backward compatibility fields', async () => {
      const { robotsChecker } = await import('../../utils/robotsChecker.js');

      (robotsChecker.isAllowed as any).mockResolvedValue({
        allowed: true,
        reason: 'URL is allowed',
        matchedRules: [],
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        url: 'https://example.com/page',
        headers: {
          get: () => 'text/html',
        },
        text: async () => '<html><body>Test content</body></html>',
      });

      const result = await webFetchTool.execute({
        url: 'https://example.com/page',
        userAgent: 'TestBot/1.0',
      });

      // Check that backward compatibility fields exist
      expect(result.url).toBe('https://example.com/page');
      expect(result.content).toBeDefined();
      expect(result.contentType).toBe('text/html');
      expect(result.robotsCompliant).toBe(true);
      expect(result.message).toBeDefined();
    });
  });

  describe('Non-HTML Content', () => {
    it('should handle JSON content without metadata extraction', async () => {
      const { robotsChecker } = await import('../../utils/robotsChecker.js');

      (robotsChecker.isAllowed as any).mockResolvedValue({
        allowed: true,
        reason: 'URL is allowed',
        matchedRules: [],
      });

      const jsonContent = '{"key": "value"}';

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        url: 'https://api.example.com/data',
        headers: {
          get: (name: string) => {
            if (name === 'content-type') return 'application/json';
            return null;
          },
        },
        text: async () => jsonContent,
      });

      const result = await webFetchTool.execute({
        url: 'https://api.example.com/data',
        userAgent: 'TestBot/1.0',
      });

      expect(result.success).toBe(true);
      expect(result.metadata.contentType).toBe('application/json');
      // No HTML metadata should be extracted
      expect(result.metadata.title).toBeUndefined();
      expect(result.metadata.openGraph).toBeUndefined();
    });
  });

  describe('Raw HTML Mode', () => {
    it('should return unmodified HTML in raw mode', async () => {
      const { robotsChecker } = await import('../../utils/robotsChecker.js');

      (robotsChecker.isAllowed as any).mockResolvedValue({
        allowed: true,
        reason: 'URL is allowed',
        matchedRules: [],
      });

      const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <title>Test Page</title>
    <script>console.log('test');</script>
    <style>body { color: red; }</style>
  </head>
  <body>
    <h1>Test Content</h1>
    <p>This is test content.</p>
  </body>
</html>`;

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        url: 'https://example.com/page',
        headers: {
          get: (name: string) => {
            if (name === 'content-type') return 'text/html';
            return null;
          },
        },
        text: async () => htmlContent,
      });

      const result = await webFetchTool.execute({
        url: 'https://example.com/page',
        userAgent: 'TestBot/1.0',
        mode: 'raw',
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('raw');
      expect(result.body).toBe(htmlContent);
      expect(result.content).toBe(htmlContent);
      // Should contain all HTML including scripts and styles
      expect(result.body).toContain('<script>');
      expect(result.body).toContain('<style>');
      expect(result.body).toContain('<!DOCTYPE html>');
      expect(result.message).toContain('raw HTML');
    });

    it('should strip HTML in parsed mode (default)', async () => {
      const { robotsChecker } = await import('../../utils/robotsChecker.js');

      (robotsChecker.isAllowed as any).mockResolvedValue({
        allowed: true,
        reason: 'URL is allowed',
        matchedRules: [],
      });

      const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <title>Test Page</title>
    <script>console.log('test');</script>
    <style>body { color: red; }</style>
  </head>
  <body>
    <h1>Test Content</h1>
    <p>This is test content.</p>
  </body>
</html>`;

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        url: 'https://example.com/page',
        headers: {
          get: (name: string) => {
            if (name === 'content-type') return 'text/html';
            return null;
          },
        },
        text: async () => htmlContent,
      });

      const result = await webFetchTool.execute({
        url: 'https://example.com/page',
        userAgent: 'TestBot/1.0',
        mode: 'parsed',
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('parsed');
      // Should NOT contain HTML tags
      expect(result.body).not.toContain('<script>');
      expect(result.body).not.toContain('<style>');
      expect(result.body).not.toContain('<h1>');
      // Should contain text content
      expect(result.body).toContain('Test Content');
      expect(result.body).toContain('This is test content');
    });

    it('should not truncate content in raw mode', async () => {
      const { robotsChecker } = await import('../../utils/robotsChecker.js');

      (robotsChecker.isAllowed as any).mockResolvedValue({
        allowed: true,
        reason: 'URL is allowed',
        matchedRules: [],
      });

      // Create HTML content longer than 5000 chars
      const longHtml = `<!DOCTYPE html><html><body>${'x'.repeat(10000)}</body></html>`;

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        url: 'https://example.com/long-page',
        headers: {
          get: (name: string) => {
            if (name === 'content-type') return 'text/html';
            return null;
          },
        },
        text: async () => longHtml,
      });

      const result = await webFetchTool.execute({
        url: 'https://example.com/long-page',
        userAgent: 'TestBot/1.0',
        mode: 'raw',
      });

      expect(result.success).toBe(true);
      expect(result.body.length).toBeGreaterThan(5000);
      expect(result.body).toBe(longHtml);
      expect(result.body).not.toContain('truncated');
    });
  });
});
