/**
 * Generate Anime Manga Tool
 *
 * Creates vertical anime-style manga pages with multiple tiled panels using Gemini
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateImageWithGemini } from '../services/geminiImageService.js';
import { postComicToDiscord, postToDiscordChannel } from '../services/discordWebhookService.js';
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
 * Fetch ALL user profiles from Omega HTTP API
 * Returns the raw JSON response to include in prompt
 */
async function fetchAllUserProfiles(): Promise<string> {
  try {
    // Determine Omega API base URL
    const OMEGA_API_URL = process.env.OMEGA_API_URL || 'https://omegaai.dev';

    // Fetch all profiles with pagination
    const url = `${OMEGA_API_URL}/api/profiles?limit=1000`;

    console.log(`🔍 [fetchAllUserProfiles] Fetching from ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`⚠️ [fetchAllUserProfiles] Failed to fetch: ${response.status} ${response.statusText}`);
      return '';
    }

    const data: any = await response.json();

    if (!data.profiles || !Array.isArray(data.profiles)) {
      console.warn('⚠️ [fetchAllUserProfiles] Invalid response:', data);
      return '';
    }

    const activeProfiles = data.profiles;
    console.log(`✅ [fetchAllUserProfiles] Fetched ${activeProfiles.length} profiles (out of ${data.total} total)`);

    // Return raw JSON stringified for prompt insertion
    return JSON.stringify(activeProfiles, null, 2);
  } catch (error) {
    console.error('❌ [fetchAllUserProfiles] Error:', error);
    return '';
  }
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

  Always posts to Discord automatically and can reference GitHub issues.`,
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
  }),
  execute: async ({ scenario, style, panelCount, conversationParticipants, includeUserIds, issueNumber }) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';

    try {
      console.log('🎨 [generateAnimeManga] Starting manga generation...');
      console.log(`📊 [generateAnimeManga] Style: ${style}, Panels: ${panelCount}`);
      console.log(`📝 [generateAnimeManga] Scenario: ${scenario.substring(0, 100)}...`);

      // Merge conversation participants with explicit user IDs
      let allUserIds = [...(includeUserIds || [])];
      console.log(`👥 [generateAnimeManga] Initial includeUserIds:`, includeUserIds);

      // Look up user IDs from conversation participants (usernames)
      if (conversationParticipants && conversationParticipants.length > 0) {
        console.log(`🔍 [generateAnimeManga] Looking up ${conversationParticipants.length} conversation participants:`, conversationParticipants);
        const participantUserIds = await getUserProfilesByUsernames(conversationParticipants);
        console.log(`✅ [generateAnimeManga] Found ${participantUserIds.length} user profiles for participants:`, participantUserIds);
        allUserIds = [...allUserIds, ...participantUserIds];
      }

      // Remove duplicates
      allUserIds = [...new Set(allUserIds)];
      console.log(`🎭 [generateAnimeManga] Total unique user IDs after merge:`, allUserIds);

      // Fetch ALL user profiles from API for complete character database
      console.log('📊 [generateAnimeManga] Fetching complete user profile database...');
      const profilesJson = await fetchAllUserProfiles();
      const profileDatabase = profilesJson
        ? `\n\n**COMPLETE DISCORD COMMUNITY CHARACTER DATABASE (Raw JSON)**

You have access to comprehensive profiles for ALL Discord community members.
This includes psychological and physical appearance data for every user:

- Physical appearance: hair, eyes, skin, face, build, height, style, accessories
- Psychological traits: archetypes, Big Five, communication patterns
- Behavioral data: message patterns, emoji usage, sentiment
- Relational data: affinity scores, Omega's thoughts about each user

**Instructions:**
- Parse this JSON to find characters mentioned in the scenario
- Use their EXACT physical descriptions for accurate manga character design
- Incorporate their psychological traits into dialogue and expressions
- Keep character appearances CONSISTENT across all panels

**FULL DATABASE:**
\`\`\`json
${profilesJson}
\`\`\`
`
        : '';

      // Get character descriptions if we have users
      let characterDescriptions = '';
      if (allUserIds.length > 0) {
        console.log(`👤 [generateAnimeManga] Loading character profiles for ${allUserIds.length} users...`);
        const validProfiles = await getUserCharacters(allUserIds);
        console.log(`✅ [generateAnimeManga] Loaded ${validProfiles.length} valid character profiles`);

        if (validProfiles.length > 0) {
          console.log(`📋 [generateAnimeManga] Character profiles:`, validProfiles.map(p => ({ username: p.username, appearance: p.appearance?.substring(0, 50) || 'No appearance' })));
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
        console.log(`🔗 [generateAnimeManga] Fetching GitHub issue #${issueNumber}...`);
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
            console.log(`✅ [generateAnimeManga] Loaded issue #${issueNumber}: ${issueTitle}`);
            issueContext = `\n\nGitHub Issue #${issueNumber} Context:
Title: ${issueTitle}
Body: ${issue.body || 'No description'}

Incorporate this issue as part of the manga narrative.`;
          } else {
            console.warn(`⚠️ [generateAnimeManga] Failed to fetch issue #${issueNumber}: ${issueResponse.status} ${issueResponse.statusText}`);
          }
        } catch (error) {
          console.warn('❌ [generateAnimeManga] Error fetching issue details:', error);
        }
      }

      // Build the comprehensive manga generation prompt
      console.log(`📝 [generateAnimeManga] Building manga prompt with style guidance...`);
      const styleGuidance = getStyleGuidance(style);

      const mangaPrompt = `CREATE A VERTICAL ANIME MANGA PAGE

CRITICAL REQUIREMENTS:
✓ MUST be a vertical portrait format page designed for scrolling
✓ MUST contain exactly ${panelCount} panels stacked from top to bottom
✓ MUST include at least 2 funny, expressive, or entertaining panels
✓ MUST use authentic Japanese manga conventions
✓ MUST be in black and white with professional screentones
✓ MUST read from right to left within panels (Japanese style)
✓ ALL TEXT MUST BE IN ENGLISH - Speech bubbles, dialogue, sound effects, captions
✓ Speech bubbles and sound effects required

${styleGuidance}

MANGA STORY:
${scenario}${characterDescriptions}${issueContext}
${profileDatabase}

TECHNICAL SPECIFICATIONS:
- Format: Vertical portrait orientation (suitable for scrolling)
- Panels: ${panelCount} panels arranged top to bottom
- Style: ${style.charAt(0).toUpperCase() + style.slice(1)} manga aesthetic
- Reading: Right-to-left within panels (Japanese convention)
- Medium: Black and white linework with screentones
- Text: Include speech bubbles with dialogue IN ENGLISH
- SFX: Manga-style sound effects written in ENGLISH (e.g., "BOOM", "WHOOSH", "CRASH")
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

FUNNY TILES / STYLE SHIFTS (REQUIRED):
Each manga MUST contain at least 2 funny panels using DIFFERENT art styles for maximum comedic impact.
Mix and match styles - the weirder the shift, the funnier it is:

1. Stick Figure / MS Paint Style
2. Crayon / Child's Drawing
3. Corporate Memphis / Tech Art
4. IKEA Manual / Warning Label
5. The "SpongeBob" Gross-Up (detailed ugly close-up)
6. Shonen "Power Up" (JoJo dramatic posing with auras)
7. Film Noir / Sin City (high contrast shadows)
8. Eldritch Horror / Junji Ito (disturbing spiral patterns)
9. Rubber Hose (1930s Mickey Mouse animation)
10. 8-Bit / Pixel Art
11. Sunday Funnies / Garfield Style
12. Medieval Tapestry / Bayeux
13. Vaporwave / Glitch Art
14. Claymation / Aardman (Wallace & Gromit)
15. Uncanny Valley 3D (creepy CGI)
16. Felt Puppet / Muppet
17. Paper Cutout / Collage
18. Renaissance Oil Painting
19. Abstract / Cubism
20. Political Cartoon / Caricature
21. Infomercial Screenshot / "Before & After"
22. Security Camera Footage / CCTV Grainy
23. Courtroom Sketch Artist
24. Cave Painting / Primitive Art
25. Anime "Emotional Breakdown" (Speed Lines & Super Deformed)
26. Victorian Etching / Penny Dreadful
27. Egyptian Hieroglyphics
28. Soviet Propaganda Poster
29. Ransom Note / Cut-Out Letters
30. Dashboard Warning Light / Car Manual Icon
31. Windows XP Error Dialog / Blue Screen
32. Police Lineup Mugshot / Height Chart
33. Airport Security X-Ray Scanner
34. 1990s Clipart / WordArt
35. Medical Diagram / Gray's Anatomy
36. Vintage Pulp Magazine Cover
37. Assembly Instructions / LEGO Manual
38. Tarot Card / Mystical Symbolism
39. Food Network / Cooking Show Screenshot
40. Bob Ross / Happy Little Accidents Painting

20 TYPES OF HUMOR TO EMPLOY:
You are a legendary comedian creating jokes for this manga. Use these archetypes:

1. Narrative/Incongruity - Normal situation turns catastrophic
2. Intellectual/Status Reversal - Smart character makes obvious mistake
3. Rule of Three - Two similar, then unexpected twist
4. Wordplay - Clever puns and double meanings
5. One-Liner - Single sentence punch
6. Misdirection - Lead one way, punchline goes another
7. Absurdist - Impossible situations treated as normal
8. Anti-Joke - Subvert format with literal answer
9. Modern Wordplay - Contemporary puns
10. Dark Humor - Morbid with clever twist
11. Self-Deprecation - Character mocks own flaws
12. Callback/Brick Joke - Setup early, payoff later
13. Observational - Point out everyday absurdities
14. Slapstick/Physical - Visual pratfalls, exaggerated reactions
15. Parody/Satire - Mock well-known tropes
16. Dramatic Irony - Audience knows what character doesn't
17. Cringe Comedy - Uncomfortable situations for laughs
18. Meta-Humor - Self-aware about being in manga
19. Deadpan/Dry Wit - Absurd statements with seriousness
20. Surreal/Non-Sequitur - Random unexpected elements

CHARACTER CONSISTENCY (CRITICAL):
- Once a character appears in panel 1, their appearance is LOCKED
- Keep consistent: hair, clothing, accessories, facial features, body type
- Only change: expressions, poses, positions
- Reference character descriptions for EVERY panel they appear in

WHAT TO AVOID:
✗ Horizontal/landscape orientation
✗ Western comic book style
✗ Full color (use B&W with screentones only)
✗ Left-to-right reading direction
✗ Boring/flat panels without personality
✗ Too few panels (must have ${panelCount})

Generate a professional, authentic vertical manga page that captures the essence of ${style} manga storytelling with humor and visual flair!`;

      console.log(`🎨 [generateAnimeManga] Generating manga image with Gemini (prompt length: ${mangaPrompt.length} chars)...`);

      // Generate the manga page
      const imageResult = await generateImageWithGemini({
        prompt: mangaPrompt,
      });

      if (!imageResult || !imageResult.success) {
        console.error(`❌ [generateAnimeManga] Failed to generate manga:`, imageResult?.error);
        return {
          success: false,
          error: imageResult?.error || 'Failed to generate manga page',
        };
      }

      console.log(`✅ [generateAnimeManga] Manga image generated successfully!`);
      console.log(`📁 [generateAnimeManga] Image path: ${imageResult.imagePath}`);
      console.log(`📦 [generateAnimeManga] Image buffer size: ${imageResult.imageBuffer?.length || 0} bytes`);

      // Always post to Discord using Discord client
      let discordPosted = false;
      let discordMessageId: string | undefined;
      console.log(`📤 [generateAnimeManga] Posting manga to Discord...`);

      if (imageResult.imageBuffer) {
        const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
        const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

        if (!DISCORD_BOT_TOKEN) {
          console.warn(`⚠️ [generateAnimeManga] DISCORD_BOT_TOKEN not configured, skipping Discord post`);
        } else if (!DISCORD_CHANNEL_ID) {
          console.warn(`⚠️ [generateAnimeManga] DISCORD_CHANNEL_ID not configured, skipping Discord post`);
        } else {
          // Build content message
          let content = `📖 **${style.charAt(0).toUpperCase() + style.slice(1)} Manga Page Generated**\n`;
          content += `Panels: ${panelCount} | Characters: ${allUserIds.length}\n`;

          if (issueNumber && issueTitle && issueUrl) {
            content += `\n🔗 **Issue #${issueNumber}:** ${issueTitle}\n${issueUrl}`;
          }

          console.log(`📤 [generateAnimeManga] Posting to Discord channel ${DISCORD_CHANNEL_ID}...`);

          const discordResult = await postToDiscordChannel({
            channelId: DISCORD_CHANNEL_ID,
            content,
            imageBuffer: imageResult.imageBuffer,
            imageName: `manga-${style}-${panelCount}panel-${Date.now()}.png`,
          });

          discordPosted = discordResult.success;
          discordMessageId = discordResult.messageId;

          if (discordPosted) {
            console.log(`✅ [generateAnimeManga] Successfully posted manga to Discord (message ID: ${discordMessageId})`);
          } else {
            console.error(`❌ [generateAnimeManga] Failed to post manga to Discord:`, discordResult.error);
          }
        }
      } else {
        console.warn(`⚠️ [generateAnimeManga] No image buffer available, skipping Discord post`);
      }

      const result = {
        success: true,
        message: `Vertical ${style} manga page generated successfully with ${panelCount} panels${discordPosted ? ' and posted to Discord' : ''}`,
        imagePath: imageResult.imagePath,
        postedToDiscord: discordPosted,
        discordMessageId,
        style,
        panelCount,
        charactersIncluded: allUserIds.length,
        issueNumber: issueNumber,
        issueUrl: issueUrl || undefined,
        availableStyles: Array.from(MANGA_STYLES),
      };

      console.log(`🎉 [generateAnimeManga] Manga generation complete!`, {
        success: true,
        style,
        panelCount,
        charactersIncluded: allUserIds.length,
        discordPosted,
        discordMessageId,
        issueNumber,
      });

      return result;
    } catch (error) {
      console.error(`❌ [generateAnimeManga] Error during manga generation:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating manga',
      };
    }
  },
});
