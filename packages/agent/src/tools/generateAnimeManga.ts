/**
 * Generate Anime Manga Tool
 *
 * Creates vertical anime-style manga pages with multiple tiled panels using Gemini
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateImageWithGemini } from '../services/geminiImageService.js';
import { postComicToDiscord } from '../services/discordWebhookService.js';
import { getUserCharacters } from '../lib/userAppearance.js';
import { getDatabase } from '@repo/database';

/**
 * Available manga styles
 */
const MANGA_STYLES = [
  'shonen',
  'shoujo',
  'seinen',
  'josei',
  'kodomo',
  'mecha',
  'isekai',
  'slice-of-life',
  'action',
  'romance',
] as const;

type MangaStyle = typeof MANGA_STYLES[number];

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

/**
 * Generate style-specific prompt guidance
 */
function getStyleGuidance(style: MangaStyle): string {
  const styleGuidance: Record<MangaStyle, string> = {
    shonen: `SHONEN MANGA STYLE:
- Dynamic action-oriented artwork with bold, thick linework
- Energetic compositions with speed lines and motion blur
- Power-up effects, energy auras, dramatic impact frames
- Exaggerated expressions showing determination, anger, excitement
- Strong contrast between black and white areas
- Classic screentone patterns for shadows and effects
- Heroes with spiky hair, determined eyes, muscular physiques
- Action poses mid-movement, dynamic angles`,

    shoujo: `SHOUJO MANGA STYLE:
- Delicate, flowing linework with attention to detail
- Large, expressive eyes with multiple highlights and sparkles
- Soft screentone gradients for skin and backgrounds
- Decorative backgrounds: flowers, sparkles, bubbles, ribbons
- Romantic framing and intimate character moments
- Elegant character designs with detailed hair and clothing
- Emotional expressions: blushing, tears, joy, longing
- Panel borders often decorated or irregular`,

    seinen: `SEINEN MANGA STYLE:
- Realistic, detailed artwork with mature themes
- Gritty, textured linework showing depth and weight
- Complex facial expressions showing psychological nuance
- Detailed backgrounds: urban environments, machinery, interiors
- Heavy use of screentones for atmosphere and realism
- More anatomically accurate character proportions
- Subtle expressions and body language
- Darker tone with moral ambiguity`,

    josei: `JOSEI MANGA STYLE:
- Sophisticated, realistic character designs for adult women
- Natural expressions and emotional depth
- Detailed fashion, hairstyles, and contemporary settings
- Refined linework balancing elegance and realism
- Mature romantic and professional themes
- Realistic body proportions and movements
- Urban modern backgrounds: cafes, offices, apartments
- Subtle screentones creating refined atmosphere`,

    kodomo: `KODOMO MANGA STYLE:
- Simple, cute character designs with round features
- Bright, cheerful compositions with minimal screentones
- Clean, bold linework easy for children to read
- Exaggerated cute expressions: big smiles, sparkling eyes
- Simple backgrounds focusing on characters
- Educational or wholesome themes
- Friendly animal companions or mascots
- Positive, uplifting visual tone`,

    mecha: `MECHA MANGA STYLE:
- Highly detailed mechanical designs with technical precision
- Dynamic robot action with transformation sequences
- Complex panel layouts showing scale and movement
- Technical cross-sections and mechanical details
- Sci-fi backgrounds: space stations, battlefields, cockpits
- Dramatic lighting on metal surfaces
- Heavy screentones for mechanical texture
- Speed lines for explosive combat
- Human pilots shown for scale and emotion`,

    isekai: `ISEKAI MANGA STYLE:
- Fantasy world aesthetic with RPG elements
- Magical effects: glowing runes, spell circles, energy beams
- Medieval fantasy architecture and environments
- Character stat windows or game UI elements
- Diverse fantasy races: elves, demons, beastfolk
- Adventurer gear and fantasy weapons
- Dramatic reincarnation or transportation scenes
- Mix of modern and fantasy elements`,

    'slice-of-life': `SLICE-OF-LIFE MANGA STYLE:
- Natural, realistic everyday environments
- Gentle expressions showing subtle emotions
- Detailed backgrounds: schools, homes, neighborhoods, cafes
- Soft screentones creating warm, comfortable atmosphere
- Characters in casual, everyday clothing
- Simple panel layouts focusing on conversation and mood
- Small comedic moments and reactions
- Seasonal details: weather, food, events
- Wholesome interactions between characters`,

    action: `ACTION MANGA STYLE:
- Intense, kinetic compositions with explosive energy
- Multiple speed lines and motion blur effects
- Impact frames with radiating lines and broken panels
- Dynamic fight choreography across multiple panels
- Characters mid-strike with dramatic foreshortening
- Debris, dust clouds, shockwaves from impacts
- Intense facial expressions during combat
- Heavy blacks and stark whites for contrast
- Dramatic angles emphasizing power and speed`,

    romance: `ROMANCE MANGA STYLE:
- Intimate character framing focusing on faces and emotions
- Soft screentones and delicate linework
- Romantic lighting: sunset, moonlight, soft indoor lighting
- Blushing cheeks, gentle smiles, longing gazes
- Decorative backgrounds with flowers or sparkles
- Close-up panels of hands touching or near-touches
- Body language showing attraction and nervousness
- Dreamy, idealized atmosphere
- Panel layouts creating romantic tension and pacing`,
  };

  return styleGuidance[style];
}

export const generateAnimeMangaTool = tool({
  description: `Generate a vertical anime-style manga page with multiple stacked panels. Creates authentic Japanese manga artwork with character integration, dialogue, and panel composition optimized for vertical scrolling.

  IMPORTANT: This tool automatically includes people from recent conversations as manga characters!
  - Looks at conversation participants and mentioned users
  - Loads their profiles from Omega's database (appearance, personality, feelings)
  - Renders them as manga characters based on how Omega perceives them

  Features 10 authentic manga styles: shonen (action), shoujo (romance), seinen (mature), josei (adult female), kodomo (children), mecha (robots), isekai (fantasy), slice-of-life (everyday), action (intense combat), romance (love stories).

  The manga page must include at least 2 funny or expressive panels with humor, reactions, or entertaining moments.

  Optionally posts to Discord and can reference GitHub issues.`,
  inputSchema: z.object({
    scenario: z
      .string()
      .describe('The story scenario or situation to depict in the manga page. Describe the narrative, events, dialogue, and emotional beats to visualize.'),
    style: z
      .enum(['shonen', 'shoujo', 'seinen', 'josei', 'kodomo', 'mecha', 'isekai', 'slice-of-life', 'action', 'romance'])
      .default('shonen')
      .describe('Manga style determining the visual aesthetic, themes, and artistic approach (default: shonen)'),
    panelCount: z
      .number()
      .min(2)
      .max(6)
      .default(4)
      .describe('Number of panels stacked vertically (2-6 panels, default: 4). More panels = longer page.'),
    conversationParticipants: z
      .array(z.string())
      .optional()
      .describe(
        'Array of usernames from recent conversation to include as manga characters (automatically looks up their profiles and how Omega feels about them)'
      ),
    includeUserIds: z
      .array(z.string())
      .optional()
      .describe(
        'Array of Discord user IDs to include as manga characters (legacy - prefer conversationParticipants)'
      ),
    issueNumber: z
      .number()
      .optional()
      .describe('Optional GitHub issue number to reference in the manga'),
    postToDiscord: z
      .boolean()
      .optional()
      .default(true)
      .describe('Whether to post the generated manga page to Discord'),
  }),
  execute: async ({ scenario, style, panelCount, conversationParticipants, includeUserIds, issueNumber, postToDiscord }) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';

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

      // Get character descriptions if we have users
      let characterDescriptions = '';
      if (allUserIds.length > 0) {
        console.log(`Including ${allUserIds.length} users as manga characters`);
        const validProfiles = await getUserCharacters(allUserIds);

        if (validProfiles.length > 0) {
          characterDescriptions = `\n\nMANGA CHARACTERS (based on real conversation participants):
${validProfiles.map((profile, i) => `
Character ${i + 1}: ${profile.username}
- Appearance: ${profile.appearance}
- Personality: ${profile.personality}
- Omega's feelings: ${JSON.stringify(profile.feelings)}
- Role: Render this person as a manga character with these characteristics
`).join('\n')}

IMPORTANT: Draw these specific people as manga characters in the panels! Use their appearance descriptions and personality traits to inform how they look and act in the manga.`;
        }
      }

      // Get issue details if provided
      let issueContext = '';
      let issueTitle = '';
      let issueUrl = '';
      if (issueNumber && GITHUB_TOKEN) {
        try {
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

          if (issueResponse.ok) {
            const issue: any = await issueResponse.json();
            issueTitle = issue.title;
            issueUrl = issue.html_url;
            issueContext = `\n\nGitHub Issue #${issueNumber} Context:
Title: ${issueTitle}
Body: ${issue.body || 'No description'}

Incorporate this issue as part of the manga narrative.`;
          }
        } catch (error) {
          console.warn('Failed to fetch issue details:', error);
        }
      }

      // Build the comprehensive manga generation prompt
      const styleGuidance = getStyleGuidance(style);

      const mangaPrompt = `CREATE A VERTICAL ANIME MANGA PAGE

CRITICAL REQUIREMENTS:
✓ MUST be a vertical portrait format page designed for scrolling
✓ MUST contain exactly ${panelCount} panels stacked from top to bottom
✓ MUST include at least 2 funny, expressive, or entertaining panels
✓ MUST use authentic Japanese manga conventions
✓ MUST be in black and white with professional screentones
✓ MUST read from right to left within panels (Japanese style)
✓ Speech bubbles and sound effects required

${styleGuidance}

MANGA STORY:
${scenario}${characterDescriptions}${issueContext}

TECHNICAL SPECIFICATIONS:
- Format: Vertical portrait orientation (suitable for scrolling)
- Panels: ${panelCount} panels arranged top to bottom
- Style: ${style.charAt(0).toUpperCase() + style.slice(1)} manga aesthetic
- Reading: Right-to-left within panels (Japanese convention)
- Medium: Black and white linework with screentones
- Text: Include speech bubbles with dialogue
- SFX: Japanese-style sound effects (onomatopoeia)
- Humor: At least 2 panels must be funny or highly expressive

PANEL COMPOSITION GUIDELINES:
1. First panel: Establishing shot setting the scene
2. Middle panels: Story progression, character interactions, action
3. At least 2 panels: Comedy beats, reactions, or entertaining moments
4. Final panel: Cliffhanger, punchline, or emotional resolution

MANGA TECHNIQUES TO USE:
- Screentones: Dot patterns for shading, gradients, textures
- Speed lines: Radiating lines for motion and impact
- Emotion symbols: Sweat drops, exclamation marks, hearts, anger veins
- Dramatic angles: Dutch angles, extreme close-ups, wide shots
- Panel variation: Different panel sizes for pacing and emphasis
- Background detail: Establish setting then focus on characters
- Facial expressions: Exaggerated for comedy, subtle for drama

WHAT TO AVOID:
✗ Horizontal/landscape orientation
✗ Western comic book style
✗ Full color (use B&W with screentones only)
✗ Left-to-right reading direction
✗ Boring/flat panels without personality
✗ Too few panels (must have ${panelCount})

Generate a professional, authentic vertical manga page that captures the essence of ${style} manga storytelling with humor and visual flair!`;

      // Generate the manga page
      const imageResult = await generateImageWithGemini({
        prompt: mangaPrompt,
      });

      if (!imageResult || !imageResult.success) {
        return {
          success: false,
          error: imageResult?.error || 'Failed to generate manga page',
        };
      }

      // Post to Discord if requested
      let discordPosted = false;
      if (postToDiscord && imageResult.imageBuffer) {
        const DISCORD_COMIC_WEBHOOK_URL = process.env.DISCORD_COMIC_WEBHOOK_URL;

        if (issueNumber && issueTitle && issueUrl) {
          // Post with issue context
          const discordResult = await postComicToDiscord(
            imageResult.imageBuffer,
            issueNumber,
            issueTitle,
            issueUrl
          );
          discordPosted = discordResult.success;
        } else if (DISCORD_COMIC_WEBHOOK_URL) {
          // Post with generic message
          const { sendDiscordWebhook } = await import('../services/discordWebhookService.js');
          const result = await sendDiscordWebhook(DISCORD_COMIC_WEBHOOK_URL, {
            content: `📖 Generated a new ${style} manga page with ${panelCount} panels!`,
            files: [
              {
                name: `manga-${style}-${Date.now()}.png`,
                data: imageResult.imageBuffer,
              },
            ],
          });
          discordPosted = result.success;
        }
      }

      return {
        success: true,
        message: `Vertical ${style} manga page generated successfully with ${panelCount} panels${discordPosted ? ' and posted to Discord' : ''}`,
        imagePath: imageResult.imagePath,
        postedToDiscord: discordPosted,
        style,
        panelCount,
        charactersIncluded: allUserIds.length,
        issueNumber: issueNumber,
        issueUrl: issueUrl || undefined,
        availableStyles: Array.from(MANGA_STYLES),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating manga',
      };
    }
  },
});
