/**
 * URL Lookup Tool - Fetches and retrieves content from web pages
 * Allows the bot to access and analyze web content directly
 */

import { tool } from 'ai';
import { z } from 'zod';

// Helper function to strip HTML tags and extract readable text
function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
    .replace(/<[^>]+>/g, ' ') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

export const urlLookupTool = tool({
  description: 'Fetch and retrieve content from a URL. Supports HTML, JSON, and plain text content types.',
  parameters: z.object({
    url: z.string().url().describe('The URL to fetch content from'),
    maxLength: z.number().default(5000).describe('Maximum content length to return (default 5000 characters)'),
  }),
  execute: async ({ url, maxLength }) => {
    console.log(`🔗 Fetching URL: "${url}"`);

    try {
      // Security: Only allow http/https protocols
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return {
          error: 'Invalid protocol. Only HTTP and HTTPS URLs are allowed.',
          url,
        };
      }

      // Security: Block localhost and internal IPs
      const hostname = parsedUrl.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.') ||
        hostname === '[::1]'
      ) {
        return {
          error: 'Cannot fetch content from localhost or internal network addresses.',
          url,
        };
      }

      // Fetch the URL with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OmegaBot/1.0; +https://github.com/thomasdavis/omega)',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          error: `HTTP ${response.status}: ${response.statusText}`,
          url,
          status: response.status,
        };
      }

      const contentType = response.headers.get('content-type') || '';
      let content: string;

      // Handle different content types
      if (contentType.includes('application/json')) {
        const json = await response.json();
        content = JSON.stringify(json, null, 2);
      } else if (contentType.includes('text/html')) {
        const html = await response.text();
        content = htmlToText(html);
      } else {
        content = await response.text();
      }

      // Truncate if needed
      if (content.length > maxLength) {
        content = content.substring(0, maxLength) + '\n\n[Content truncated...]';
      }

      console.log(`✅ Successfully fetched ${content.length} characters from ${url}`);

      return {
        url,
        contentType,
        content,
        contentLength: content.length,
        success: true,
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error(`❌ Error fetching URL:`, error.message);
        return {
          error: error.name === 'AbortError'
            ? 'Request timeout - the URL took too long to respond (>10s)'
            : `Failed to fetch URL: ${error.message}`,
          url,
        };
      }
      return {
        error: 'Unknown error occurred while fetching URL',
        url,
      };
    }
  },
});
