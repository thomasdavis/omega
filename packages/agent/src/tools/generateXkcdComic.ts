/**
 * Generate XKCD-Style Comic Tool
 *
 * Creates minimalist stick figure comics in the distinctive XKCD style
 * featuring dry humor, scientific/technical wit, and clever explanations
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

export const generateXkcdComicTool = tool({
  description: `Generate XKCD-style comics with minimalist stick figures, dry humor, and clever scientific/technical wit.

  This tool creates comics in the distinctive XKCD style featuring:
  - Simple stick figure characters with minimalist design
  - Monochrome (black and white) artwork
  - Clean, hand-drawn aesthetic with subtle imperfections
  - Dry, witty humor focused on science, technology, math, and geek culture
  - Clever explanations and thought-provoking insights
  - Speech bubbles with casual, conversational dialogue
  - Minimal backgrounds (simple lines, basic shapes)
  - Alt-text style captions for additional humor

  Perfect for technical humor, educational content, programming jokes, science explanations, and geeky observations.

  IMPORTANT: Can include people from conversations as stick figure characters!
  - Looks at conversation participants and mentioned users
  - Renders them as stick figures with personality-appropriate dialogue

  Always posts to Discord automatically.`,
  inputSchema: z.object({
    scenario: z
      .string()
      .describe('The scenario, joke, or concept to visualize (e.g., "explain quantum entanglement", "programming debugging humor", "AI alignment problem")'),
    panelCount: z
      .number()
      .min(1)
      .max(6)
      .default(3)
      .describe('Number of panels in the comic (1-6, default: 3)'),
    includeAltText: z
      .boolean()
      .default(true)
      .describe('Include XKCD-style alt-text caption for additional humor (default: true)'),
    conversationParticipants: z
      .array(z.string())
      .optional()
      .describe('Array of usernames from conversation to include as stick figure characters'),
    includeUserIds: z
      .array(z.string())
      .optional()
      .describe('Array of Discord user IDs to include as stick figure characters (legacy)'),
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
  execute: async ({ scenario, panelCount, includeAltText, conversationParticipants, includeUserIds, userId, username, discordMessageId: inputDiscordMessageId }) => {
    try {
      console.log('🎨 [generateXkcdComic] Starting XKCD-style comic generation...');
      console.log(`📝 [generateXkcdComic] Scenario: ${scenario.substring(0, 100)}...`);
      console.log(`📊 [generateXkcdComic] Panels: ${panelCount}, Alt-text: ${includeAltText}`);

      // Merge conversation participants with explicit user IDs
      let allUserIds = [...(includeUserIds || [])];
      console.log(`👥 [generateXkcdComic] Initial includeUserIds:`, includeUserIds);

      // Look up user IDs from conversation participants (usernames)
      if (conversationParticipants && conversationParticipants.length > 0) {
        console.log(`🔍 [generateXkcdComic] Looking up ${conversationParticipants.length} conversation participants:`, conversationParticipants);
        const participantUserIds = await getUserProfilesByUsernames(conversationParticipants);
        console.log(`✅ [generateXkcdComic] Found ${participantUserIds.length} user profiles for participants:`, participantUserIds);
        allUserIds = [...allUserIds, ...participantUserIds];
      }

      // Remove duplicates
      allUserIds = [...new Set(allUserIds)];
      console.log(`🎭 [generateXkcdComic] Total unique user IDs after merge:`, allUserIds);

      // Build character descriptions if we have users
      let characterDescriptions = '';
      if (allUserIds.length > 0) {
        console.log(`👤 [generateXkcdComic] Loading character profiles for ${allUserIds.length} users...`);
        const validProfiles = await getUserCharacters(allUserIds);
        console.log(`✅ [generateXkcdComic] Loaded ${validProfiles.length} valid character profiles`);

        if (validProfiles.length > 0) {
          characterDescriptions = `\n\nSTICK FIGURE CHARACTERS (based on conversation participants):
${validProfiles.map((profile, i) => `
Stick Figure ${i + 1}: ${profile.username}
- Personality: ${profile.personality}
- Dialogue style: Matches their personality traits
- Visual distinction: Simple labels, hairstyle variations, or accessories to identify them
`).join('\n')}

IMPORTANT: Render these people as stick figures with dialogue that reflects their personalities and roles in the scenario.`;
        }
      }

      // Build the comprehensive XKCD-style prompt
      const xkcdPrompt = `CREATE AN XKCD-STYLE COMIC STRIP

CRITICAL VISUAL REQUIREMENTS:
✓ MUST use simple stick figure characters (circles for heads, straight lines for bodies/limbs)
✓ MUST be black and white (monochrome) - NO COLORS except black, white, and gray
✓ MUST have clean, hand-drawn aesthetic with slight imperfections (not perfectly straight lines)
✓ MUST use minimalist backgrounds (simple lines, basic geometric shapes, or blank)
✓ MUST include ${panelCount} panel(s) arranged horizontally
✓ MUST have clear panel borders (simple black rectangles)
✓ ALL TEXT MUST BE IN ENGLISH - Speech bubbles, captions, labels

XKCD STYLE SPECIFICATIONS:

Visual Design:
- Stick figures: Circle heads, simple line bodies, basic limbs
- Line weight: Consistent thin black lines with subtle hand-drawn wobble
- Backgrounds: Minimal - simple horizons, basic furniture outlines, or completely blank
- Shading: Occasional gray fills for emphasis, but mostly stark black and white
- Imperfections: Slightly imperfect circles and lines (hand-drawn feel, not computer-perfect)

Character Design:
- All characters are stick figures with circle heads and line bodies
- Differentiate characters with: different hair (simple lines), accessories (glasses, hats), labels, or slight size variations
- Keep it SIMPLE - avoid over-detailing stick figures
- Characters can show emotion through simple: ">_<" sad, "^_^" happy, "-_-" annoyed faces

Humor Style:
- Dry, intellectual wit with deadpan delivery
- Scientific accuracy with clever twists
- Programming/tech insider jokes
- Math and logic humor
- Observational comedy about geek culture
- Philosophical thought experiments
- Absurdist scenarios presented matter-of-factly
- Self-aware meta-humor
- Subtle visual gags in background details

Dialogue:
- Casual, conversational tone
- Technical terminology used naturally
- Clever wordplay and puns
- Characters explain complex concepts simply
- Dialogue-heavy (XKCD characters talk a lot!)
- Speech bubbles with clean, readable text
- Use lowercase or title case (avoid all caps unless shouting)

Panel Composition (${panelCount} panel${panelCount > 1 ? 's' : ''}):
${panelCount === 1 ? '- Single panel: Complete joke or observation in one frame' : ''}
${panelCount === 2 ? '- Panel 1: Setup\n- Panel 2: Punchline or twist' : ''}
${panelCount === 3 ? '- Panel 1: Establish scenario or question\n- Panel 2: Development or explanation\n- Panel 3: Punchline, twist, or thought-provoking conclusion' : ''}
${panelCount > 3 ? '- Panel 1: Introduction\n- Middle panels: Build complexity or develop idea\n- Final panel: Payoff, twist, or philosophical conclusion' : ''}

SCENARIO:
${scenario}${characterDescriptions}

${includeAltText ? `MOUSEOVER TEXT (Alt-Text):
Create an XKCD-style alt-text caption that appears below the comic as a subtitle.
This should be an additional joke, extended explanation, meta-commentary, or amusing tangent related to the comic.
Format it as: "Alt-text: [your clever caption here]"
Include this text at the bottom of the image, outside the panels, in small readable font.
` : ''}

TECHNICAL SPECIFICATIONS:
- Format: Horizontal strip layout (landscape orientation)
- Panels: ${panelCount} panel(s) side by side
- Style: XKCD minimalist stick figure aesthetic
- Medium: Black and white line art only (no colors, no complex shading)
- Text: Clear speech bubbles with readable dialogue IN ENGLISH
- Backgrounds: Minimal or blank (XKCD style)
- Characters: Simple stick figures with personality

WHAT TO AVOID:
✗ Detailed realistic drawings
✗ Color (must be black and white only)
✗ Complex shading or gradients
✗ Detailed backgrounds
✗ Non-stick figure characters
✗ Computer-perfect geometric shapes (add slight hand-drawn imperfection)
✗ Vertical comic layouts
✗ Overly dramatic or action-oriented artwork
✗ Manga or superhero comic styles

XKCD COMICS TO REFERENCE FOR STYLE:
- "What If?" explanations with stick figures and diagrams
- Programming jokes with simple computer/code representations
- Relationship comics with two stick figures talking
- Math jokes with minimal equations and stick figures
- Science humor with basic diagrams and stick figures

Generate a clever, witty XKCD-style comic that balances scientific accuracy with dry humor!`;

      console.log(`🎨 [generateXkcdComic] Generating image with XKCD-style prompt (length: ${xkcdPrompt.length} chars)...`);

      const imageResult = await generateImageWithGemini({
        prompt: xkcdPrompt,
      });

      if (!imageResult || !imageResult.success) {
        console.error(`❌ [generateXkcdComic] Failed to generate comic:`, imageResult?.error);
        return {
          success: false,
          error: imageResult?.error || 'Failed to generate XKCD-style comic',
        };
      }

      console.log(`✅ [generateXkcdComic] XKCD-style comic generated successfully!`);
      console.log(`📁 [generateXkcdComic] Image path: ${imageResult.imagePath}`);
      console.log(`📦 [generateXkcdComic] Image buffer size: ${imageResult.imageBuffer?.length || 0} bytes`);

      // Post to Discord
      let discordPosted = false;
      let discordMessageId: string | undefined;
      console.log(`📤 [generateXkcdComic] Posting comic to Discord...`);

      if (imageResult.imageBuffer) {
        const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
        const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

        if (!DISCORD_BOT_TOKEN) {
          console.warn(`⚠️ [generateXkcdComic] DISCORD_BOT_TOKEN not configured, skipping Discord post`);
        } else if (!DISCORD_CHANNEL_ID) {
          console.warn(`⚠️ [generateXkcdComic] DISCORD_CHANNEL_ID not configured, skipping Discord post`);
        } else {
          const content = `🎨 **XKCD-Style Comic Generated**\n📝 Scenario: ${scenario.substring(0, 150)}${scenario.length > 150 ? '...' : ''}\n🖼️ Panels: ${panelCount}\n🎭 Characters: ${allUserIds.length}`;

          console.log(`📤 [generateXkcdComic] Posting to Discord channel ${DISCORD_CHANNEL_ID}...`);

          const discordResult = await postToDiscordChannel({
            channelId: DISCORD_CHANNEL_ID,
            content,
            imageBuffer: imageResult.imageBuffer,
            imageName: `xkcd-comic-${panelCount}panel-${Date.now()}.png`,
          });

          discordPosted = discordResult.success;
          discordMessageId = discordResult.messageId;

          if (discordPosted) {
            console.log(`✅ [generateXkcdComic] Successfully posted comic to Discord (message ID: ${discordMessageId})`);
          } else {
            console.error(`❌ [generateXkcdComic] Failed to post comic to Discord:`, discordResult.error);
          }
        }
      } else {
        console.warn(`⚠️ [generateXkcdComic] No image buffer available, skipping Discord post`);
      }

      // Save image metadata and data to database
      try {
        const filename = `xkcd-comic-${panelCount}panel-${Date.now()}.png`;
        const description = `XKCD-style comic: ${scenario.substring(0, 200)}`;

        await saveGeneratedImage({
          userId: userId || 'unknown',
          username,
          toolName: 'generateXkcdComic',
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
            panelCount,
            includeAltText,
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
        message: `XKCD-style comic generated successfully with ${panelCount} panel${panelCount > 1 ? 's' : ''}${discordPosted ? ' and posted to Discord' : ''}`,
        imagePath: imageResult.imagePath,
        postedToDiscord: discordPosted,
        discordMessageId,
        panelCount,
        includeAltText,
        charactersIncluded: allUserIds.length,
      };

      console.log(`🎉 [generateXkcdComic] XKCD-style comic generation complete!`, {
        success: true,
        panelCount,
        includeAltText,
        charactersIncluded: allUserIds.length,
        discordPosted,
        discordMessageId,
      });

      return result;
    } catch (error) {
      console.error(`❌ [generateXkcdComic] Error during comic generation:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating XKCD-style comic',
      };
    }
  },
});
