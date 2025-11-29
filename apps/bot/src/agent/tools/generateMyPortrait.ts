/**
 * Generate My Portrait Tool
 * Creates artistic portraits based on Omega's perception of the user
 * Combines uploaded photo (if available), feelings, and personality assessment
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getUserProfile, getOrCreateUserProfile } from '../../database/userProfileService.js';
import { analyzeUser } from '../../services/userProfileAnalysis.js';
import { generateImageWithGemini } from '../../services/geminiImageService.js';
import { buildPortraitPrompt, buildGenericPortraitPrompt } from '../../lib/portraitPrompts.js';
import { enhancePortraitPrompt } from '../../lib/portraitPromptEnhancer.js';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { getUploadsDir } from '../../utils/storage.js';

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';
const GITHUB_STORAGE_PATH = 'user-portraits';

/**
 * Upload portrait to GitHub
 */
async function uploadPortraitToGitHub(
  imageBuffer: Buffer,
  userId: string,
  username: string
): Promise<{ githubUrl: string; rawUrl: string }> {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token not configured. Cannot upload portraits.');
  }

  const timestamp = Date.now();
  const filename = `portrait-${userId}-${timestamp}.png`;
  const filePath = `${GITHUB_STORAGE_PATH}/${filename}`;
  const base64Content = imageBuffer.toString('base64');

  try {
    const uploadResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          message: `Generate portrait for ${username}`,
          content: base64Content,
        }),
      }
    );

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`GitHub API error: ${uploadResponse.status} - ${error}`);
    }

    const uploadData: any = await uploadResponse.json();
    const githubUrl = uploadData.content.html_url;
    const rawUrl = uploadData.content.download_url;

    console.log(`   ✅ Uploaded portrait to GitHub: ${githubUrl}`);

    return { githubUrl, rawUrl };
  } catch (error) {
    console.error('Error uploading portrait to GitHub:', error);
    throw error;
  }
}

/**
 * Ensure user profile is fresh (analyze if stale)
 */
async function ensureProfileFresh(userId: string, username: string): Promise<void> {
  const profile = await getUserProfile(userId);

  if (!profile) {
    console.log('   No profile found, creating and analyzing...');
    await analyzeUser(userId, username);
    return;
  }

  // Check if analysis is stale (> 24 hours)
  const now = Math.floor(Date.now() / 1000);
  const dayInSeconds = 24 * 60 * 60;

  if (!profile.last_analyzed_at || now - profile.last_analyzed_at > dayInSeconds) {
    console.log('   Profile is stale (> 24h), re-analyzing...');
    await analyzeUser(userId, username);
  } else {
    console.log('   Profile is fresh (< 24h)');
  }
}

/**
 * Generate My Portrait Tool
 */
export const generateMyPortraitTool = tool({
  description: `Generate an artistic portrait of the user based on Omega's perception and feelings about them.

  The portrait combines:
  - Uploaded photo appearance (if user has uploaded a photo) - PRIMARY
  - Omega's feelings about the user (trust level, affinity score, personality assessment) - if available
  - Artistic interpretation of how Omega "sees" the user based on interactions

  Works even with minimal or no interaction history - the portrait will be based primarily on appearance
  with personality/feelings layered in as they develop over time.

  Available styles:
  - realistic: Photorealistic digital portrait
  - comic: Comic book art style with vibrant colors
  - artistic: Painterly fine art portrait (default)
  - abstract: Abstract/conceptual representation

  Use when:
  - User asks for "my portrait", "draw me", "how do you see me"
  - User wants to see Omega's artistic interpretation of them
  - Creating personalized art for the user`,

  inputSchema: z.object({
    userId: z.string().describe('Discord user ID'),
    username: z.string().describe('Discord username'),
    style: z
      .enum(['realistic', 'comic', 'artistic', 'abstract'])
      .default('artistic')
      .describe('Portrait style'),
  }),

  execute: async ({ userId, username, style }) => {
    console.log(`🎨 Generating portrait for ${username} in ${style} style...`);

    try {
      // 1. Ensure profile exists and is fresh
      await ensureProfileFresh(userId, username);

      // 2. Get user profile
      const profile = await getUserProfile(userId);

      if (!profile) {
        return {
          success: false,
          error: 'Could not load user profile. This should not happen after ensuring profile exists.',
        };
      }

      // 3. Parse feelings and personality (optional - will use defaults if not available)
      const feelings = profile.feelings_json ? JSON.parse(profile.feelings_json) : {
        affinityScore: 50,
        trustLevel: 50,
        thoughts: 'A new friend I\'m getting to know',
      };
      const personality = profile.personality_facets ? JSON.parse(profile.personality_facets) : {
        dominantArchetypes: ['Everyman'],
        communicationStyle: { formality: 'neutral' },
      };

      // 4. Build portrait prompt
      let basePrompt: string;
      if (profile.ai_appearance_description && profile.appearance_confidence > 0.7) {
        // Use photo-based prompt
        console.log('   Using photo-based portrait prompt');
        basePrompt = buildPortraitPrompt(profile, feelings, personality, style);
      } else {
        // Use generic personality-based prompt
        console.log('   Using generic personality-based portrait prompt');
        basePrompt = buildGenericPortraitPrompt(feelings, personality, username, style);
      }

      // 4.5. Enhance prompt with user context analysis (gender, features, style)
      const prompt = await enhancePortraitPrompt(basePrompt, userId, username, profile);

      console.log(`   Final prompt: ${prompt.substring(0, 200)}...`);

      // 5. Generate portrait with Gemini
      console.log('   Generating portrait with Gemini...');
      const imageResult = await generateImageWithGemini({ prompt });

      if (!imageResult.success || !imageResult.imageBuffer) {
        return {
          success: false,
          error: imageResult.error || 'Failed to generate portrait',
          message:
            'Portrait generation failed. This might be because Gemini image generation is experimental. Please try again later.',
        };
      }

      // 6. Upload to GitHub
      console.log('   Uploading portrait to GitHub...');
      const { githubUrl, rawUrl } = await uploadPortraitToGitHub(
        imageResult.imageBuffer,
        userId,
        username
      );

      // 7. Save backup locally
      const uploadsDir = getUploadsDir();
      const localFilename = `portrait-${userId}-${Date.now()}.png`;
      const localPath = join(uploadsDir, localFilename);
      const fs = await import('fs');
      fs.writeFileSync(localPath, imageResult.imageBuffer);
      console.log(`   💾 Backup saved locally: ${localPath}`);

      console.log(`   ✅ Portrait generated successfully!`);

      // Format thoughts for display
      const thoughtsPreview =
        feelings.thoughts.length > 150
          ? feelings.thoughts.substring(0, 147) + '...'
          : feelings.thoughts;

      // Customize message based on interaction history
      const interactionNote = profile.message_count > 10
        ? `This portrait reflects not just your appearance but how I perceive your essence based on our ${profile.message_count} interactions.`
        : profile.message_count > 0
        ? `This portrait is based on your appearance${profile.feelings_json ? ' and my initial impressions of you' : ''}.`
        : `This portrait is based on your appearance. Chat with me more and I'll develop deeper insights about you!`;

      return {
        success: true,
        portraitUrl: rawUrl,
        githubUrl: githubUrl,
        style: style,
        omegaThoughts: feelings.thoughts,
        affinityScore: feelings.affinityScore,
        trustLevel: feelings.trustLevel,
        message: `Here's how I see you, ${username}!\n\n**My thoughts about you:**\n"${thoughtsPreview}"\n\n**Trust level:** ${feelings.trustLevel}/100\n**Affinity:** ${feelings.affinityScore}/100\n\n**Portrait:** ${rawUrl}\n\n${interactionNote}`,
      };
    } catch (error) {
      console.error('Failed to generate portrait:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Portrait generation encountered an error. Please try again.',
      };
    }
  },
});
