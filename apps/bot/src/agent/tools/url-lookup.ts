/**
 * URL Lookup Tool - Fetches and retrieves content from URLs
 * Supports HTML (converted to readable text), JSON, and plain text
 */

import { tool } from 'ai';
import { z } from 'zod';

/**
 * Simple HTML to text converter
 * Removes script/style tags and converts HTML to readable text
 */
function htmlToText(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Validate URL to prevent potential security issues
 */
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }
    // Prevent localhost and internal network access
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export const urlLookupTool = tool({
  description: 'Fetch and retrieve the content from a URL. Supports web pages (HTML), JSON APIs, and plain text. The tool will convert HTML to readable text automatically.',
  parameters: z.object({
    url: z.string().url().describe('The URL to fetch content from (must be http or https)'),
    maxLength: z.number().default(5000).describe('Maximum content length to return (default 5000 characters)'),
  }),
  execute: async ({ url, maxLength }) => {
    console.log(`🔗 Fetching URL: ${url}`);

    // Validate URL
    if (!isValidUrl(url)) {
      return {
        success: false,
        error: 'Invalid URL. Only http/https URLs to public hosts are allowed.',
        url,
      };
    }

    try {
      // Fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OmegaBot/1.0)',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          url,
          statusCode: response.status,
        };
      }

      // Get content type
      const contentType = response.headers.get('content-type') || '';
      let content = '';
      let processedContent = '';

      // Handle different content types
      if (contentType.includes('application/json')) {
        const json = await response.json();
        content = JSON.stringify(json, null, 2);
        processedContent = content.substring(0, maxLength);

        return {
          success: true,
          url,
          contentType: 'json',
          content: processedContent,
          truncated: content.length > maxLength,
          originalLength: content.length,
        };
      } else if (contentType.includes('text/html')) {
        const html = await response.text();
        const text = htmlToText(html);
        processedContent = text.substring(0, maxLength);

        return {
          success: true,
          url,
          contentType: 'html',
          content: processedContent,
          truncated: text.length > maxLength,
          originalLength: text.length,
        };
      } else {
        // Plain text or other
        content = await response.text();
        processedContent = content.substring(0, maxLength);

        return {
          success: true,
          url,
          contentType: 'text',
          content: processedContent,
          truncated: content.length > maxLength,
          originalLength: content.length,
        };
      }
    } catch (error) {
      console.error(`Error fetching URL: ${error}`);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout (10 seconds exceeded)',
            url,
          };
        }

        return {
          success: false,
          error: error.message,
          url,
        };
      }

      return {
        success: false,
        error: 'Unknown error occurred while fetching URL',
        url,
      };
    }
  },
});
