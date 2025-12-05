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
} from '../services/geminiImageService.js';
import { postComicToDiscord, postToDiscordChannel } from '../services/discordWebhookService.js';
import { getUserCharacters } from '../lib/userAppearance.js';
import { getDatabase, saveGeneratedImage } from '@repo/database';

/**
 * Look up user profiles by usernames
 */
async function getUserProfilesByUsernames(usernames: string[]): Promise<string[]> {
  const db = await getDatabase();
  const userIds: string[] = [];

  for (const username of usernames) {
    const result = await db.query(
      'SELECT user_id FROM user_profiles WHERE username = $1 LIMIT 1',
      [username]
    );

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

  When generating comics, consider who is in the recent conversation and mention their usernames in conversationParticipants.

  CONTEXT USAGE: When creating comics about GitHub issues/PRs, focus primarily on the issue/PR content itself.
  Use conversation history selectively - only include relevant context that enhances the comic, not the entire conversation.

  Always posts to Discord automatically.`,
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
    userId: z
      .string()
      .optional()
      .describe('User ID of the person who created this comic'),
    username: z
      .string()
      .optional()
      .describe('Username of the person who created this comic'),
    discordMessageId: z
      .string()
      .optional()
      .describe('Discord message ID if this comic was posted to Discord'),
  }),
  execute: async ({ issueNumber, customPrompt, conversationParticipants, includeUserIds, userId, username, discordMessageId: inputDiscordMessageId }) => {
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
      console.log('🎨 [generateComic] Starting comic generation...');
      if (issueNumber) {
        console.log(`📊 [generateComic] Issue: #${issueNumber}`);
      } else if (customPrompt) {
        console.log(`📝 [generateComic] Custom prompt: ${customPrompt.substring(0, 100)}...`);
      }

      // Merge conversation participants with explicit user IDs
      let allUserIds = [...(includeUserIds || [])];
      console.log(`👥 [generateComic] Initial includeUserIds:`, includeUserIds);

      // Look up user IDs from conversation participants (usernames)
      if (conversationParticipants && conversationParticipants.length > 0) {
        console.log(`🔍 [generateComic] Looking up ${conversationParticipants.length} conversation participants:`, conversationParticipants);
        const participantUserIds = await getUserProfilesByUsernames(conversationParticipants);
        console.log(`✅ [generateComic] Found ${participantUserIds.length} user profiles for participants:`, participantUserIds);
        allUserIds = [...allUserIds, ...participantUserIds];
      }

      // Remove duplicates
      allUserIds = [...new Set(allUserIds)];
      console.log(`🎭 [generateComic] Total unique user IDs after merge:`, allUserIds);

      let imageResult;
      let issueTitle = '';
      let issueUrl = '';

      if (issueNumber) {
        console.log(`🔗 [generateComic] Fetching GitHub issue #${issueNumber}...`);
        // Fetch issue details from GitHub
        if (!GITHUB_TOKEN) {
          console.error(`❌ [generateComic] GITHUB_TOKEN not configured`);
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
          console.error(`❌ [generateComic] Failed to fetch issue #${issueNumber}: ${issueResponse.status}`);
          return {
            success: false,
            error: `Failed to fetch issue #${issueNumber}: ${issueResponse.status}`,
          };
        }

        const issue: any = await issueResponse.json();
        issueTitle = issue.title;
        issueUrl = issue.html_url;
        const issueBody = issue.body || '';
        console.log(`✅ [generateComic] Loaded issue #${issueNumber}: ${issueTitle}`);

        // Check if we should include users in the issue comic
        if (allUserIds.length > 0) {
          console.log(`👤 [generateComic] Loading character profiles for ${allUserIds.length} users...`);

          // Fetch user characters using shared module
          const validProfiles = await getUserCharacters(allUserIds);
          console.log(`✅ [generateComic] Loaded ${validProfiles.length} valid character profiles`);

          if (validProfiles.length > 0) {
            console.log(`🎨 [generateComic] Generating comic from issue WITH ${validProfiles.length} users...`);
            // Generate comic from issue WITH users
            // Focus on the issue itself, not full conversation history
            const scenario = `GitHub Issue #${issueNumber}: ${issueTitle}\n\n${issueBody}`;
            imageResult = await generateComicWithUsers(scenario, validProfiles);
          } else {
            console.log(`🎨 [generateComic] Generating comic from issue without users (fallback)...`);
            // Generate comic from issue without users (fallback)
            imageResult = await generateComicFromIssue(issueTitle, issueBody, issueNumber);
          }
        } else {
          console.log(`🎨 [generateComic] Generating comic from issue without users...`);
          // Generate comic from issue without users
          imageResult = await generateComicFromIssue(issueTitle, issueBody, issueNumber);
        }
      } else if (customPrompt) {
        // Check if we should include users
        if (allUserIds.length > 0) {
          console.log(`👤 [generateComic] Loading character profiles for ${allUserIds.length} users...`);

          // Fetch user characters using shared module
          const validProfiles = await getUserCharacters(allUserIds);
          console.log(`✅ [generateComic] Loaded ${validProfiles.length} valid character profiles`);

          if (validProfiles.length > 0) {
            console.log(`🎨 [generateComic] Generating comic with ${validProfiles.length} users...`);
            // Generate comic with users
            imageResult = await generateComicWithUsers(customPrompt, validProfiles);
          } else {
            console.log(`🎨 [generateComic] Generating comic without users (no valid profiles)...`);
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
          console.log(`🎨 [generateComic] Generating comic from custom prompt without users...`);
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
        console.error(`❌ [generateComic] Failed to generate comic:`, imageResult?.error);
        return {
          success: false,
          error: imageResult?.error || 'Failed to generate image',
        };
      }

      console.log(`✅ [generateComic] Comic generated successfully!`);
      console.log(`📁 [generateComic] Image path: ${imageResult.imagePath}`);
      console.log(`📦 [generateComic] Image buffer size: ${imageResult.imageBuffer?.length || 0} bytes`);

      // Always post to Discord using Discord client
      let discordPosted = false;
      let discordMessageId: string | undefined;
      console.log(`📤 [generateComic] Posting comic to Discord...`);

      if (imageResult.imageBuffer) {
        const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
        const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

        if (!DISCORD_BOT_TOKEN) {
          console.warn(`⚠️ [generateComic] DISCORD_BOT_TOKEN not configured, skipping Discord post`);
        } else if (!DISCORD_CHANNEL_ID) {
          console.warn(`⚠️ [generateComic] DISCORD_CHANNEL_ID not configured, skipping Discord post`);
        } else {
          // Build content message
          let content = `🎨 **Comic Generated**\n`;
          if (issueNumber && issueTitle) {
            content += `🔗 **Issue #${issueNumber}:** ${issueTitle}\n${issueUrl}`;
          } else if (customPrompt) {
            content += `Custom prompt: ${customPrompt.substring(0, 100)}${customPrompt.length > 100 ? '...' : ''}`;
          }
          content += `\nCharacters: ${allUserIds.length}`;

          console.log(`📤 [generateComic] Posting to Discord channel ${DISCORD_CHANNEL_ID}...`);

          const discordResult = await postToDiscordChannel({
            channelId: DISCORD_CHANNEL_ID,
            content,
            imageBuffer: imageResult.imageBuffer,
            imageName: issueNumber ? `comic-issue-${issueNumber}-${Date.now()}.png` : `comic-${Date.now()}.png`,
          });

          discordPosted = discordResult.success;
          discordMessageId = discordResult.messageId;

          if (discordPosted) {
            console.log(`✅ [generateComic] Successfully posted comic to Discord (message ID: ${discordMessageId})`);
          } else {
            console.error(`❌ [generateComic] Failed to post comic to Discord:`, discordResult.error);
          }
        }
      } else {
        console.warn(`⚠️ [generateComic] No image buffer available, skipping Discord post`);
      }

      // Save image metadata to database
      try {
        const filename = issueNumber ? `comic-issue-${issueNumber}-${Date.now()}.png` : `comic-${Date.now()}.png`;
        const description = customPrompt
          ? customPrompt.substring(0, 500)
          : issueTitle
            ? `Comic based on issue #${issueNumber}: ${issueTitle}`
            : 'Generated comic';

        await saveGeneratedImage({
          title: `Comic - ${new Date().toISOString()}`,
          description,
          prompt: customPrompt || `GitHub Issue #${issueNumber}: ${issueTitle}`,
          revisedPrompt: customPrompt || `GitHub Issue #${issueNumber}: ${issueTitle}`,
          toolUsed: 'generateComic',
          modelUsed: 'gemini-3-pro-image-preview',
          filename,
          artifactPath: imageResult.imagePath,
          publicUrl: undefined,
          format: 'png',
          imageData: imageResult.imageBuffer,
          createdBy: userId,
          createdByUsername: username,
          discordMessageId: discordMessageId || inputDiscordMessageId,
          githubIssueNumber: issueNumber,
        });
        console.log(`💾 Image metadata saved to database`);
      } catch (dbError) {
        console.error(`⚠️ Failed to save image metadata to database:`, dbError);
      }

      const result = {
        success: true,
        message: `Comic generated successfully${discordPosted ? ' and posted to Discord' : ''}`,
        imagePath: imageResult.imagePath,
        postedToDiscord: discordPosted,
        discordMessageId,
        charactersIncluded: allUserIds.length,
        issueNumber: issueNumber,
        issueUrl: issueUrl || undefined,
      };

      console.log(`🎉 [generateComic] Comic generation complete!`, {
        success: true,
        charactersIncluded: allUserIds.length,
        discordPosted,
        discordMessageId,
        issueNumber,
      });

      return result;
    } catch (error) {
      console.error(`❌ [generateComic] Error during comic generation:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating comic',
      };
    }
  },
});
