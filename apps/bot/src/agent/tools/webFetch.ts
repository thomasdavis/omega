/**
 * Web Fetch Tool - Fetches and extracts content from web pages
 * Respects robots.txt rules before scraping
 */

import { tool } from 'ai';
import { z } from 'zod';
import { canScrapeUrl } from '../../utils/robotsChecker.js';

/**
 * Extract text content from HTML
 * Simple implementation - can be enhanced with a proper HTML parser
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

export const webFetchTool = tool({
  description: 'Fetch and extract text content from a web page. Automatically checks robots.txt compliance before scraping. Use this to get information from websites.',
  parameters: z.object({
    url: z.string().url().describe('The URL of the web page to fetch'),
    maxLength: z.number().optional().default(5000).describe('Maximum length of content to return (default 5000 characters)'),
  }),
  execute: async ({ url, maxLength }) => {
    console.log(`🌐 Fetching web page: ${url}`);

    try {
      // Check robots.txt compliance
      const robotsCheck = await canScrapeUrl(url);

      if (!robotsCheck.allowed) {
        return {
          success: false,
          error: 'Robots.txt check failed',
          message: robotsCheck.reason || 'This URL is blocked by robots.txt rules',
          url,
        };
      }

      console.log('✅ Robots.txt check passed');

      // Fetch the page
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'OmegaBot/1.0 (Discord Bot; +https://github.com/thomasdavis/omega)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        // Set a timeout
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return {
          success: false,
          error: 'HTTP error',
          statusCode: response.status,
          statusText: response.statusText,
          url,
        };
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
        return {
          success: false,
          error: 'Unsupported content type',
          contentType,
          message: 'Only HTML and plain text pages are supported',
          url,
        };
      }

      const html = await response.text();
      let content = contentType.includes('text/html')
        ? extractTextFromHtml(html)
        : html;

      // Truncate if too long
      if (content.length > maxLength) {
        content = content.substring(0, maxLength) + '... (truncated)';
      }

      return {
        success: true,
        url,
        title: html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || 'No title',
        content,
        contentLength: content.length,
        note: 'Content extracted successfully. This tool respects robots.txt rules.',
      };
    } catch (error) {
      console.error('Error fetching web page:', error);

      if (error instanceof Error) {
        return {
          success: false,
          error: error.name,
          message: error.message,
          url,
        };
      }

      return {
        success: false,
        error: 'Unknown error',
        message: 'Failed to fetch web page',
        url,
      };
    }
  },
});
