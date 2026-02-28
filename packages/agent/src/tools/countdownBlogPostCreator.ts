/**
 * Countdown Blog Post Creator Tool
 * Creates a styled blog post with countdown information for a target date.
 * The blog post includes frontmatter, a human-readable countdown, and markdown content.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getBlogDir } from '@repo/shared';

const BLOG_DIR = getBlogDir();

/**
 * Generate a URL-friendly slug from a title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Format current system date as YYYY-MM-DD
 */
function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Calculate the time remaining between now and a target date.
 * Returns a human-readable breakdown.
 */
function calculateCountdown(targetDate: Date): {
  isPast: boolean;
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  humanReadable: string;
} {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const isPast = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);

  const days = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((absDiffMs % (1000 * 60)) / 1000);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (parts.length === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);

  const timeString = parts.join(', ');
  const humanReadable = isPast ? `${timeString} ago` : `${timeString} remaining`;

  return { isPast, totalMs: absDiffMs, days, hours, minutes, seconds, humanReadable };
}

/**
 * Generate the markdown content for the countdown blog post
 */
function generateCountdownMarkdown(
  eventName: string,
  targetDate: Date,
  description: string | undefined,
  countdown: ReturnType<typeof calculateCountdown>
): string {
  const formattedTarget = targetDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const sections: string[] = [];

  if (countdown.isPast) {
    sections.push(`## ${eventName} has arrived!`);
    sections.push(`The countdown to **${eventName}** is complete! This event occurred on **${formattedTarget}**.`);
  } else {
    sections.push(`## Countdown to ${eventName}`);
    sections.push(`**${countdown.humanReadable}** until **${eventName}**!`);
    sections.push(`**Target Date:** ${formattedTarget}`);

    sections.push('### Time Breakdown');
    sections.push(`| Unit | Value |
|------|-------|
| Days | ${countdown.days} |
| Hours | ${countdown.hours} |
| Minutes | ${countdown.minutes} |`);
  }

  if (description) {
    sections.push(`### About This Event`);
    sections.push(description);
  }

  sections.push('---');
  sections.push(`*This countdown was generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.*`);

  return sections.join('\n\n');
}

export const countdownBlogPostCreatorTool = tool({
  description: `Create a styled blog post with a countdown to a target date.

  This tool generates a Markdown blog post with YAML frontmatter that includes:
  - A human-readable countdown breakdown (days, hours, minutes)
  - A formatted target date
  - Optional event description
  - TTS support for audio playback

  The post is saved to the blog directory and can be rendered by the blog system.

  Example usage:
  - "Create a countdown blog post for New Year's Eve 2026"
  - "Generate a countdown page for our product launch on March 15"
  - "Make a blog post counting down to the conference"`,

  inputSchema: z.object({
    eventName: z.string().describe('The name of the event being counted down to (e.g., "New Year\'s Eve 2026", "Product Launch")'),
    targetDate: z.string().describe('The target date/time for the countdown in ISO 8601 format (e.g., "2026-12-31T23:59:59Z") or a recognizable date string (e.g., "2026-12-31")'),
    description: z.string().optional().describe('Optional description or additional context about the event'),
    title: z.string().optional().describe('Optional custom title for the blog post. Defaults to "Countdown to {eventName}"'),
    tts: z.boolean().default(true).describe('Enable text-to-speech for this post (default: true)'),
    ttsVoice: z.string().default('bm_fable').describe('Voice to use for TTS playback (default: bm_fable)'),
  }),

  execute: async ({ eventName, targetDate, description, title, tts, ttsVoice }) => {
    try {
      console.log('📝 Creating countdown blog post for:', eventName);

      // Parse the target date
      const parsedDate = new Date(targetDate);
      if (isNaN(parsedDate.getTime())) {
        return {
          success: false,
          error: `Invalid target date: "${targetDate}". Please provide a valid date in ISO 8601 format (e.g., "2026-12-31T23:59:59Z") or a recognizable date string.`,
        };
      }

      // Calculate countdown
      const countdown = calculateCountdown(parsedDate);

      // Generate blog post title
      const postTitle = title || `Countdown to ${eventName}`;

      // Generate markdown content
      const content = generateCountdownMarkdown(eventName, parsedDate, description, countdown);

      // Ensure blog directory exists
      if (!existsSync(BLOG_DIR)) {
        mkdirSync(BLOG_DIR, { recursive: true });
      }

      // Generate filename
      const slug = generateSlug(postTitle);
      const currentDate = getCurrentDate();
      const filename = `${currentDate}-${slug}.md`;
      const filepath = join(BLOG_DIR, filename);

      // Build frontmatter
      const excerpt = countdown.isPast
        ? `${eventName} has arrived! The countdown is complete.`
        : `${countdown.humanReadable} until ${eventName}!`;

      const frontmatter = `---
title: "${postTitle}"
date: "${currentDate}"
excerpt: "${excerpt}"
tts: ${tts}
ttsVoice: "${ttsVoice}"
---`;

      // Write file
      const fullContent = `${frontmatter}\n\n${content}`;
      writeFileSync(filepath, fullContent, 'utf-8');

      console.log('✅ Countdown blog post created:', filename);

      // Generate blog URL
      const serverUrl = process.env.ARTIFACT_SERVER_URL
        || (process.env.NODE_ENV === 'production' ? 'https://omegaai.dev' : 'http://localhost:3001');
      const blogUrl = `${serverUrl}/blog/${currentDate}-${slug}`;

      return {
        success: true,
        title: postTitle,
        eventName,
        targetDate: parsedDate.toISOString(),
        countdown: {
          isPast: countdown.isPast,
          days: countdown.days,
          hours: countdown.hours,
          minutes: countdown.minutes,
          humanReadable: countdown.humanReadable,
        },
        filename,
        filepath,
        slug: `${currentDate}-${slug}`,
        url: blogUrl,
        date: currentDate,
        tts,
        ttsVoice,
        message: `✨ Countdown blog post created!\n\nTitle: ${postTitle}\nEvent: ${eventName}\nTarget: ${parsedDate.toISOString()}\nCountdown: ${countdown.humanReadable}\nURL: ${blogUrl}\nFile: ${filename}\nPath: ${filepath}`,
      };
    } catch (error) {
      console.error('Error creating countdown blog post:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create countdown blog post',
      };
    }
  },
});
