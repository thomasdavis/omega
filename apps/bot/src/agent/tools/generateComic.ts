/**
 * Generate Comic Tool
 *
 * Creates a comic-style image using Gemini based on an issue or custom prompt
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  generateComicFromIssue,
  generateImageWithGemini,
  generateComicWithUsers,
} from '../../services/geminiImageService.js';
import { postComicToDiscord } from '../../services/discordWebhookService.js';
import { getUserProfile } from '../../database/userProfileService.js';

export const generateComicTool = tool({
  description: `Generate a comic-style image using Gemini AI. Can create comics from GitHub issues or custom prompts.

  NEW: Can include real users as characters in the comic based on their profiles and how Omega perceives them!

  Optionally posts to Discord.`,
  inputSchema: z.object({
    issueNumber: z
      .number()
      .optional()
      .describe('GitHub issue number to create a comic from'),
    customPrompt: z
      .string()
      .optional()
      .describe('Custom prompt for comic generation (if not using an issue)'),
    includeUserIds: z
      .array(z.string())
      .optional()
      .describe(
        'Array of Discord user IDs to include as characters in the comic (uses their profiles for appearance and personality)'
      ),
    postToDiscord: z
      .boolean()
      .optional()
      .default(true)
      .describe('Whether to post the generated comic to Discord'),
  }),
  execute: async ({ issueNumber, customPrompt, includeUserIds, postToDiscord }) => {
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
        // Check if we should include users
        if (includeUserIds && includeUserIds.length > 0) {
          console.log(`Including ${includeUserIds.length} users in comic`);

          // Fetch user profiles
          const userProfiles = await Promise.all(
            includeUserIds.map(async (userId) => {
              const profile = await getUserProfile(userId);
              if (!profile) return null;

              const feelings = profile.feelings_json ? JSON.parse(profile.feelings_json) : null;
              const personality = profile.personality_facets
                ? JSON.parse(profile.personality_facets)
                : null;

              return {
                username: profile.username,
                appearance: profile.ai_appearance_description,
                personality,
                feelings,
              };
            })
          );

          // Filter out null profiles
          const validProfiles = userProfiles.filter((p) => p !== null) as Array<{
            username: string;
            appearance?: string;
            personality?: any;
            feelings?: any;
          }>;

          if (validProfiles.length === 0) {
            return {
              success: false,
              error: 'No valid user profiles found for the specified user IDs',
            };
          }

          // Generate comic with users
          imageResult = await generateComicWithUsers(customPrompt, validProfiles);
        } else {
          // Generate from custom prompt without users
          const comicPrompt = `Create a humorous comic illustration:

${customPrompt}

Style: Digital comic art, vibrant colors, funny cartoon characters
Include: Speech bubbles, expressive characters, visual jokes

Make it entertaining!`;

          imageResult = await generateImageWithGemini({
            prompt: comicPrompt,
          });
        }
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
