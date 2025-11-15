/**
 * Web Fetch Tool - Fetches web page content with robots.txt compliance
 * Respects robots.txt rules before scraping any website
 */

import { tool } from 'ai';
import { z } from 'zod';
import { robotsChecker } from '../../utils/robotsChecker.js';

export const webFetchTool = tool({
  description: 'Fetch the content of a web page. Automatically checks robots.txt compliance before fetching. Use this to retrieve information from specific URLs.',
  parameters: z.object({
    url: z.string().url().describe('The URL to fetch content from'),
    userAgent: z.string().default('OmegaBot/1.0').describe('User agent string to use (default: OmegaBot/1.0)'),
  }),
  // @ts-ignore - AI SDK beta.99 type mismatch
  execute: async ({ url, userAgent }) => {
    console.log(`🌐 Fetching URL: ${url}`);

    try {
      // Step 1: Check robots.txt compliance
      console.log(`🤖 Checking robots.txt compliance for: ${url}`);
      const robotsCheck = await robotsChecker.isAllowed(url, userAgent);

      if (!robotsCheck.allowed) {
        console.log(`❌ URL blocked by robots.txt: ${url}`);
        return {
          success: false,
          error: 'robots_txt_disallowed',
          message: `This URL is disallowed by the website's robots.txt file. Respecting the website's policy and not fetching.`,
          url,
          robotsUrl: robotsCheck.robotsUrl,
          reason: robotsCheck.reason,
        };
      }

      console.log(`✅ robots.txt check passed: ${robotsCheck.reason}`);

      // Step 2: Fetch the page content
      console.log(`📥 Fetching content from: ${url}`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        return {
          success: false,
          error: 'fetch_failed',
          message: `Failed to fetch URL: ${response.status} ${response.statusText}`,
          url,
          statusCode: response.status,
        };
      }

      // Get the content
      const contentType = response.headers.get('content-type') || '';
      const isHtml = contentType.includes('text/html');
      const content = await response.text();

      // Basic content extraction (strip HTML tags for now)
      let extractedContent = content;
      if (isHtml) {
        // Simple HTML stripping - in production, consider using a proper HTML parser
        extractedContent = content
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
          .replace(/<[^>]+>/g, ' ') // Remove HTML tags
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
      }

      // Limit content length to avoid token overflow
      const maxLength = 5000;
      if (extractedContent.length > maxLength) {
        extractedContent = extractedContent.substring(0, maxLength) + '... (content truncated)';
      }

      console.log(`✅ Successfully fetched ${extractedContent.length} characters from ${url}`);

      return {
        success: true,
        url,
        content: extractedContent,
        contentType,
        contentLength: extractedContent.length,
        robotsCompliant: true,
        message: 'Successfully fetched page content while respecting robots.txt rules.',
      };
    } catch (error) {
      console.error(`❌ Error fetching URL ${url}:`, error);
      return {
        success: false,
        error: 'exception',
        message: `Error fetching URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        url,
      };
    }
  },
});
