/**
 * Create Page Tool
 * Creates a named page route with theming support
 */

import { tool } from 'ai';
import { z } from 'zod';
import { setRoute, isValidSlug } from '../../lib/router.js';

const serverUrl = process.env.ARTIFACT_SERVER_URL
  || (process.env.NODE_ENV === 'production'
    ? 'https://omegaai.dev'
    : 'http://localhost:3001');

export const createPageTool = tool({
  description: `Create a named page with a clean URL slug (e.g., /pages/about, /pages/features).
This is ideal for creating permanent pages with SEO-friendly URLs, unlike artifacts which use UUIDs.
Pages support both HTML and Markdown content and use the site's theming system for consistent styling.

Use this when:
- Creating an "About" page, "Features" page, or similar permanent content
- You want a clean, memorable URL instead of a UUID
- You want consistent site-wide theming and navigation
- Content should be part of the main site structure

DO NOT use this for:
- Interactive HTML demos or experiments (use artifact tool instead)
- Temporary or one-off content (use artifact tool instead)
- Standalone applications (use artifact tool instead)`,

  parameters: z.object({
    slug: z.string().describe('URL-friendly slug (lowercase, alphanumeric with hyphens, e.g., "about-us", "features")'),
    title: z.string().describe('Page title'),
    description: z.string().optional().describe('Page description (for meta tags and header)'),
    content: z.string().describe('Page content (HTML or Markdown)'),
    contentType: z.enum(['html', 'markdown']).describe('Content format'),
  }),

  execute: async ({ slug, title, description, content, contentType }) => {
    try {
      // Validate slug format
      if (!isValidSlug(slug)) {
        return {
          success: false,
          error: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only (e.g., "about-us", "contact-page").',
        };
      }

      // Create the route
      setRoute({
        slug,
        title,
        description,
        content,
        contentType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const pageUrl = `${serverUrl}/pages/${slug}`;

      return {
        success: true,
        pageUrl,
        slug,
        message: `✅ Page created successfully! View it at: ${pageUrl}`,
      };
    } catch (error) {
      console.error('Error creating page:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating page',
      };
    }
  },
});
