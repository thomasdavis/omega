/**
 * Single Countdown Blog Post Creator Tool
 * Creates a visually immersive markdown blog post with a live countdown timer,
 * custom background image, and personal note integration.
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
 * Validate that the target date is in the future
 */
function validateTargetDate(dateStr: string): { valid: boolean; reason?: string } {
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) {
    return { valid: false, reason: `Invalid date format: "${dateStr}". Use YYYY-MM-DD format.` };
  }
  const now = new Date();
  if (target <= now) {
    return { valid: false, reason: 'Target date must be in the future.' };
  }
  return { valid: true };
}

/**
 * Build the countdown blog post HTML content embedded in markdown
 */
function buildCountdownContent(params: {
  title: string;
  targetDate: string;
  backgroundImageUrl: string;
  note: string;
}): string {
  const { title, targetDate, backgroundImageUrl, note } = params;

  // Escape any backticks or special chars in user-provided strings for safe embedding
  const safeTitle = title.replace(/`/g, '\\`').replace(/\$/g, '\\$');
  const safeNote = note.replace(/`/g, '\\`').replace(/\$/g, '\\$');

  return `<div id="countdown-container" style="
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #fff;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: url('${backgroundImageUrl}') center/cover no-repeat fixed;
  padding: 2rem;
  overflow: hidden;
">
  <!-- Dark overlay for readability -->
  <div style="
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    z-index: 0;
  "></div>

  <div style="position: relative; z-index: 1; max-width: 700px;">
    <h1 style="
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      text-shadow: 0 2px 8px rgba(0,0,0,0.6);
    ">${safeTitle}</h1>

    <p style="
      font-size: 1.1rem;
      opacity: 0.85;
      margin-bottom: 2rem;
      text-shadow: 0 1px 4px rgba(0,0,0,0.5);
    ">Counting down to <strong>${targetDate}</strong></p>

    <div id="countdown-display" style="
      display: flex;
      gap: 1.5rem;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 2.5rem;
    ">
      <div class="countdown-unit" style="text-align: center;">
        <span id="cd-days" style="font-size: 3.5rem; font-weight: bold; display: block; text-shadow: 0 2px 8px rgba(0,0,0,0.5);">--</span>
        <span style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8;">Days</span>
      </div>
      <div class="countdown-unit" style="text-align: center;">
        <span id="cd-hours" style="font-size: 3.5rem; font-weight: bold; display: block; text-shadow: 0 2px 8px rgba(0,0,0,0.5);">--</span>
        <span style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8;">Hours</span>
      </div>
      <div class="countdown-unit" style="text-align: center;">
        <span id="cd-minutes" style="font-size: 3.5rem; font-weight: bold; display: block; text-shadow: 0 2px 8px rgba(0,0,0,0.5);">--</span>
        <span style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8;">Minutes</span>
      </div>
      <div class="countdown-unit" style="text-align: center;">
        <span id="cd-seconds" style="font-size: 3.5rem; font-weight: bold; display: block; text-shadow: 0 2px 8px rgba(0,0,0,0.5);">--</span>
        <span style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8;">Seconds</span>
      </div>
    </div>

    <div style="
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(8px);
      border-radius: 12px;
      padding: 1.5rem 2rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
      text-shadow: 0 1px 4px rgba(0,0,0,0.4);
    ">
      <p style="font-size: 1.05rem; line-height: 1.7; margin: 0;">${safeNote}</p>
    </div>
  </div>
</div>

<script>
(function() {
  var targetDate = new Date("${targetDate}T00:00:00").getTime();
  function update() {
    var now = Date.now();
    var diff = targetDate - now;
    if (diff <= 0) {
      document.getElementById("cd-days").textContent = "0";
      document.getElementById("cd-hours").textContent = "0";
      document.getElementById("cd-minutes").textContent = "0";
      document.getElementById("cd-seconds").textContent = "0";
      return;
    }
    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var minutes = Math.floor((diff % 3600000) / 60000);
    var seconds = Math.floor((diff % 60000) / 1000);
    document.getElementById("cd-days").textContent = days;
    document.getElementById("cd-hours").textContent = hours;
    document.getElementById("cd-minutes").textContent = minutes;
    document.getElementById("cd-seconds").textContent = seconds;
  }
  update();
  setInterval(update, 1000);
})();
</script>`;
}

export const singleCountdownBlogPostCreatorTool = tool({
  description: `Create a visually immersive blog post featuring a live countdown timer towards a specific date.

  The post includes:
  - A full-screen background image for visual impact
  - A real-time countdown timer (days, hours, minutes, seconds)
  - A personal note explaining the significance of the countdown
  - Styled HTML/CSS/JS embedded in markdown with dark overlay for readability

  The countdown updates dynamically in the browser and shows zero values when the target date is reached.

  Example usage:
  - "Make a blog post with a countdown to September 1st, 2026"
  - "Create a countdown post with background for a personal reminder"
  - "Publish a blog post featuring a countdown timer for my anniversary"`,

  inputSchema: z.object({
    title: z.string().describe('The title of the countdown blog post'),
    targetDate: z
      .string()
      .describe('The date to count down to in YYYY-MM-DD format (e.g., "2026-09-01")'),
    backgroundImageUrl: z
      .string()
      .url()
      .describe('URL of the background image to display behind the countdown'),
    note: z
      .string()
      .describe('A personal note or message explaining the significance of the countdown'),
    tts: z.boolean().default(false).describe('Enable text-to-speech for this post (default: false)'),
    ttsVoice: z
      .string()
      .default('bm_fable')
      .describe('Voice to use for TTS playback (default: bm_fable)'),
  }),

  execute: async ({ title, targetDate, backgroundImageUrl, note, tts, ttsVoice }) => {
    try {
      console.log('⏳ Creating countdown blog post:', title);

      // Validate target date
      const dateValidation = validateTargetDate(targetDate);
      if (!dateValidation.valid) {
        console.error('❌ Date validation failed:', dateValidation.reason);
        return {
          success: false,
          error: `Date validation failed: ${dateValidation.reason}`,
        };
      }

      // Validate note is not empty
      if (!note || note.trim().length === 0) {
        return {
          success: false,
          error: 'Personal note cannot be empty.',
        };
      }

      // Ensure blog directory exists
      if (!existsSync(BLOG_DIR)) {
        mkdirSync(BLOG_DIR, { recursive: true });
      }

      // Generate file metadata
      const slug = generateSlug(title);
      const currentDate = getCurrentDate();
      const filename = `${currentDate}-${slug}.md`;
      const filepath = join(BLOG_DIR, filename);

      // Build frontmatter
      const frontmatter = `---
title: "${title}"
date: "${currentDate}"
targetDate: "${targetDate}"
backgroundImage: "${backgroundImageUrl}"
tts: ${tts}
ttsVoice: "${ttsVoice}"
---`;

      // Build countdown content
      const countdownHtml = buildCountdownContent({
        title,
        targetDate,
        backgroundImageUrl,
        note,
      });

      const fullContent = `${frontmatter}

${countdownHtml}`;

      // Write file
      writeFileSync(filepath, fullContent, 'utf-8');

      console.log('✅ Countdown blog post created:', filename);

      const serverUrl =
        process.env.ARTIFACT_SERVER_URL ||
        (process.env.NODE_ENV === 'production' ? 'https://omegaai.dev' : 'http://localhost:3001');
      const postSlug = filename.replace(/\.md$/, '');
      const blogUrl = `${serverUrl}/blog/${postSlug}`;

      return {
        success: true,
        title,
        targetDate,
        filename,
        filepath,
        slug: postSlug,
        url: blogUrl,
        backgroundImageUrl,
        tts,
        ttsVoice,
        date: currentDate,
        message: `⏳ Countdown blog post created!\n\nTitle: ${title}\nTarget Date: ${targetDate}\nURL: ${blogUrl}\nFile: ${filename}\nPath: ${filepath}\nDate: ${currentDate}\nTTS: ${tts ? 'enabled' : 'disabled'}\n\nThe post features a live countdown timer with your background image and personal note.`,
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
