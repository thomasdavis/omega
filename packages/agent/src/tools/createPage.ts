/**
 * Create Page Tool - Create named pages with SEO-friendly URLs
 * Allows creating pages via Discord that appear at /pages/:slug
 */

import { tool } from 'ai';
import { z } from 'zod';

// Import from bot package - these will be available at runtime
// We're in the agent package but creating pages in the bot's webserver
let setRoute: any;
let isValidSlug: any;

// Dynamically import at runtime to avoid circular dependencies
async function ensureRouterImported() {
  if (!setRoute) {
    const module = await import('../../../apps/bot/src/lib/router.js');
    setRoute = module.setRoute;
    isValidSlug = module.isValidSlug;
  }
}

export const createPageTool = tool({
  description: `Create a new named page with an SEO-friendly URL on the website.

  Perfect for creating About pages, Features pages, Documentation, or any content that should have a permanent, readable URL like /pages/about instead of a UUID-based artifact URL.

  Pages are automatically themed and include navigation to other pages.

  Examples:
  - slug: "about" → https://omegaai.dev/pages/about
  - slug: "features" → https://omegaai.dev/pages/features
  - slug: "contact" → https://omegaai.dev/pages/contact

  Use this instead of the artifact tool when creating pages that should be permanent parts of the website structure.`,

  inputSchema: z.object({
    slug: z.string().describe('URL-friendly slug (e.g., "about", "features", "contact"). Use only lowercase letters, numbers, hyphens, and underscores.'),
    title: z.string().describe('Page title (displayed as H1 and in browser tab)'),
    content: z.string().describe('Page content (HTML or Markdown)'),
    contentType: z.enum(['html', 'markdown']).default('markdown').describe('Content format (default: markdown)'),
    theme: z.enum(['default', 'blog']).optional().describe('Visual theme for the page (default: tactical green theme, blog: clean readable theme)'),
  }),

  execute: async ({ slug, title, content, contentType, theme }) => {
    try {
      // Ensure router functions are imported
      await ensureRouterImported();

      // Validate slug format
      if (!isValidSlug(slug)) {
        return {
          success: false,
          error: `Invalid slug format: "${slug}". Use only lowercase letters, numbers, hyphens, and underscores.`,
        };
      }

      // Create route
      const now = new Date().toISOString();
      setRoute({
        slug,
        title,
        content,
        contentType,
        theme: theme || 'default',
        createdAt: now,
        updatedAt: now,
      });

      // Generate URL
      const serverUrl = process.env.ARTIFACT_SERVER_URL
        || (process.env.NODE_ENV === 'production' ? 'https://omegaai.dev' : 'http://localhost:3001');
      const pageUrl = `${serverUrl}/pages/${slug}`;

      return {
        success: true,
        slug,
        title,
        pageUrl,
        message: `Page created! View it at: ${pageUrl}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create page',
      };
    }
  },
});
