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
 * Returns comprehensive psychological and phenotype data for ALL users
 */
async function fetchAllUserProfiles(): Promise<CharacterAppearance[]> {
  try {
    // Determine Omega API base URL
    const OMEGA_API_URL = process.env.OMEGA_API_URL || 'https://omega-vu7a.onrailway.app';
    const url = `${OMEGA_API_URL}/api/profiles-full`;

    console.log(`🔍 Fetching ALL user profiles from ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`⚠️ Failed to fetch user profiles: ${response.status} ${response.statusText}`);
      return [];
    }

    const data: any = await response.json();

    if (!data.success || !data.profiles) {
      console.warn('⚠️ Invalid response from Omega API:', data);
      return [];
    }

    console.log(`✅ Fetched complete profiles for ${data.profiles.length} users`);

    // Convert profiles-full format to CharacterAppearance format
    return data.profiles.map((profile: any) => ({
      userId: profile.userId,
      username: profile.username,
      description: profile.aiAppearanceDescription ||
        `${profile.aiDetectedGender || 'person'} with ${profile.hairColor || 'hair'}, ${profile.eyeColor || 'eyes'}`,
      gender: profile.aiDetectedGender,
      hairColor: profile.hairColor,
      hairStyle: profile.hairStyle,
      hairTexture: profile.hairTexture,
      eyeColor: profile.eyeColor,
      skinTone: profile.skinTone,
      faceShape: profile.faceShape,
      bodyType: profile.bodyType,
      buildDescription: profile.buildDescription,
      heightEstimate: profile.heightEstimate,
      facialHair: profile.facialHair,
      clothingStyle: profile.clothingStyle,
      accessories: profile.accessories,
      distinctiveFeatures: profile.distinctiveFeatures,
      aestheticArchetype: profile.aestheticArchetype,
      // Include psychological data for richer character portrayal
      dominantArchetype: profile.dominantArchetype,
      communicationStyle: profile.communicationFormality,
      humorStyle: profile.humorStyle,
      affinityScore: profile.affinityScore,
    }));
  } catch (error) {
    console.error('❌ Error fetching user profiles:', error);
    return [];
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

    // Fetch ALL user profiles (not just specific users)
    // This gives Gemini complete context about all Discord community members
    let characterAppearances: CharacterAppearance[] = [];
    console.log('📊 Fetching complete user profile database for comic context...');
    characterAppearances = await fetchAllUserProfiles();

    // Initialize Gemini API client
    const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Build the prompt for comic generation with character data
    const prompt = buildComicPrompt(conversationContext, prNumber, prTitle, prAuthor, characterAppearances);

    console.log('📝 Comic generation prompt:', prompt.substring(0, 200) + '...');

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
 * Build character design sections from ALL user profile data
 * Includes both phenotype (physical) and psychological characteristics
 */
function buildCharacterDesignSections(characters: CharacterAppearance[]): string {
  if (!characters || characters.length === 0) {
    return '';
  }

  const header = `\n\n**COMPLETE DISCORD COMMUNITY CHARACTER DATABASE**
You have access to comprehensive profiles for ALL Discord community members.
Choose which characters to include based on the conversation context.
Each character has detailed physical appearance and psychological traits:
\n`;

  const sections = characters.map((char) => {
    const physicalFeatures: string[] = [];
    const psychologicalTraits: string[] = [];

    // Physical appearance
    if (char.gender) {
      physicalFeatures.push(`Gender: ${char.gender}`);
    }
    if (char.hairColor && char.hairStyle) {
      physicalFeatures.push(`Hair: ${char.hairColor}, ${char.hairStyle} style${char.hairTexture ? `, ${char.hairTexture} texture` : ''}`);
    }
    if (char.eyeColor) {
      physicalFeatures.push(`Eyes: ${char.eyeColor}`);
    }
    if (char.skinTone) {
      physicalFeatures.push(`Skin tone: ${char.skinTone}`);
    }
    if (char.faceShape) {
      physicalFeatures.push(`Face shape: ${char.faceShape}`);
    }
    if (char.heightEstimate && char.buildDescription) {
      physicalFeatures.push(`Build: ${char.heightEstimate} height, ${char.buildDescription} build`);
    } else if (char.buildDescription) {
      physicalFeatures.push(`Build: ${char.buildDescription}`);
    }
    if (char.facialHair) {
      physicalFeatures.push(`Facial hair: ${char.facialHair}`);
    }
    if (char.distinctiveFeatures && char.distinctiveFeatures.length > 0) {
      physicalFeatures.push(`Distinctive: ${char.distinctiveFeatures.join(', ')}`);
    }
    if (char.clothingStyle) {
      physicalFeatures.push(`Style: ${char.clothingStyle}`);
    }
    if (char.aestheticArchetype) {
      physicalFeatures.push(`Aesthetic: ${char.aestheticArchetype}`);
    }

    // Psychological characteristics
    if (char.dominantArchetype) {
      psychologicalTraits.push(`Archetype: ${char.dominantArchetype}`);
    }
    if (char.communicationStyle) {
      psychologicalTraits.push(`Communication: ${char.communicationStyle}`);
    }
    if (char.humorStyle) {
      psychologicalTraits.push(`Humor: ${char.humorStyle}`);
    }
    if (char.affinityScore !== undefined) {
      psychologicalTraits.push(`Omega affinity: ${char.affinityScore}/100`);
    }

    const physicalSection = physicalFeatures.length > 0
      ? `\n  Physical: ${physicalFeatures.join(', ')}`
      : '';

    const psychSection = psychologicalTraits.length > 0
      ? `\n  Personality: ${psychologicalTraits.join(', ')}`
      : '';

    return `${char.username}: ${char.description}${physicalSection}${psychSection}`;
  }).join('\n\n');

  return header + sections;
}

/**
 * Build the prompt for comic generation
 */
function buildComicPrompt(
  conversationContext: string,
  prNumber: number,
  prTitle: string,
  prAuthor: string,
  characterAppearances: CharacterAppearance[] = []
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
        lowerLine.match(/lint\s*(passed|succeeded|successful|passing)/)
      );
    })
    .join('\n');

  // Determine optimal frame count based on context
  const frameCount = determineFrameCount(conversationContext);

  // 20% chance to include a super-deformed/chibi panel
  const includeSuperDeformed = Math.random() < 0.2;

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

  // Build super-deformed panel instruction if applicable
  const superDeformedInstruction = includeSuperDeformed
    ? `

**SPECIAL INSTRUCTION - Super-Deformed Panel:**
Include ONE panel with a humorous "super-deformed" (SD) or "chibi" style moment where characters are drawn in an exaggerated, cute, simplified form (big heads, tiny bodies). This panel should contain a text box with:

"ChatGPT said:

That effect is usually called 'super-deformed' (SD) or 'chibi.'

💡 What it means

Super-Deformed (SD): The original Japanese/industry term. Characters shrink into tiny, exaggerated, cute versions of themselves—big heads, tiny bodies.

Chibi: The more commonly used fan term today. Same idea: a mini, adorable, simplified version of the character for comedic effect."

This meta-commentary panel should break the fourth wall in a humorous way, showing the characters in super-deformed style while explaining what super-deformed means.
`
    : '';

  // Build character design sections
  const characterDesigns = buildCharacterDesignSections(characterAppearances);

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
  * Expressionless mask face with minimal red light features, no mouth/nose, intimidating slits or glowing points
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
${characterDesigns}
${superDeformedInstruction}
**Instructions:**
1. Create a comic with EXACTLY ${frameCount} panels based on the conversation complexity.
   Layout: ${layoutDescription}

2. Panel distribution guide for ${frameCount} panels:
   ${frameCount === 3 ? '- Beginning, middle, end structure' : ''}
   ${frameCount === 4 ? '- Introduction, development, climax, conclusion' : ''}
   ${frameCount === 5 ? '- Extended story with setup, development, twist, climax, resolution' : ''}
   ${frameCount === 6 ? '- Complex narrative with multiple perspectives or parallel storylines' : ''}
   ${frameCount === 7 ? '- Rich story with detailed progression and multiple character interactions' : ''}

3. Use a fun, lighthearted art style (cartoon/comic book style)

4. **CHARACTER SELECTION FROM DATABASE:**
   - Review the complete character database above
   - Choose 1-3 characters relevant to the PR conversation
   - Use ACCURATE physical descriptions from their profiles (hair color, eye color, build, style, etc.)
   - Incorporate their personality traits (archetype, humor style, communication style) into dialogue and expressions
   - If the conversation involves the AI/bot, depict it as Omega with the unique design above
   - Keep each character's appearance CONSISTENT with their database profile

5. Add speech bubbles with witty dialogue based on:
   - The PR conversation context
   - Each character's communication style and humor type from their psychological profile

6. Keep it family-friendly and professional

7. The comic should be visually clear and easy to understand

8. Include visual references to coding/GitHub if appropriate (laptops, code screens, git branches, etc.)

9. Make sure each panel has a clear border and the overall comic has good visual flow

10. IMPORTANT: Use all ${frameCount} panels to tell a complete story. Don't leave panels empty.

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
