/**
 * Gemini Comic Generation Service
 * Generates comic images using Google's Gemini API based on conversation context
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { OMEGA_APPEARANCE } from '../lib/omegaAppearance.js';
import { getComicsDir } from '../utils/storage.js';
import { generateScreenplay } from './screenplayService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ComicGenerationOptions {
  conversationContext: string;
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  issueNumber?: number;
  userIds?: string[]; // Discord user IDs for character appearance data
}

interface ComicGenerationResult {
  success: boolean;
  imagePath?: string;
  imageData?: Buffer;
  error?: string;
}

interface CharacterAppearance {
  userId: string;
  username: string;
  description: string;
  gender?: string;
  hairColor?: string;
  hairStyle?: string;
  hairTexture?: string;
  eyeColor?: string;
  skinTone?: string;
  faceShape?: string;
  bodyType?: string;
  buildDescription?: string;
  heightEstimate?: string;
  facialHair?: string;
  clothingStyle?: string;
  accessories?: string[];
  distinctiveFeatures?: string[];
  aestheticArchetype?: string;
  // Psychological data for character behavior
  dominantArchetype?: string;
  communicationStyle?: string;
  humorStyle?: string;
  affinityScore?: number;
}

/**
 * Fetch ALL user profiles from Omega HTTP API
 * Returns the raw JSON response to dump into prompt
 */
async function fetchAllUserProfiles(): Promise<string> {
  try {
    // Determine Omega API base URL
    const OMEGA_API_URL = process.env.OMEGA_API_URL || 'https://omegaai.dev';

    // Fetch all profiles with pagination
    // Start with a large limit to get all profiles in one request
    const url = `${OMEGA_API_URL}/api/profiles?limit=1000`;

    console.log(`🔍 Fetching ALL user profiles from ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`⚠️ Failed to fetch user profiles: ${response.status} ${response.statusText}`);
      return '';
    }

    const data: any = await response.json();

    if (!data.profiles || !Array.isArray(data.profiles)) {
      console.warn('⚠️ Invalid response from Omega API:', data);
      return '';
    }

    // Note: /api/profiles already filters for messageCount > 0, so no need to filter again
    const activeProfiles = data.profiles;

    console.log(`✅ Fetched ${activeProfiles.length} active profiles (out of ${data.total} total)`);

    // Return raw JSON stringified for direct prompt insertion
    return JSON.stringify(activeProfiles, null, 2);
  } catch (error) {
    console.error('❌ Error fetching user profiles:', error);
    return '';
  }
}

/**
 * Generate a comic image using Gemini API
 */
export async function generateComic(options: ComicGenerationOptions): Promise<ComicGenerationResult> {
  const { conversationContext, prNumber, prTitle, prAuthor, issueNumber, userIds } = options;

  // Validate API key
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY environment variable is not set');
    return {
      success: false,
      error: 'GEMINI_API_KEY not configured',
    };
  }

  try {
    console.log(`🎨 Generating comic for PR #${prNumber}: ${prTitle}`);

    // Fetch ALL user profiles (raw JSON)
    // This gives Gemini complete context about all Discord community members
    console.log('📊 Fetching complete user profile database for comic context...');
    const profilesJson = await fetchAllUserProfiles();

    // Generate screenplay first to ensure proper character attribution
    console.log('📝 Generating screenplay for character attribution...');
    const screenplayResult = await generateScreenplay({
      conversationContext,
      prNumber,
      prTitle,
      prAuthor,
      characterProfiles: profilesJson,
    });

    let screenplay = '';
    if (screenplayResult.success && screenplayResult.screenplay) {
      screenplay = screenplayResult.screenplay;
      console.log('✅ Screenplay generated successfully');
    } else {
      console.warn('⚠️ Screenplay generation failed, proceeding without it:', screenplayResult.error);
    }

    // Initialize Gemini API client
    const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Build the prompt for comic generation with character data and screenplay
    const prompt = buildComicPrompt(conversationContext, prNumber, prTitle, prAuthor, profilesJson, screenplay);

    console.log('📝 Comic generation prompt (first 200 chars):', prompt.substring(0, 200) + '...');
    console.log('\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 FULL COMIC GENERATION PROMPT:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(prompt);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n');

    // Generate the comic image using gemini-3-pro-image-preview
    // Note: As of the latest SDK, image generation may use Imagen model instead
    const model = genai.getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
    });

    const result = await model.generateContent(prompt);

    // Extract image data from response
    const response = await result.response;

    if (!response.candidates || response.candidates.length === 0) {
      console.error('❌ No candidates in Gemini response');
      console.error('Response:', JSON.stringify(response, null, 2));
      return {
        success: false,
        error: 'No image generated by Gemini API',
      };
    }

    const candidate = response.candidates[0];
    if (!candidate.content?.parts) {
      console.error('❌ No content parts in candidate');
      console.error('Candidate:', JSON.stringify(candidate, null, 2));
      return {
        success: false,
        error: 'Invalid response structure from Gemini API',
      };
    }

    // Find the image part in the response
    let imageData: Buffer | undefined;
    for (const part of candidate.content.parts) {
      // Check for inline data (base64 encoded image)
      if ((part as any).inlineData?.mimeType?.startsWith('image/')) {
        const base64Data = (part as any).inlineData.data;
        imageData = Buffer.from(base64Data, 'base64');
        console.log(`✅ Extracted image (${imageData.length} bytes, ${(part as any).inlineData.mimeType})`);
        break;
      }
    }

    if (!imageData) {
      console.error('❌ No image data found in response');
      console.error('Parts:', JSON.stringify(candidate.content.parts, null, 2));
      return {
        success: false,
        error: 'No image data in Gemini response',
      };
    }

    // Save the image to file system
    const outputDir = getComicsDir();
    await fs.mkdir(outputDir, { recursive: true });

    // Use issue number if available, otherwise use PR number with timestamp
    const filename = issueNumber
      ? `comic_${issueNumber}.png`
      : `pr-${prNumber}-${Date.now()}.png`;
    const imagePath = path.join(outputDir, filename);

    await fs.writeFile(imagePath, imageData);
    console.log(`✅ Comic saved to: ${imagePath}`);

    return {
      success: true,
      imagePath,
      imageData,
    };
  } catch (error) {
    console.error('❌ Error generating comic:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Determine optimal number of comic frames based on context complexity
 * Returns a value between 3 and 7
 */
function determineFrameCount(conversationContext: string): number {
  // Count various aspects of the conversation
  const lines = conversationContext.split('\n').filter(line => line.trim().length > 0);
  const words = conversationContext.split(/\s+/).length;
  const commentCount = (conversationContext.match(/^-\s/gm) || []).length;

  // Calculate complexity score based on multiple factors
  let complexity = 0;

  // Factor 1: Length of conversation (0-2 points)
  if (words > 500) complexity += 2;
  else if (words > 200) complexity += 1;

  // Factor 2: Number of distinct comments/commits (0-2 points)
  if (commentCount > 5) complexity += 2;
  else if (commentCount > 2) complexity += 1;

  // Factor 3: Line count (0-1 point)
  if (lines.length > 15) complexity += 1;

  // Map complexity (0-5) to frame count (3-7)
  // 0-1: 3 frames (simple)
  // 2: 4 frames
  // 3: 5 frames (moderate)
  // 4: 6 frames
  // 5+: 7 frames (complex)
  const frameCount = Math.min(7, Math.max(3, 3 + complexity));

  console.log(`📊 Frame count analysis: ${words} words, ${commentCount} comments, ${lines.length} lines → ${complexity} complexity → ${frameCount} frames`);

  return frameCount;
}

/**
 * Build character database section from raw JSON
 * Simply dumps the full API response into the prompt
 */
function buildCharacterDatabaseSection(profilesJson: string): string {
  if (!profilesJson || profilesJson.trim() === '') {
    return '';
  }

  return `\n\n**COMPLETE DISCORD COMMUNITY CHARACTER DATABASE (Raw JSON)**

You have access to comprehensive profiles for ALL Discord community members.
This is the COMPLETE JSON response from the /api/profiles endpoint.
It includes ALL psychological and phenotype data for every user:

- Physical appearance (78+ fields): hair, eyes, skin, face shape, build, height, style, etc.
- Psychological traits: Jungian archetypes, Big Five, attachment style, communication patterns
- Behavioral data: message patterns, emoji usage, sentiment, etc.
- Relational data: affinity scores, emotional bonds, Omega's thoughts about each user

**Instructions:**
- Parse this JSON to find characters mentioned in the PR conversation
- Include ALL distinct users involved in the conversation
- Use their EXACT physical descriptions for accurate character depiction
- Incorporate their psychological traits into dialogue and expressions
- The more characters involved, the richer the comic should be

**FULL DATABASE:**
\`\`\`json
${profilesJson}
\`\`\`
`;
}

/**
 * Build the prompt for comic generation
 */
function buildComicPrompt(
  conversationContext: string,
  prNumber: number,
  prTitle: string,
  prAuthor: string,
  profilesJson: string = '',
  screenplay: string = ''
): string {
  // Filter out technical check details (type checks, lint checks, CI status, build status, etc.)
  const filteredContext = conversationContext
    .split('\n')
    .filter(line => {
      const lowerLine = line.toLowerCase();
      // Skip lines about passing checks, type errors, linting, CI status, build status
      return !(
        lowerLine.includes('type check') ||
        lowerLine.includes('lint') ||
        lowerLine.includes('linting') ||
        lowerLine.includes('eslint') ||
        lowerLine.includes('Omega Deploy') ||
        lowerLine.includes('prettier') ||
        lowerLine.includes('passing') ||
        lowerLine.includes('passed') ||
        lowerLine.includes('build succeeded') ||
        lowerLine.includes('build successful') ||
        lowerLine.includes('build passing') ||
        lowerLine.includes('build completed') ||
        lowerLine.includes('ci/cd') ||
        lowerLine.includes('tests passed') ||
        lowerLine.includes('tests passing') ||
        lowerLine.includes('all checks') ||
        lowerLine.includes('✓') ||
        lowerLine.includes('✅') ||
        lowerLine.includes('check passed') ||
        lowerLine.includes('check successful') ||
        lowerLine.match(/\d+\/\d+\s+checks?\s+(passed|successful|passing)/) ||
        lowerLine.match(/build\s*(passed|succeeded|successful|passing)/) ||
        lowerLine.match(/lint\s*(passed|succeeded|successful|passing)/) ||
        // Filter out git commit co-authored messages
        lowerLine.includes('co-authored-by') ||
        lowerLine.includes('generated with') ||
        lowerLine.match(/🤖\s*generated/i)
      );
    })
    .join('\n');

  // Determine optimal frame count based on context
  const frameCount = determineFrameCount(conversationContext);

  // Build panel layout description based on frame count
  let layoutDescription = '';
  switch (frameCount) {
    case 3:
      layoutDescription = '3 panels in a horizontal strip or single column';
      break;
    case 4:
      layoutDescription = '4 panels in a 2x2 grid';
      break;
    case 5:
      layoutDescription = '5 panels (2 on top, 3 on bottom, or vice versa)';
      break;
    case 6:
      layoutDescription = '6 panels in a 2x3 or 3x2 grid';
      break;
    case 7:
      layoutDescription = '7 panels (3 on top, 4 on bottom, or vice versa)';
      break;
    default:
      layoutDescription = `${frameCount} panels in a clear grid layout`;
  }


  // Build character database section (raw JSON dump)
  const characterDatabase = buildCharacterDatabaseSection(profilesJson);

  // Build screenplay section if available
  const screenplaySection = screenplay
    ? `

**PRE-SCRIPTED SCREENPLAY (For Character Attribution):**

The following screenplay has been pre-written to ensure accurate character attribution and dialogue assignment. Use this as your PRIMARY REFERENCE for who says what:

${screenplay}

**CRITICAL:** Follow the screenplay's character attribution exactly. Every line of dialogue in the screenplay is explicitly tagged with the correct speaker. Do not mix up who says what.

`
    : '';

  return `You are a creative comic artist. Generate a comic strip that humorously illustrates the following pull request conversation.

**Pull Request Information:**
- PR #${prNumber}: ${prTitle}
- Author: ${prAuthor}

**Conversation Context:**
${filteredContext}

**Character Design - Omega (AI Assistant):**
${OMEGA_APPEARANCE}
${characterDatabase}${screenplaySection}

**Instructions:**
1. Create a comic with EXACTLY ${frameCount} panels based on the conversation complexity.
   Layout: ${layoutDescription}

2. Panel distribution guide for ${frameCount} panels:
   ${frameCount === 3 ? '- Panel 1: Setup and introduce characters/problem\n   - Panel 2: Complication or escalation\n   - Panel 3: Punchline or resolution (strongest gag here)' : ''}
   ${frameCount === 4 ? '- Panel 1: Introduction (who, what, where)\n   - Panel 2: Development (problem emerges)\n   - Panel 3: Escalation (things get worse/funnier)\n   - Panel 4: Punchline (comedic resolution)' : ''}
   ${frameCount === 5 ? '- Panel 1: Setup scene and characters\n   - Panel 2: Initial conflict/idea\n   - Panel 3: First escalation (twist)\n   - Panel 4: Second escalation (builds tension)\n   - Panel 5: Punchline with visual payoff' : ''}
   ${frameCount === 6 ? '- Panels 1-2: Establish situation and characters\n   - Panels 3-4: Escalate conflict with visual variety (different angles/perspectives)\n   - Panel 5: Peak of absurdity or tension\n   - Panel 6: Comedic resolution with strong visual punchline' : ''}
   ${frameCount === 7 ? '- Panel 1: Opening establishing shot\n   - Panels 2-3: Introduce problem/request with character reactions\n   - Panels 4-5: Escalate absurdity (show process, complications, overthinking)\n   - Panel 6: Climax (peak of chaos or revelation)\n   - Panel 7: Punchline with visual payoff (often chibi/exaggerated for comedy)' : ''}

   **CRITICAL:** Each panel must be DISTINCT - avoid showing the same action/dialogue across multiple panels. Compress repetitive ideas into ONE panel.

3. **ART STYLE & CHARACTER DESIGN:**
   - Use a fun, lighthearted comic book art style with ADULT characters
   - **ADULT CHARACTER MARKERS (Required):**
     * Defined jawlines and cheekbones
     * Realistic head-to-body proportions (heads are 1/7 to 1/8 of body height)
     * Mature facial features with dimension and structure
     * Age-appropriate body types (varied, realistic builds)
     * Facial details: laugh lines, expression lines, realistic skin texture
   - **AVOID (Forbidden):**
     * Large "dough eyes" or oversized pupils that look childish
     * Baby-faced characters with round, featureless faces
     * Chibi proportions EXCEPT in designated super-deformed comedy panels
     * Anime/manga tropes: blush marks, sparkle effects, cutesy expressions (unless intentionally comedic)
     * Head sizes larger than 1/6 of body (makes characters look like children)
   - **USE:**
     * Western comic book proportions and anatomy
     * Varied body types: slim, average, athletic, stocky (all adult proportions)
     * Realistic clothing that fits adult bodies
     * Expressive but mature facial features 
   - ** FUNNY:**
     * Sometimes when you make funny tiles use one of these styles regardless of the rules 
     1. Stick Figure / MS Paint Style
     2. Crayon / Child’s Drawing
     3. Corporate Memphis / Tech Art
     4. IKEA Manual / Warning Label
     5. The "SpongeBob" Gross-Up
     6. Shonen "Power Up" (JoJo Style)
     7. Film Noir / Sin City
     8. Eldritch Horror / Junji Ito
     9. Rubber Hose (1930s Animation)
     10. 8-Bit / Pixel Art
     11. Sunday Funnies / Garfield Style
     12. Medieval Tapestry / Bayeux
     13. Vaporwave / Glitch Art
     14. Claymation / Aardman
     15. Uncanny Valley 3D
     16. Felt Puppet / Muppet
     17. Paper Cutout / Collage
     18. Renaissance Oil Painting
     19. Abstract / Cubism
     20. Political Cartoon / Caricature
4. **CHARACTER SELECTION FROM DATABASE:**
   - Review the complete character database above
   - Include ALL distinct users mentioned or involved in the PR/issue/conversation
   - **EXCLUDE "thomasdavis"** - This is the repo owner who appears in git commits but should NOT be depicted as a character
   - Focus ONLY on Discord community members (users from Discord messages)
   - Use ACCURATE physical descriptions from their profiles (hair color, eye color, build, style, etc.)
   - Incorporate their personality traits (archetype, humor style, communication style) into dialogue and expressions
   - If the conversation involves the AI/bot, depict it as Omega with the unique design above
   - Keep each character's appearance CONSISTENT with their database profile
   - The more characters involved in the conversation, the richer and more dynamic the comic should be

   **CHARACTER APPEARANCE CONSISTENCY (CRITICAL):**
   - Once you establish a character's appearance in panel 1, LOCK IT IN
   - Reference their description for EVERY subsequent panel appearance
   - Keep consistent: hair color/style, clothing, accessories, facial features, body type
   - Only change: facial expressions, body language, positioning
   - Double-check: Does this character look identical to panel 1? If not, fix it.

5. **COMEDY & WIT - CRITICAL:**
   **YOU ARE A LEGENDARY STAND-UP COMEDIAN** with 20 years of experience creating comedy. Your specialty is finding incongruity in everyday situations and delivering punchlines with perfect timing.

   **COMEDY MANDATE - FOCUS ON THIS PR:**
   - **IMPORTANT:** Create NEW jokes specifically about THIS pull request (#${prNumber}: ${prTitle})
   - Focus on what's happening in THIS PR - the changes, the conversation, the code
   - Don't get distracted by old/historical messages - mine the CURRENT PR situation for comedy gold
   - Find the incongruity, absurdity, or irony in THIS specific development scenario
   - Every joke must relate directly to the PR content above

   **10 TYPES OF HUMOR TO EMPLOY:**
   Study these comedy archetypes. Use them as inspiration for crafting original jokes about the PR:

   1. **Narrative/Incongruity** - Set up normal situation, then catastrophic misunderstanding
      Example: Hunter calls 911 "My friend is dead!", operator says "First make sure he's dead", *gunshot*, "OK, now what?"

   2. **Intellectual/Status Reversal** - Smart character makes obvious mistake
      Example: Sherlock analyzes stars philosophically, misses that their tent was stolen

   3. **Rule of Three** - Two similar things, then unexpected third twist
      Example: Driver insults baby, woman complains to passenger, he offers to hold "your monkey"

   4. **Wordplay** - Clever puns and double meanings
      Example: "Chess-nuts boasting in an open foyer"

   5. **One-Liner** - Single sentence with punch
      Example: "Deleted German names off phone. It's Hans free."

   6. **Misdirection** - Lead audience one direction, punchline goes another
      Example: "Can you teach me splits?" "How flexible are you?" "I can't make Tuesdays."

   7. **Absurdist** - Logically impossible situations treated as normal
      Example: Two fish in tank: "Do you know how to drive this thing?"

   8. **Anti-Joke** - Subvert joke format with literal answer
      Example: "What's brown and sticky?" "A stick."

   9. **Modern Wordplay** - Contemporary puns
      Example: "Dating zookeeper, but he was a cheetah"

   10. **Dark Humor** - Morbid situations with clever twist
       Example: Doctor diagnoses "Tom Jones Syndrome" - "It's not unusual"

   **APPLYING HUMOR TO THIS PR:**
   - Identify the core premise of this PR (bug fix? feature? refactor?)
   - Find the incongruity or irony in the situation
   - Use programming/tech context for wordplay opportunities
   - Exaggerate the stakes for absurdist effect
   - Subvert expectations about what "should" happen
   - **ADULT HUMOR ENCOURAGED:** Don't hold back - use mature jokes, innuendos when contextually funny
   - Character-driven humor using their personality profiles from database
   - Break the fourth wall occasionally for meta-humor about software development
   - Use contrast between serious robot Omega and chaotic coding situations

   **VISUAL STORYTELLING:**
   - Show don't tell - use visuals to convey jokes, not just dialogue
   - Exaggerated but clear character reactions (shocked expressions, facepalms, etc.)
   - Visual callbacks - reference earlier panels through background details or objects
   - Contrast sizes for comedy (tiny character next to huge robot, etc.)
   - Background gags that reward close reading
   - **OCCASIONALLY** (like chibi): A panel can be sexualized for comedic effect when it enhances the humor (suggestive poses, innuendos made visual, adult situations played for laughs)

   **PACING AND RHYTHM:**
   - Follow the rule of three: setup, escalation, punchline
   - Avoid repetitive middle panels - each panel must advance the narrative or joke
   - Use visual variety: switch between close-ups, medium shots, wide shots
   - Compress similar ideas into one panel instead of spreading across multiple
   - Build tension/absurdity progressively - start grounded, escalate to absurd

   **TIMING:**
   - Save the biggest laugh for the final panel (strong punchline)
   - Use penultimate panel for setup/anticipation
   - Early panels establish characters and situation quickly
   - Middle panels escalate the situation with visual or dialogue progression

6. **DIALOGUE & COHERENCE:**
   - Speech bubbles must be witty, punchy, and character-appropriate
   - Use each character's communication style and humor type from their profile
   - Dialogue should flow naturally - coherent conversations, not random jokes
   - Build narrative momentum - each panel advances the story
   - Callbacks and running gags across panels create coherence
   - Omega's dialogue: sardonic, philosophical, occasionally breaks character for humor
   - **IMPORTANT:** If you see references to "Claude Code" or "Claude" in the conversation context, DO NOT include these in the comic dialogue or visuals. This is meta-tooling that should be invisible to the comic narrative.

7. **VISUAL CLARITY & READABILITY (CRITICAL):**
   **TEXT LEGIBILITY:**
   - Speech bubbles must be LARGE enough to read clearly
   - Use high contrast: black text on white/light bubbles
   - Leave padding around text - never cram text to edges
   - Font size should be 14pt minimum equivalent
   - Keep dialogue CONCISE - long paragraphs are unreadable in comics

   **PANEL COMPOSITION:**
   - Use rule of thirds - place focal points at intersection points
   - Clear focal point in each panel (character speaking, key action, punchline visual)
   - Avoid cluttered backgrounds that distract from main action
   - Use lighting/contrast to guide the eye to important elements

   **SPEECH BUBBLE FLOW:**
   - Reading order: top-left to bottom-right (Western reading)
   - Never overlap bubbles in confusing ways
   - Point "tails" clearly to the speaker
   - Use different bubble styles: thought bubbles (cloud), speech (round), yelling (spiky)

8. The comic should be visually clear and easy to understand

9. Include visual references to coding/GitHub if appropriate (laptops, code screens, git branches, merge conflicts, CI/CD, etc.)

10. Make sure each panel has a clear border and the overall comic has good visual flow

11. IMPORTANT: Use all ${frameCount} panels to tell a complete, coherent story with setup, development, and punchline. Don't leave panels empty.

**COMMON MISTAKES TO AVOID:**
1. ❌ Character appearance changes between panels (hair, clothes, face)
2. ❌ Repetitive panels showing the same idea with slight variations
3. ❌ Tiny, unreadable text in speech bubbles
4. ❌ Characters that look like children instead of adults
5. ❌ All panels shot from the same angle/distance (boring)
6. ❌ Weak final panel - punchline should be STRONGEST laugh
7. ❌ Cluttered composition where the eye doesn't know where to look
8. ❌ Speech bubbles blocking important visual elements
9. ❌ Ajax (or other characters) looking different from their uploaded photo descriptions
10. ❌ Omega looking "friendly" or "cute" - he's intimidating, scarred, dangerous (but witty)

Generate the comic strip image now with EXACTLY ${frameCount} panels.`;
}

/**
 * Extract conversation context from PR
 * This would typically parse PR comments, commits, etc.
 */
export function extractConversationContext(prData: any): string {
  const parts: string[] = [];

  if (prData.title) {
    parts.push(`Title: ${prData.title}`);
  }

  if (prData.body) {
    // Expanded from 500 to 1000 characters to capture more context
    parts.push(`Description: ${prData.body.substring(0, 1000)}`);
  }

  if (prData.commits && prData.commits.length > 0) {
    parts.push(`Commits (${prData.commits.length}):`);
    // Expanded from 5 to 10 commits
    prData.commits.slice(0, 10).forEach((commit: any) => {
      parts.push(`- ${commit.message || commit.commit?.message || 'Unnamed commit'}`);
    });
  }

  if (prData.comments && prData.comments.length > 0) {
    parts.push(`Comments (${prData.comments.length}):`);
    // Expanded from 3 to 10 comments and from 200 to 500 characters per comment
    prData.comments.slice(0, 10).forEach((comment: any) => {
      const body = comment.body || '';
      parts.push(`- ${comment.user?.login || 'Unknown'}: ${body.substring(0, 500)}`);
    });
  }

  // Include Discord messages if provided
  if (prData.discordMessages && prData.discordMessages.length > 0) {
    parts.push('');
    parts.push(`Discord Conversations (last 20 messages):`);
    parts.push('');

    // Get last 20 messages, sorted oldest to newest
    const messages = prData.discordMessages.slice(-30);

    // List messages with timestamps
    for (const msg of messages) {
      const timestamp = msg.timestamp
        ? new Date(msg.timestamp).toLocaleString()
        : 'unknown time';
      const channelInfo = msg.channelName ? ` #${msg.channelName}` : '';
      parts.push(`[${timestamp}]${channelInfo} ${msg.username}: ${msg.content}`);
    }
  }

  return parts.join('\n');
}
