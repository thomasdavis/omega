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
import { getUserCharacters } from '../../lib/userAppearance.js';
import { getDatabase } from '../../database/client.js';

/**
 * Look up user profiles by usernames
 */
async function getUserProfilesByUsernames(usernames: string[]): Promise<string[]> {
  const db = getDatabase();
  const userIds: string[] = [];

  for (const username of usernames) {
    const result = await db.execute({
      sql: 'SELECT user_id FROM user_profiles WHERE username = ? LIMIT 1',
      args: [username],
    });

    if (result.rows.length > 0) {
      userIds.push((result.rows[0] as any).user_id);
    }
  }

  return userIds;
}

export const generateComicTool = tool({
  description: `Generate a comic-style image using Gemini AI. Can create comics from GitHub issues or custom prompts.

  IMPORTANT: This tool automatically includes people from recent conversations as comic characters!
  - Looks at conversation participants and mentioned users
  - Loads their profiles from Omega's database (appearance, personality, feelings)
  - Renders them as characters in the comic based on how Omega perceives them

  **FOCUS ON PR/ISSUE CONTEXT:**
  When generating comics for GitHub issues or PRs, prioritize the specific PR/issue content over full conversation history.
  Use conversation history only where it adds relevant context to the current PR/issue.
  Include conversation participants who are directly relevant to the PR/issue being illustrated.

  CONTEXT USAGE: When creating comics about GitHub issues/PRs, focus primarily on the issue/PR content itself.
  Use conversation history selectively - only include relevant context that enhances the comic, not the entire conversation.

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
    conversationParticipants: z
      .array(z.string())
      .optional()
      .describe(
        'Array of usernames from recent conversation to include as characters (automatically looks up their profiles and how Omega feels about them)'
      ),
    includeUserIds: z
      .array(z.string())
      .optional()
      .describe(
        'Array of Discord user IDs to include as characters in the comic (legacy - prefer conversationParticipants)'
      ),
    postToDiscord: z
      .boolean()
      .optional()
      .default(true)
      .describe('Whether to post the generated comic to Discord'),
  }),
  execute: async ({ issueNumber, customPrompt, conversationParticipants, includeUserIds, postToDiscord }) => {
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
      // Merge conversation participants with explicit user IDs
      let allUserIds = [...(includeUserIds || [])];

      // Look up user IDs from conversation participants (usernames)
      if (conversationParticipants && conversationParticipants.length > 0) {
        console.log(`Looking up ${conversationParticipants.length} conversation participants:`, conversationParticipants);
        const participantUserIds = await getUserProfilesByUsernames(conversationParticipants);
        console.log(`Found ${participantUserIds.length} user profiles for participants`);
        allUserIds = [...allUserIds, ...participantUserIds];
      }

      // Remove duplicates
      allUserIds = [...new Set(allUserIds)];

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

        // Check if we should include users in the issue comic
        if (allUserIds.length > 0) {
          console.log(`Including ${allUserIds.length} users in issue comic`);

          // Fetch user characters using shared module
          const validProfiles = await getUserCharacters(allUserIds);

          if (validProfiles.length > 0) {
            // Generate comic from issue WITH users
            // Focus on the issue itself, not full conversation history
            const scenario = `GitHub Issue #${issueNumber}: ${issueTitle}\n\n${issueBody}`;
            imageResult = await generateComicWithUsers(scenario, validProfiles);
          } else {
            // Generate comic from issue without users (fallback)
            imageResult = await generateComicFromIssue(issueTitle, issueBody, issueNumber);
          }
        } else {
          // Generate comic from issue without users
          imageResult = await generateComicFromIssue(issueTitle, issueBody, issueNumber);
        }
      } else if (customPrompt) {
        // Check if we should include users
        if (allUserIds.length > 0) {
          console.log(`Including ${allUserIds.length} users in custom prompt comic`);

          // Fetch user characters using shared module
          const validProfiles = await getUserCharacters(allUserIds);

          if (validProfiles.length > 0) {
            // Generate comic with users
            imageResult = await generateComicWithUsers(customPrompt, validProfiles);
          } else {
            // No valid profiles, generate without users
            const comicPrompt = `Create a humorous comic illustration:

${customPrompt}

Style: Digital comic art, vibrant colors, funny cartoon characters
Include: Speech bubbles, expressive characters, visual jokes

Make it entertaining!`;

            imageResult = await generateImageWithGemini({
              prompt: comicPrompt,
            });
          }
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
