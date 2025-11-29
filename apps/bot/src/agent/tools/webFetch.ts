/**
 * Web Fetch Tool - Fetches web page content with robots.txt compliance
 * Respects robots.txt rules before scraping any website
 */

import { tool } from 'ai';
import { z } from 'zod';
import { robotsChecker } from '../../utils/robotsChecker.js';
import { extractHtmlMetadata, truncateMetadata } from '../../utils/htmlMetadata.js';

export const webFetchTool = tool({
  description: 'Fetch the content of a web page. Automatically checks robots.txt compliance before fetching and follows HTTP redirects (up to 10 hops). Use this to retrieve information from specific URLs. Supports raw HTML mode for debugging and validation.',
  inputSchema: z.object({
    url: z.string().url().describe('The URL to fetch content from'),
    userAgent: z.string().default('OmegaBot/1.0').describe('User agent string to use (default: OmegaBot/1.0)'),
    mode: z.enum(['parsed', 'raw']).default('parsed').describe('Mode: "parsed" strips HTML tags and extracts text (default), "raw" returns unmodified HTML for debugging/linting'),
    maxRedirects: z.number().min(0).max(20).default(10).describe('Maximum number of redirects to follow (default: 10)'),
  }),
  execute: async ({ url, userAgent, mode, maxRedirects }) => {
    console.log(`🌐 Fetching URL: ${url} (mode: ${mode}, maxRedirects: ${maxRedirects})`);

    try {
      // Step 1: Check robots.txt compliance for the initial URL
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

      // Step 2: Follow redirects manually to track the chain and check robots.txt on final URL
      let currentUrl = url;
      const redirectChain: Array<{ from: string; to: string; status: number }> = [];
      let response: Response;
      let redirectCount = 0;

      while (redirectCount <= maxRedirects) {
        console.log(`📥 Fetching content from: ${currentUrl} (redirect ${redirectCount}/${maxRedirects})`);

        response = await fetch(currentUrl, {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          redirect: 'manual', // Handle redirects manually
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        // Check if this is a redirect response (3xx)
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');

          if (!location) {
            return {
              success: false,
              error: 'redirect_without_location',
              message: `Server returned redirect status ${response.status} but no Location header`,
              metadata: {
                requestedUrl: url,
                currentUrl,
                httpStatus: response.status,
                redirectChain,
              },
              robotsTxt: {
                allowed: true,
                rulesMatched: robotsCheck.matchedRules || [],
                crawlDelay: robotsCheck.crawlDelay,
                note: 'This fetch respects robots.txt. The resource was allowed but redirect failed.',
              },
              url,
            };
          }

          // Resolve relative URLs
          const nextUrl = new URL(location, currentUrl).toString();

          redirectChain.push({
            from: currentUrl,
            to: nextUrl,
            status: response.status,
          });

          console.log(`↪️  Redirect ${response.status}: ${currentUrl} → ${nextUrl}`);

          currentUrl = nextUrl;
          redirectCount++;

          // Check if we've exceeded max redirects
          if (redirectCount > maxRedirects) {
            return {
              success: false,
              error: 'too_many_redirects',
              message: `Exceeded maximum redirects (${maxRedirects}). Possible redirect loop.`,
              metadata: {
                requestedUrl: url,
                finalUrl: currentUrl,
                httpStatus: response.status,
                redirectChain,
                redirectCount,
              },
              robotsTxt: {
                allowed: true,
                rulesMatched: robotsCheck.matchedRules || [],
                crawlDelay: robotsCheck.crawlDelay,
                note: 'This fetch respects robots.txt. Too many redirects encountered.',
              },
              url,
            };
          }

          continue; // Fetch the next URL in the chain
        }

        // Not a redirect, break the loop
        break;
      }

      // Step 3: Check robots.txt compliance on the final URL (if different from initial)
      if (currentUrl !== url) {
        console.log(`🤖 Checking robots.txt compliance for final URL: ${currentUrl}`);
        const finalRobotsCheck = await robotsChecker.isAllowed(currentUrl, userAgent);

        if (!finalRobotsCheck.allowed) {
          console.log(`❌ Final URL blocked by robots.txt: ${currentUrl}`);
          return {
            success: false,
            error: 'final_url_robots_txt_disallowed',
            message: `The final URL (after redirects) is disallowed by robots.txt. Respecting the website's policy.`,
            metadata: {
              requestedUrl: url,
              finalUrl: currentUrl,
              httpStatus: null,
              redirectChain,
            },
            robotsTxt: {
              allowed: false,
              rulesMatched: finalRobotsCheck.matchedRules || [],
              crawlDelay: finalRobotsCheck.crawlDelay,
              note: 'This fetch respects robots.txt. The final URL (after redirects) was blocked.',
            },
            url,
            robotsUrl: finalRobotsCheck.robotsUrl,
            reason: finalRobotsCheck.reason,
          };
        }

        console.log(`✅ Final URL robots.txt check passed: ${finalRobotsCheck.reason}`);
      }

      // Step 4: Check if the final response is successful
      if (!response.ok) {
        return {
          success: false,
          error: 'fetch_failed',
          message: `Failed to fetch URL: ${response.status} ${response.statusText}`,
          metadata: {
            requestedUrl: url,
            finalUrl: currentUrl,
            httpStatus: response.status,
            contentType: response.headers.get('content-type') || undefined,
            contentLength: parseInt(response.headers.get('content-length') || '0') || undefined,
            redirectChain: redirectChain.length > 0 ? redirectChain : undefined,
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

      // Content extraction based on mode
      let extractedContent = content;

      if (mode === 'raw') {
        // Raw mode: Return unmodified HTML for debugging/linting
        // No stripping, no truncation
        extractedContent = content;
      } else {
        // Parsed mode: Extract text content (default behavior)
        if (isHtml) {
          // Simple HTML stripping - in production, consider using a proper HTML parser
          extractedContent = content
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
            .replace(/<[^>]+>/g, ' ') // Remove HTML tags
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        }

        // Limit content length to avoid token overflow (only in parsed mode)
        const maxLength = 5000;
        if (extractedContent.length > maxLength) {
          extractedContent = extractedContent.substring(0, maxLength) + '... (content truncated)';
        }
      }

      console.log(`✅ Successfully fetched ${extractedContent.length} characters from ${url}`);

      // Build metadata object
      const metadata = {
        requestedUrl: url,
        finalUrl: currentUrl,
        httpStatus: response.status,
        contentType,
        contentLength,
        charset,
        ...htmlMetadata,
        redirectChain: redirectChain.length > 0 ? redirectChain : undefined,
        redirectCount: redirectChain.length,
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
        mode, // Include the mode used
        // Backward compatibility fields
        url,
        content: extractedContent,
        contentType,
        contentLength: extractedContent.length,
        robotsCompliant: true,
        message: mode === 'raw'
          ? 'Successfully fetched raw HTML content while respecting robots.txt rules. Use this for debugging, validation, or local proxying.'
          : 'Successfully fetched page content while respecting robots.txt rules.',
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
