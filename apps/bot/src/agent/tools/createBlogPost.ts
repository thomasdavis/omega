/**
 * Create Blog Post Tool - Create TTS-enabled blog posts in the correct folder format
 * Allows users to create structured blog posts with YAML frontmatter including TTS metadata
 */

import { tool } from 'ai';
import { z } from 'zod';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getBlogDir } from '../../utils/storage.js';

// Blog content directory - uses persistent storage in production
const BLOG_DIR = getBlogDir();

// Available TTS voices from UncloseAI
const TTS_VOICES = [
  'alloy',
  'echo',
  'fable',
  'onyx',
  'nova',
  'shimmer',
] as const;

interface BlogPostMetadata {
  title: string;
  date: string;
  tts: boolean;
  ttsVoice: string;
}

/**
 * Generate a URL-friendly slug from a title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Format current system date as YYYY-MM-DD
 * Always uses server's current time to ensure accurate timestamps
 */
function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Create YAML frontmatter
 */
function createFrontmatter(metadata: BlogPostMetadata): string {
  return `---
title: "${metadata.title}"
date: "${metadata.date}"
tts: ${metadata.tts}
ttsVoice: "${metadata.ttsVoice}"
---`;
}

/**
 * Save blog post to the blog directory
 * Always uses current system time for the date
 */
function saveBlogPost(
  title: string,
  content: string,
  tts: boolean,
  ttsVoice: string
): { filename: string; filepath: string; date: string } {
  // Ensure blog directory exists
  if (!existsSync(BLOG_DIR)) {
    mkdirSync(BLOG_DIR, { recursive: true });
  }

  // Generate filename from title and current date
  const slug = generateSlug(title);
  const currentDate = getCurrentDate();
  const filename = `${currentDate}-${slug}.md`;
  const filepath = join(BLOG_DIR, filename);

  // Create frontmatter
  const metadata: BlogPostMetadata = {
    title,
    date: currentDate,
    tts,
    ttsVoice,
  };
  const frontmatter = createFrontmatter(metadata);

  // Combine frontmatter and content
  const fullContent = `${frontmatter}

${content}`;

  // Write file
  writeFileSync(filepath, fullContent, 'utf-8');

  return { filename, filepath, date: currentDate };
}

/**
 * Validate markdown content
 */
function validateMarkdownContent(content: string): { valid: boolean; reason?: string } {
  // Basic validation
  if (!content || content.trim().length === 0) {
    return {
      valid: false,
      reason: 'Content cannot be empty',
    };
  }

  // Check for reasonable length
  if (content.length < 10) {
    return {
      valid: false,
      reason: 'Content is too short (minimum 10 characters)',
    };
  }

  return { valid: true };
}

export const createBlogPostTool = tool({
  description: `Create a TTS-enabled blog post in the correct blog folder format.

  This tool creates structured blog posts with YAML frontmatter that includes:
  - title: The blog post title
  - date: Publication date (YYYY-MM-DD format, automatically set to current system time)
  - tts: Enable/disable text-to-speech (true/false)
  - ttsVoice: Voice to use for TTS playback

  The blog post is automatically saved to the content/blog directory with a filename
  generated from the current date and title (e.g., 2025-11-20-my-blog-post.md).

  IMPORTANT: The date is ALWAYS set to the server's current system time to ensure accurate timestamps.

  The blog renderer will automatically pick up new posts from this directory.

  After creation, this tool returns the full absolute URL to the blog post
  (e.g., https://omegaai.dev/blog/2025-11-20-my-blog-post) for easy sharing.

  Content should be in Markdown format and can include:
  - Headings (# ## ###)
  - Images with alt text ![alt text](url)
  - Image captions in italics (*caption text*)
  - Lists, links, code blocks, etc.

  Available TTS voices: ${TTS_VOICES.join(', ')}

  Example usage:
  - "Create a blog post about TypeScript best practices"
  - "Write a TTS-enabled post about web accessibility"
  - "Generate a blog post with voice alloy about React hooks"`,

  inputSchema: z.object({
    title: z.string().describe('The title of the blog post'),
    content: z.string().describe('The markdown content of the blog post (without frontmatter - that will be added automatically)'),
    tts: z.boolean().default(true).describe('Enable text-to-speech for this post (default: true)'),
    ttsVoice: z.enum(TTS_VOICES).default('alloy').describe('Voice to use for TTS playback (default: alloy)'),
  }),

  execute: async ({ title, content, tts, ttsVoice }) => {
    try {
      console.log('📝 Creating blog post:', title);

      // Validate content
      const validation = validateMarkdownContent(content);
      if (!validation.valid) {
        console.error('❌ Content validation failed:', validation.reason);
        return {
          success: false,
          error: `Content validation failed: ${validation.reason}`,
        };
      }

      // Save the blog post (date is automatically set to current system time)
      const { filename, filepath, date } = saveBlogPost(
        title,
        content,
        tts,
        ttsVoice
      );

      console.log('✅ Blog post created:', filename);

      // Generate the blog post slug (filename without extension)
      const slug = filename.replace(/\.md$/, '');

      // Get server URL from environment or use default
      // Use ARTIFACT_SERVER_URL for consistency with other tools
      const serverUrl = process.env.ARTIFACT_SERVER_URL
        || (process.env.NODE_ENV === 'production' ? 'https://omega-production-5b33.up.railway.app' : 'http://localhost:3001');
      const blogUrl = `${serverUrl}/blog/${slug}`;

      return {
        success: true,
        title,
        filename,
        filepath,
        slug,
        url: blogUrl,
        tts,
        ttsVoice,
        date,
        message: `✨ Blog post created successfully!\n\nTitle: ${title}\nURL: ${blogUrl}\nFile: ${filename}\nPath: ${filepath}\nDate: ${date} (current system time)\nTTS: ${tts ? 'enabled' : 'disabled'}\nVoice: ${ttsVoice}\n\nThe blog renderer will automatically pick up this new post.`,
      };
    } catch (error) {
      console.error('Error creating blog post:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create blog post',
      };
    }
  },
});
