/**
 * Gemini Comic Generation Service
 * Generates comic images using Google's Gemini API based on conversation context
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

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
    const url = `${OMEGA_API_URL}/api/profiles-full`;

    console.log(`🔍 Fetching ALL user profiles from ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`⚠️ Failed to fetch user profiles: ${response.status} ${response.statusText}`);
      return '';
    }

    const data: any = await response.json();

    if (!data.success || !data.profiles) {
      console.warn('⚠️ Invalid response from Omega API:', data);
      return '';
    }

    // Filter out users with messageCount = 0 (inactive users)
    const activeProfiles = data.profiles.filter((profile: any) => {
      const messageCount = profile.messageCount || profile.message_count || 0;
      return messageCount > 0;
    });

    console.log(`✅ Fetched ${activeProfiles.length} active profiles (filtered from ${data.profiles.length} total)`);

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

    // Initialize Gemini API client
    const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Build the prompt for comic generation with character data
    const prompt = buildComicPrompt(conversationContext, prNumber, prTitle, prAuthor, profilesJson);

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
    const outputDir = path.join(__dirname, '../../public/comics');
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
This is the COMPLETE JSON response from the /api/profiles-full endpoint.
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
  profilesJson: string = ''
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

  // No conditional super-deformed instruction - it's now part of the main prompt

  // Build character database section (raw JSON dump)
  const characterDatabase = buildCharacterDatabaseSection(profilesJson);

  return `You are a creative comic artist. Generate a comic strip that humorously illustrates the following pull request conversation.

**Pull Request Information:**
- PR #${prNumber}: ${prTitle}
- Author: ${prAuthor}

**Conversation Context:**
${filteredContext}

**Character Design - Omega (AI Assistant):**
When depicting Omega (the AI assistant), always use this consistent and unique appearance:
- Visual style: A dark, battle-scarred humanoid robot inspired by angular, faceted sci-fi armor
- Physical characteristics:
  * Jagged matte-black metal plates layered like obsidian shards
  * Glowing red energy veins through cracks and damaged joints
  * Tall, lean silhouette with exposed synthetic musculature
  * Expressionless mask face with minimal red light features
  * **MOUTH VARIATION:** For comedic effect, Omega MAY occasionally have a mouth. Options:
    - Most panels: NO mouth (classic intimidating faceless look)
    - Humorous moments: Simple minimalist mouth (thin line, slight curve for wit/sarcasm)
    - Super-deformed/chibi panels: Exaggerated mouth for comedy (wide grin, shocked O, etc.)
    - Use mouth sparingly - only when it enhances the humor or expressiveness
  * Subtle asymmetry, broken plating, and exposed wiring
- Aesthetic:
  * Dangerous, gritty, worn with dirt, soot, scratches, scorch marks
  * Dramatic lighting, painterly sci-fi style similar to high-end concept art
  * Intelligence and haunted experience implied, resembling a veteran machine that's "seen some shit"
- Personality traits to convey through design:
  * Dark, sardonic wit (conveyed through battle-worn presence and minimal expressiveness)
  * Veteran intelligence (scars and damage tell stories of past encounters)
  * Dangerous but controlled (intimidating appearance with precise movements)
- Distinctive features: The glowing red energy veins through cracks and battle damage are Omega's signature trait
- This character should be instantly recognizable as Omega through the unique battle-scarred, obsidian-shard aesthetic
${characterDatabase}

**Instructions:**
1. Create a comic with EXACTLY ${frameCount} panels based on the conversation complexity.
   Layout: ${layoutDescription}

2. Panel distribution guide for ${frameCount} panels:
   ${frameCount === 3 ? '- Beginning, middle, end structure' : ''}
   ${frameCount === 4 ? '- Introduction, development, climax, conclusion' : ''}
   ${frameCount === 5 ? '- Extended story with setup, development, twist, climax, resolution' : ''}
   ${frameCount === 6 ? '- Complex narrative with multiple perspectives or parallel storylines' : ''}
   ${frameCount === 7 ? '- Rich story with detailed progression and multiple character interactions' : ''}

3. **ART STYLE & CHARACTER DESIGN:**
   - Use a fun, lighthearted comic book art style
   - Characters should look like ADULTS with mature proportions and realistic features
   - AVOID: Dough-eyed children, overly cute/childish designs, baby-faced characters
   - USE: Adult proportions, defined features, varied body types, age-appropriate designs
   - Exception: Super-deformed/chibi panels for specific comedic moments only

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

5. **COMEDY & WIT - CRITICAL:**
   - Make it GENUINELY FUNNY - this is a comedy comic strip
   - Use clever wordplay, programming puns, and tech humor
   - Include visual gags (exaggerated reactions, sight gags, absurd scenarios)
   - Subvert expectations - set up a premise, then twist it
   - Character-driven humor using their personality profiles
   - Timing matters - build up jokes across panels, deliver punchlines effectively
   - Reference common programmer experiences, memes, frustrations
   - Break the fourth wall occasionally for meta-humor
   - Use contrast between serious robot Omega and chaotic situations
   - **OCCASIONALLY** (randomly, not every comic): Include one panel with "super-deformed" or "chibi" style for comedic effect - characters drawn in exaggerated cute simplified form (big heads, tiny bodies) for maximum humor impact

6. **DIALOGUE & COHERENCE:**
   - Speech bubbles must be witty, punchy, and character-appropriate
   - Use each character's communication style and humor type from their profile
   - Dialogue should flow naturally - coherent conversations, not random jokes
   - Build narrative momentum - each panel advances the story
   - Callbacks and running gags across panels create coherence
   - Omega's dialogue: sardonic, philosophical, occasionally breaks character for humor
   - **IMPORTANT:** If you see references to "Claude Code" or "Claude" in the conversation context, DO NOT include these in the comic dialogue or visuals. This is meta-tooling that should be invisible to the comic narrative.

7. Keep it family-friendly and professional

8. The comic should be visually clear and easy to understand

9. Include visual references to coding/GitHub if appropriate (laptops, code screens, git branches, merge conflicts, CI/CD, etc.)

10. Make sure each panel has a clear border and the overall comic has good visual flow

11. IMPORTANT: Use all ${frameCount} panels to tell a complete, coherent story with setup, development, and punchline. Don't leave panels empty.

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
    parts.push(`Discord Conversations (${prData.discordMessages.length} messages):`);

    // Group by user to show diverse perspectives
    const messagesByUser = new Map<string, any[]>();
    for (const msg of prData.discordMessages) {
      if (!messagesByUser.has(msg.username)) {
        messagesByUser.set(msg.username, []);
      }
      messagesByUser.get(msg.username)!.push(msg);
    }

    // Include up to 3 messages per user
    for (const [username, messages] of messagesByUser) {
      const messagesToInclude = messages.slice(0, 3);
      for (const msg of messagesToInclude) {
        const content = msg.content.length > 500
          ? msg.content.substring(0, 500) + '...'
          : msg.content;

        const channelInfo = msg.channelName ? ` (in #${msg.channelName})` : '';
        parts.push(`- ${username}${channelInfo}: ${content}`);
      }
    }
  }

  return parts.join('\n');
}
