/**
 * Web Fetch Tool - Fetches web page content with robots.txt compliance
 * Respects robots.txt rules before scraping any website
 */

import { tool } from 'ai';
import { z } from 'zod';
import { robotsChecker } from '../../utils/robotsChecker.js';
import { extractHtmlMetadata, truncateMetadata } from '../../utils/htmlMetadata.js';

export const webFetchTool = tool({
  description: 'Fetch the content of a web page. Automatically checks robots.txt compliance before fetching. Use this to retrieve information from specific URLs.',
  inputSchema: z.object({
    url: z.string().url().describe('The URL to fetch content from'),
    userAgent: z.string().default('OmegaBot/1.0').describe('User agent string to use (default: OmegaBot/1.0)'),
  }),
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
          metadata: {
            requestedUrl: url,
            httpStatus: null,
          },
          robotsTxt: {
            allowed: false,
            rulesMatched: robotsCheck.matchedRules || [],
            crawlDelay: robotsCheck.crawlDelay,
            note: 'This fetch respects robots.txt and the resource was blocked according to the site\'s robots.txt rules.',
          },
          // Backward compatibility fields
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
        redirect: 'follow',
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        return {
          success: false,
          error: 'fetch_failed',
          message: `Failed to fetch URL: ${response.status} ${response.statusText}`,
          metadata: {
            requestedUrl: url,
            finalUrl: response.url,
            httpStatus: response.status,
            contentType: response.headers.get('content-type') || undefined,
            contentLength: parseInt(response.headers.get('content-length') || '0') || undefined,
          },
          robotsTxt: {
            allowed: true,
            rulesMatched: robotsCheck.matchedRules || [],
            crawlDelay: robotsCheck.crawlDelay,
            note: 'This fetch respects robots.txt. The resource was allowed but the HTTP request failed.',
          },
          // Backward compatibility fields
          url,
          statusCode: response.status,
        };
      }

      // Get the content
      const contentType = response.headers.get('content-type') || '';
      const contentLength = parseInt(response.headers.get('content-length') || '0') || undefined;
      const isHtml = contentType.includes('text/html');
      const content = await response.text();

      // Extract metadata if HTML
      let htmlMetadata: any = {};
      if (isHtml) {
        const rawMetadata = extractHtmlMetadata(content);
        htmlMetadata = truncateMetadata(rawMetadata);
      }

      // Extract charset from content-type header
      const charsetMatch = contentType.match(/charset=([^;]+)/i);
      const charset = charsetMatch ? charsetMatch[1].trim() : (htmlMetadata.charset || undefined);

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

      // Build metadata object
      const metadata = {
        requestedUrl: url,
        finalUrl: response.url,
        httpStatus: response.status,
        contentType,
        contentLength,
        charset,
        ...htmlMetadata,
        responseHeaders: {
          'content-type': response.headers.get('content-type'),
          'content-length': response.headers.get('content-length'),
          'cache-control': response.headers.get('cache-control'),
          'last-modified': response.headers.get('last-modified'),
        },
      };

      // Build robots.txt summary
      const robotsTxt = {
        allowed: true,
        rulesMatched: robotsCheck.matchedRules || [],
        crawlDelay: robotsCheck.crawlDelay,
        note: 'This fetch respects robots.txt. Some resources may be omitted if disallowed by the site\'s robots.txt rules.',
      };

      return {
        success: true,
        metadata,
        robotsTxt,
        body: extractedContent,
        // Backward compatibility fields
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
        metadata: {
          requestedUrl: url,
        },
        // Backward compatibility field
        url,
      };
    }
  },
});
