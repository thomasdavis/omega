/**
 * Update Blog Post Tool - Update existing TTS-enabled blog posts
 * Allows users to update content, frontmatter, or TTS settings for existing blog posts
 */

import { tool } from 'ai';
import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getBlogDir } from '../../utils/storage.js';

// Blog content directory - uses persistent storage in production
const BLOG_DIR = getBlogDir();

// Available TTS voices (examples - expand as needed)
const TTS_VOICES = [
  'bm_fable',
  'bm_alloy',
  'bm_echo',
  'bm_onyx',
  'bm_nova',
  'bm_shimmer',
] as const;

interface BlogPostMetadata {
  title: string;
  date: string;
  tts: boolean;
  ttsVoice: string;
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

/**
 * Validate YAML frontmatter structure
 */
function validateFrontmatter(frontmatter: Record<string, any>): { valid: boolean; reason?: string } {
  // Check required fields
  if (!frontmatter.title || typeof frontmatter.title !== 'string') {
    return {
      valid: false,
      reason: 'Frontmatter must include a valid "title" field',
    };
  }

  if (!frontmatter.date || typeof frontmatter.date !== 'string') {
    return {
      valid: false,
      reason: 'Frontmatter must include a valid "date" field',
    };
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(frontmatter.date)) {
    return {
      valid: false,
      reason: 'Date must be in YYYY-MM-DD format',
    };
  }

  // Validate TTS settings if present
  if (frontmatter.tts !== undefined && typeof frontmatter.tts !== 'boolean') {
    return {
      valid: false,
      reason: 'TTS field must be a boolean (true/false)',
    };
  }

  if (frontmatter.ttsVoice !== undefined && typeof frontmatter.ttsVoice !== 'string') {
    return {
      valid: false,
      reason: 'TTS voice field must be a string',
    };
  }

  return { valid: true };
}

/**
 * Update an existing blog post
 */
function updateBlogPost(
  slug: string,
  updates: {
    title?: string;
    content?: string;
    tts?: boolean;
    ttsVoice?: string;
    date?: string;
  }
): { success: boolean; filepath: string; url: string; error?: string } {
  const filename = slug.endsWith('.md') ? slug : `${slug}.md`;
  const filepath = join(BLOG_DIR, filename);

  // Check if file exists
  if (!existsSync(filepath)) {
    return {
      success: false,
      filepath,
      url: '',
      error: `Blog post not found: ${slug}. Make sure to use the full slug (e.g., "2025-11-20-example-post")`,
    };
  }

  try {
    // Read existing content
    const existingContent = readFileSync(filepath, 'utf-8');
    const { frontmatter: existingFrontmatter, body: existingBody } = parseFrontmatter(existingContent);

    // Merge updates with existing metadata
    const updatedMetadata: BlogPostMetadata = {
      title: updates.title !== undefined ? updates.title : existingFrontmatter.title,
      date: updates.date !== undefined ? updates.date : existingFrontmatter.date,
      tts: updates.tts !== undefined ? updates.tts : (existingFrontmatter.tts === true),
      ttsVoice: updates.ttsVoice !== undefined ? updates.ttsVoice : (existingFrontmatter.ttsVoice || 'bm_fable'),
    };

    // Use updated content or keep existing
    const updatedBody = updates.content !== undefined ? updates.content : existingBody;

    // Validate the updated content
    const contentValidation = validateMarkdownContent(updatedBody);
    if (!contentValidation.valid) {
      return {
        success: false,
        filepath,
        url: '',
        error: `Content validation failed: ${contentValidation.reason}`,
      };
    }

    // Validate the updated frontmatter
    const frontmatterValidation = validateFrontmatter(updatedMetadata);
    if (!frontmatterValidation.valid) {
      return {
        success: false,
        filepath,
        url: '',
        error: `Frontmatter validation failed: ${frontmatterValidation.reason}`,
      };
    }

    // Create updated frontmatter
    const frontmatter = createFrontmatter(updatedMetadata);

    // Combine frontmatter and content
    const fullContent = `${frontmatter}

${updatedBody}`;

    // Write updated file
    writeFileSync(filepath, fullContent, 'utf-8');

    // Generate blog URL
    const postSlug = filename.replace(/\.md$/, '');
    const serverUrl = process.env.ARTIFACT_SERVER_URL
      || (process.env.NODE_ENV === 'production' ? 'https://omega-production-5b33.up.railway.app' : 'http://localhost:3001');
    const blogUrl = `${serverUrl}/blog/${postSlug}`;

    return {
      success: true,
      filepath,
      url: blogUrl,
    };
  } catch (error) {
    return {
      success: false,
      filepath,
      url: '',
      error: error instanceof Error ? error.message : 'Failed to update blog post',
    };
  }
}

export const updateBlogPostTool = tool({
  description: `Update an existing TTS-enabled blog post in the blog folder.

  This tool allows you to update existing blog posts by specifying their slug.
  You can update any combination of:
  - title: The blog post title
  - content: The markdown content (without frontmatter)
  - date: Publication date (YYYY-MM-DD format)
  - tts: Enable/disable text-to-speech (true/false)
  - ttsVoice: Voice to use for TTS playback

  The slug is the filename without the .md extension (e.g., "2025-11-20-example-post").
  You can find existing blog post slugs by checking the content/blog directory.

  Only the fields you specify will be updated - all other fields will remain unchanged.

  This tool validates:
  - Markdown content is not empty and has minimum length
  - YAML frontmatter is properly formatted
  - Date format is YYYY-MM-DD
  - TTS settings are valid

  Available TTS voices: ${TTS_VOICES.join(', ')}

  Example usage:
  - "Update the blog post 2025-11-20-example-post with new content"
  - "Change the TTS voice to bm_nova for the post about TypeScript"
  - "Update the title and enable TTS for yesterday's blog post"`,

  inputSchema: z.object({
    slug: z.string().describe('The slug of the blog post to update (e.g., "2025-11-20-example-post")'),
    title: z.string().optional().describe('Updated title for the blog post'),
    content: z.string().optional().describe('Updated markdown content (without frontmatter)'),
    date: z.string().optional().describe('Updated publication date (YYYY-MM-DD format)'),
    tts: z.boolean().optional().describe('Enable/disable text-to-speech'),
    ttsVoice: z.enum(TTS_VOICES).optional().describe('Voice to use for TTS playback'),
  }),

  execute: async ({ slug, title, content, date, tts, ttsVoice }) => {
    try {
      console.log('📝 Updating blog post:', slug);

      // Prepare updates object
      const updates: {
        title?: string;
        content?: string;
        tts?: boolean;
        ttsVoice?: string;
        date?: string;
      } = {};

      if (title !== undefined) updates.title = title;
      if (content !== undefined) updates.content = content;
      if (date !== undefined) updates.date = date;
      if (tts !== undefined) updates.tts = tts;
      if (ttsVoice !== undefined) updates.ttsVoice = ttsVoice;

      // Check if any updates were provided
      if (Object.keys(updates).length === 0) {
        return {
          success: false,
          error: 'No updates provided. Please specify at least one field to update (title, content, date, tts, or ttsVoice).',
        };
      }

      // Update the blog post
      const result = updateBlogPost(slug, updates);

      if (!result.success) {
        console.error('❌ Blog post update failed:', result.error);
        return {
          success: false,
          error: result.error,
        };
      }

      console.log('✅ Blog post updated:', slug);

      // Build a summary of what was updated
      const updatedFields = Object.keys(updates).join(', ');

      return {
        success: true,
        slug,
        filepath: result.filepath,
        url: result.url,
        updatedFields,
        message: `✨ Blog post updated successfully!\n\nSlug: ${slug}\nURL: ${result.url}\nFile: ${result.filepath}\nUpdated fields: ${updatedFields}\n\nThe blog renderer will automatically pick up these changes.`,
      };
    } catch (error) {
      console.error('Error updating blog post:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update blog post',
      };
    }
  },
});
