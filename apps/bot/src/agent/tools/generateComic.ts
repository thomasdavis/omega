/**
 * Generate Comic Tool
 *
 * Creates a comic-style image using Gemini based on an issue or custom prompt
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateComicFromIssue, generateImageWithGemini } from '../../services/geminiImageService.js';
import { postComicToDiscord } from '../../services/discordWebhookService.js';

export const generateComicTool = tool({
  description: 'Generate a comic-style image using Gemini AI. Can create comics from GitHub issues or custom prompts. Optionally posts to Discord.',
  inputSchema: z.object({
    issueNumber: z.number().optional().describe('GitHub issue number to create a comic from'),
    customPrompt: z.string().optional().describe('Custom prompt for comic generation (if not using an issue)'),
    postToDiscord: z.boolean().optional().default(true).describe('Whether to post the generated comic to Discord'),
  }),
  execute: async ({ issueNumber, customPrompt, postToDiscord }) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';

    // Validate that we have either an issue number or a custom prompt
    if (!issueNumber && !customPrompt) {
      return {
        success: false,
        error: 'Either issueNumber or customPrompt must be provided',
      };
    }

    try {
      let imageResult;
      let issueTitle = '';
      let issueUrl = '';

      if (issueNumber) {
        // Fetch issue details from GitHub
        if (!GITHUB_TOKEN) {
          return {
            success: false,
            error: 'GITHUB_TOKEN is not configured',
          };
        }

        const issueResponse = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/issues/${issueNumber}`,
          {
            headers: {
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          }
        );

        if (!issueResponse.ok) {
          return {
            success: false,
            error: `Failed to fetch issue #${issueNumber}: ${issueResponse.status}`,
          };
        }

        const issue: any = await issueResponse.json();
        issueTitle = issue.title;
        issueUrl = issue.html_url;
        const issueBody = issue.body || '';

        // Generate comic from issue
        imageResult = await generateComicFromIssue(issueTitle, issueBody, issueNumber);
      } else if (customPrompt) {
        // Generate from custom prompt
        const comicPrompt = `Create a humorous comic illustration:

${customPrompt}

Style: Digital comic art, vibrant colors, funny cartoon characters
Include: Speech bubbles, expressive characters, visual jokes

Make it entertaining!`;

        imageResult = await generateImageWithGemini({
          prompt: comicPrompt,
        });
      }

      if (!imageResult || !imageResult.success) {
        return {
          success: false,
          error: imageResult?.error || 'Failed to generate image',
        };
      }

      // Post to Discord if requested and we have an image buffer
      let discordPosted = false;
      if (postToDiscord && imageResult.imageBuffer) {
        if (issueNumber) {
          const discordResult = await postComicToDiscord(
            imageResult.imageBuffer,
            issueNumber,
            issueTitle,
            issueUrl
          );

          if (discordResult.success) {
            discordPosted = true;
          } else {
            console.warn('Failed to post to Discord:', discordResult.error);
          }
        } else {
          // For custom prompts, post with generic message
          const DISCORD_COMIC_WEBHOOK_URL = process.env.DISCORD_COMIC_WEBHOOK_URL;
          if (DISCORD_COMIC_WEBHOOK_URL) {
            const { sendDiscordWebhook } = await import('../../services/discordWebhookService.js');
            const result = await sendDiscordWebhook(DISCORD_COMIC_WEBHOOK_URL, {
              content: '🎨 Generated a new comic!',
              files: [
                {
                  name: `comic-${Date.now()}.png`,
                  data: imageResult.imageBuffer,
                },
              ],
            });
            discordPosted = result.success;
          }
        }
      }

      return {
        success: true,
        message: `Comic generated successfully${discordPosted ? ' and posted to Discord' : ''}`,
        imagePath: imageResult.imagePath,
        postedToDiscord: discordPosted,
        issueNumber: issueNumber,
        issueUrl: issueUrl || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating comic',
      };
    }
  },
});
