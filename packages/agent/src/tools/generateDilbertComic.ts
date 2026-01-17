/**
 * Generate Dilbert-Style Comic Tool
 *
 * Creates enhanced Dilbert-style comic strips with improved clarity, humor, and technical presentations.
 * Optimized for clever workplace satire, crisp panel layouts, and better text ballooning.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateImageWithGemini } from '../services/geminiImageService.js';
import { postToDiscordChannel } from '../services/discordWebhookService.js';
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

export const generateDilbertComicTool = tool({
  description: `Generate enhanced Dilbert-style comic strips with workplace satire and tech humor.

  This tool creates high-quality comic strips featuring:
  - Clever workplace and tech satire
  - Clean, modern 3-panel layout with crisp borders
  - Expressive characters with distinctive visual styles
  - Clear speech bubbles with readable text
  - Subtle visual gags and background details
  - Professional office/tech environment aesthetics

  Perfect for workplace humor, office politics, AI/tech satire, and developer-focused comedy.

  IMPORTANT: Can include people from conversations as comic characters!
  - Looks at conversation participants and mentioned users
  - Loads their profiles from Omega's database
  - Renders them as characters based on their personalities

  Always posts to Discord automatically.`,
  inputSchema: z.object({
    scenario: z
      .string()
      .describe('The workplace scenario or situation for the comic (e.g., "remote work challenges", "AI replacing developers")'),
    punchline: z
      .string()
      .optional()
      .describe('Optional specific punchline or sarcastic ending'),
    conversationParticipants: z
      .array(z.string())
      .optional()
      .describe('Array of usernames from conversation to include as characters'),
    includeUserIds: z
      .array(z.string())
      .optional()
      .describe('Array of Discord user IDs to include as characters (legacy)'),
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
  execute: async ({ scenario, punchline, conversationParticipants, includeUserIds, userId, username, discordMessageId: inputDiscordMessageId }) => {
    try {
      console.log('🎨 [generateDilbertComic] Starting Dilbert-style comic generation...');
      console.log(`📝 [generateDilbertComic] Scenario: ${scenario.substring(0, 100)}...`);

      // Merge conversation participants with explicit user IDs
      let allUserIds = [...(includeUserIds || [])];
      console.log(`👥 [generateDilbertComic] Initial includeUserIds:`, includeUserIds);

      // Look up user IDs from conversation participants (usernames)
      if (conversationParticipants && conversationParticipants.length > 0) {
        console.log(`🔍 [generateDilbertComic] Looking up ${conversationParticipants.length} conversation participants:`, conversationParticipants);
        const participantUserIds = await getUserProfilesByUsernames(conversationParticipants);
        console.log(`✅ [generateDilbertComic] Found ${participantUserIds.length} user profiles for participants:`, participantUserIds);
        allUserIds = [...allUserIds, ...participantUserIds];
      }

      // Remove duplicates
      allUserIds = [...new Set(allUserIds)];
      console.log(`🎭 [generateDilbertComic] Total unique user IDs after merge:`, allUserIds);

      // Build the Dilbert-style prompt
      let dilbertPrompt = `Create a professional Dilbert-style comic strip with the following specifications:

SCENARIO:
${scenario}
${punchline ? `\nPUNCHLINE: ${punchline}` : ''}

VISUAL STYLE:
- Clean 3-panel horizontal layout with crisp black borders
- Minimalist office/tech environment backgrounds
- Simple but expressive character designs
- Flat colors with subtle shading
- Professional, modern aesthetic

CHARACTER DESIGN:
- Distinctive, expressive faces showing clear emotions
- Simple geometric bodies (circles, rectangles)
- Varied heights and body types for visual interest
- Business casual or developer attire
- Each character should be visually unique and memorable

PANEL COMPOSITION:
Panel 1: Setup - Establish the situation with clear character positions
Panel 2: Development - Build tension or introduce the problem
Panel 3: Punchline - Deliver the satirical payoff with visual emphasis

SPEECH BUBBLES:
- Clean white bubbles with thin black outlines
- Crisp, highly readable sans-serif text
- Proper bubble tails pointing to speakers
- Text sized appropriately for easy reading
- Maximum 2-3 lines per bubble for clarity

HUMOR STYLE:
- Workplace satire and office politics
- Tech industry commentary
- Deadpan delivery with sarcastic undertones
- Subtle visual gags in backgrounds (posters, computer screens)
- Relatable developer/office worker frustrations

IMPORTANT TECHNICAL REQUIREMENTS:
- High resolution and sharp lines
- Clear contrast for text readability
- Professional print-quality appearance
- No blur or artifacts in text
- Maintain consistent character appearance across panels
`;

      // If we have user characters, include them in the prompt
      if (allUserIds.length > 0) {
        console.log(`👤 [generateDilbertComic] Loading character profiles for ${allUserIds.length} users...`);

        const validProfiles = await getUserCharacters(allUserIds);
        console.log(`✅ [generateDilbertComic] Loaded ${validProfiles.length} valid character profiles`);

        if (validProfiles.length > 0) {
          dilbertPrompt += `\nCHARACTERS TO INCLUDE:\n`;
          validProfiles.forEach((profile, index) => {
            dilbertPrompt += `Character ${index + 1}: ${profile.username}
- Appearance: ${profile.appearance}
- Personality: ${profile.personality}
- Role in scene: ${profile.feelings ? `Feeling ${profile.feelings}` : 'Office worker/developer'}
\n`;
          });
          dilbertPrompt += `\nEnsure each character is visually distinct and matches their description while maintaining the Dilbert aesthetic.\n`;
        }
      }

      dilbertPrompt += `\nCreate an entertaining, professional Dilbert-style comic that delivers sharp workplace satire!`;

      console.log(`🎨 [generateDilbertComic] Generating image with enhanced Dilbert-style prompt...`);

      const imageResult = await generateImageWithGemini({
        prompt: dilbertPrompt,
      });

      if (!imageResult || !imageResult.success) {
        console.error(`❌ [generateDilbertComic] Failed to generate comic:`, imageResult?.error);
        return {
          success: false,
          error: imageResult?.error || 'Failed to generate image',
        };
      }

      console.log(`✅ [generateDilbertComic] Dilbert-style comic generated successfully!`);
      console.log(`📁 [generateDilbertComic] Image path: ${imageResult.imagePath}`);
      console.log(`📦 [generateDilbertComic] Image buffer size: ${imageResult.imageBuffer?.length || 0} bytes`);

      // Post to Discord
      let discordPosted = false;
      let discordMessageId: string | undefined;
      console.log(`📤 [generateDilbertComic] Posting comic to Discord...`);

      if (imageResult.imageBuffer) {
        const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
        const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

        if (!DISCORD_BOT_TOKEN) {
          console.warn(`⚠️ [generateDilbertComic] DISCORD_BOT_TOKEN not configured, skipping Discord post`);
        } else if (!DISCORD_CHANNEL_ID) {
          console.warn(`⚠️ [generateDilbertComic] DISCORD_CHANNEL_ID not configured, skipping Discord post`);
        } else {
          const content = `🎨 **Dilbert-Style Comic Generated**\n📝 Scenario: ${scenario.substring(0, 150)}${scenario.length > 150 ? '...' : ''}\n🎭 Characters: ${allUserIds.length}`;

          console.log(`📤 [generateDilbertComic] Posting to Discord channel ${DISCORD_CHANNEL_ID}...`);

          const discordResult = await postToDiscordChannel({
            channelId: DISCORD_CHANNEL_ID,
            content,
            imageBuffer: imageResult.imageBuffer,
            imageName: `dilbert-comic-${Date.now()}.png`,
          });

          discordPosted = discordResult.success;
          discordMessageId = discordResult.messageId;

          if (discordPosted) {
            console.log(`✅ [generateDilbertComic] Successfully posted comic to Discord (message ID: ${discordMessageId})`);
          } else {
            console.error(`❌ [generateDilbertComic] Failed to post comic to Discord:`, discordResult.error);
          }
        }
      } else {
        console.warn(`⚠️ [generateDilbertComic] No image buffer available, skipping Discord post`);
      }

      // Save image metadata and data to database
      try {
        const filename = `dilbert-comic-${Date.now()}.png`;
        const description = `Dilbert-style comic: ${scenario.substring(0, 200)}${punchline ? ` - ${punchline.substring(0, 100)}` : ''}`;

        await saveGeneratedImage({
          userId: userId || 'unknown',
          username,
          toolName: 'generateDilbertComic',
          prompt: scenario,
          model: 'gemini-3-pro-image-preview',
          storageUrl: imageResult.imagePath || '',
          storageProvider: 'omega',
          mimeType: 'image/png',
          bytes: imageResult.imageBuffer?.length,
          status: 'success',
          metadata: {
            filename,
            artifactPath: imageResult.imagePath,
            description,
            scenario,
            punchline,
            timestamp: new Date().toISOString(),
          },
          messageId: discordMessageId || inputDiscordMessageId,
          imageData: imageResult.imageBuffer,
        });
        console.log(`💾 Image metadata and binary data saved to database`);
      } catch (dbError) {
        console.error(`⚠️ Failed to save image to database:`, dbError);
      }

      const result = {
        success: true,
        message: `Dilbert-style comic generated successfully${discordPosted ? ' and posted to Discord' : ''}`,
        imagePath: imageResult.imagePath,
        postedToDiscord: discordPosted,
        discordMessageId,
        charactersIncluded: allUserIds.length,
      };

      console.log(`🎉 [generateDilbertComic] Dilbert-style comic generation complete!`, {
        success: true,
        charactersIncluded: allUserIds.length,
        discordPosted,
        discordMessageId,
      });

      return result;
    } catch (error) {
      console.error(`❌ [generateDilbertComic] Error during comic generation:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating Dilbert-style comic',
      };
    }
  },
});
