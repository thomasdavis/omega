/**
 * List Blog Posts Tool - List all existing blog posts with their metadata
 * Helps users find blog post slugs for updating or reference
 */

import { tool } from 'ai';
import { z } from 'zod';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getBlogDir } from '../../utils/storage.js';

// Blog content directory - uses persistent storage in production
const BLOG_DIR = getBlogDir();

interface BlogPostInfo {
  slug: string;
  title: string;
  date: string;
  tts: boolean;
  ttsVoice: string;
  contentLength: number;
}

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content: string): {
  frontmatter: Record<string, any>;
  body: string;
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const [, frontmatterText, body] = match;
  const frontmatter: Record<string, any> = {};

  // Parse YAML-like frontmatter
  frontmatterText.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > -1) {
      const key = line.substring(0, colonIndex).trim();
      let value: string | boolean = line.substring(colonIndex + 1).trim();

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Parse booleans
      if (value === 'true') value = true;
      if (value === 'false') value = false;

      frontmatter[key] = value;
    }
  });

  return { frontmatter, body };
}

/**
 * Get all blog posts with their metadata
 */
function listBlogPosts(): BlogPostInfo[] {
  if (!existsSync(BLOG_DIR)) {
    console.warn(`Blog directory not found: ${BLOG_DIR}`);
    return [];
  }

  const files = readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));
  const posts: BlogPostInfo[] = [];

  files.forEach(filename => {
    try {
      const filepath = join(BLOG_DIR, filename);
      const content = readFileSync(filepath, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);

      const slug = filename.replace(/\.md$/, '');

      posts.push({
        slug,
        title: frontmatter.title || slug,
        date: frontmatter.date || 'Unknown',
        tts: frontmatter.tts === true,
        ttsVoice: frontmatter.ttsVoice || 'bm_fable',
        contentLength: body.length,
      });
    } catch (error) {
      console.error(`Error reading blog post ${filename}:`, error);
    }
  });

  // Sort by date (newest first)
  posts.sort((a, b) => {
    if (a.date === 'Unknown') return 1;
    if (b.date === 'Unknown') return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return posts;
}

export const listBlogPostsTool = tool({
  description: `List all existing blog posts with their metadata.

  This tool retrieves all blog posts from the content/blog directory and displays:
  - Slug (used for identifying posts when updating)
  - Title
  - Publication date
  - TTS status (enabled/disabled)
  - TTS voice
  - Content length

  The posts are sorted by date (newest first).

  This tool is useful when:
  - You need to find the slug of a blog post to update it
  - You want to see an overview of all available blog posts
  - You need to check TTS settings across multiple posts

  Example usage:
  - "List all blog posts"
  - "Show me the existing blog posts"
  - "What blog posts are available?"`,

  inputSchema: z.object({
    // No parameters needed - lists all posts
  }),

  execute: async () => {
    try {
      console.log('📋 Listing blog posts...');

      const posts = listBlogPosts();

      if (posts.length === 0) {
        return {
          success: true,
          count: 0,
          posts: [],
          message: 'No blog posts found in the content/blog directory.',
        };
      }

      console.log(`✅ Found ${posts.length} blog post(s)`);

      // Format posts for display
      const postsDisplay = posts.map(post => ({
        slug: post.slug,
        title: post.title,
        date: post.date,
        tts: post.tts ? 'enabled' : 'disabled',
        ttsVoice: post.ttsVoice,
        contentLength: `${post.contentLength} characters`,
      }));

      // Create a summary message
      const summaryLines = posts.map(post =>
        `• ${post.title}\n  Slug: ${post.slug}\n  Date: ${post.date}\n  TTS: ${post.tts ? 'enabled' : 'disabled'} (${post.ttsVoice})\n  Content: ${post.contentLength} characters`
      ).join('\n\n');

      return {
        success: true,
        count: posts.length,
        posts: postsDisplay,
        message: `📚 Found ${posts.length} blog post(s):\n\n${summaryLines}\n\nUse the slug (e.g., "${posts[0].slug}") with the updateBlogPost tool to edit a post.`,
      };
    } catch (error) {
      console.error('Error listing blog posts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list blog posts',
      };
    }
  },
});
