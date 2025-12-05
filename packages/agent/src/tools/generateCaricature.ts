/**
 * Generate Caricature Tool
 * Creates cartoonish caricatures by combining user's uploaded photo and personality data
 * Produces exaggerated images reflecting distinctive traits and expressions
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getUserProfile } from '@repo/database';
import { analyzeUser } from '../services/userProfileAnalysis.js';
import { generateImageWithGemini } from '../services/geminiImageService.js';
import { buildCaricaturePrompt, buildGenericCaricaturePrompt } from '../lib/caricaturePrompts.js';
import { getDetailedCharacterDescription } from '../lib/userAppearance.js';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { getUploadsDir } from '@repo/shared';

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';
const GITHUB_STORAGE_PATH = 'user-caricatures';

/**
 * Upload caricature to GitHub
 */
async function uploadCaricatureToGitHub(
  imageBuffer: Buffer,
  userId: string,
  username: string
): Promise<{ githubUrl: string; rawUrl: string }> {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token not configured. Cannot upload caricatures.');
  }

  const timestamp = Date.now();
  const filename = `caricature-${userId}-${timestamp}.png`;
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
          message: `Generate caricature for ${username}`,
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

    console.log(`   ✅ Uploaded caricature to GitHub: ${githubUrl}`);

    return { githubUrl, rawUrl };
  } catch (error) {
    console.error('Error uploading caricature to GitHub:', error);
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
 * Generate Caricature Tool
 */
export const generateCaricatureTool = tool({
  description: `Generate a caricature that cartoonishly exaggerates the user's features based on their photo and personality.

  The caricature combines:
  - Uploaded photo (if available) with exaggerated distinctive features
  - Personality profile (archetypes, traits) manifested visually
  - Omega's perception and feelings about the user

  Exaggeration levels:
  - subtle: Gentle caricature style, mostly realistic proportions (editorial cartoon)
  - moderate: Classic caricature with clear exaggeration (default)
  - extreme: Wild exaggeration for maximum comedic effect (political cartoon/MAD Magazine)

  The caricature is playful and fun, not mean-spirited. It emphasizes the most distinctive
  physical and personality features while maintaining recognizability.

  Use when:
  - User asks for a "caricature", "cartoon version", or "exaggerated drawing" of themselves
  - User wants to see a humorous exaggerated interpretation
  - Creating fun personalized artwork based on appearance and personality`,

  inputSchema: z.object({
    userId: z.string().describe('Discord user ID'),
    username: z.string().describe('Discord username'),
    exaggerationLevel: z
      .enum(['subtle', 'moderate', 'extreme'])
      .default('moderate')
      .describe('How much to exaggerate features'),
  }),

  execute: async ({ userId, username, exaggerationLevel }) => {
    console.log(`🎨 Generating ${exaggerationLevel} caricature for ${username}...`);

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

      // 3. Parse feelings and personality
      const { appearance, personality, feelings } = getDetailedCharacterDescription(profile);

      // 4. Build caricature prompt
      let prompt: string;
      if (profile.ai_appearance_description && (profile.appearance_confidence || 0) > 0.7) {
        // Use photo-based caricature prompt
        console.log('   Using photo-based caricature prompt');
        prompt = buildCaricaturePrompt(profile, feelings, personality, exaggerationLevel);
      } else {
        // Use personality-based caricature prompt
        console.log('   Using personality-based caricature prompt (no photo available)');
        prompt = buildGenericCaricaturePrompt(feelings, personality, username, exaggerationLevel);
      }

      console.log(`   Prompt: ${prompt.substring(0, 150)}...`);

      // 5. Generate caricature with Gemini
      console.log('   Generating caricature with Gemini...');
      const imageResult = await generateImageWithGemini({ prompt });

      if (!imageResult.success || !imageResult.imageBuffer) {
        return {
          success: false,
          error: imageResult.error || 'Failed to generate caricature',
          message:
            'Caricature generation failed. This might be because Gemini image generation is experimental. Please try again later.',
        };
      }

      // 6. Upload to GitHub
      console.log('   Uploading caricature to GitHub...');
      const { githubUrl, rawUrl } = await uploadCaricatureToGitHub(
        imageResult.imageBuffer,
        userId,
        username
      );

      // 7. Save backup locally
      const uploadsDir = getUploadsDir();
      const localFilename = `caricature-${userId}-${Date.now()}.png`;
      const localPath = join(uploadsDir, localFilename);
      const fs = await import('fs');
      fs.writeFileSync(localPath, imageResult.imageBuffer);
      console.log(`   💾 Backup saved locally: ${localPath}`);

      console.log(`   ✅ Caricature generated successfully!`);

      // Format response message
      const exaggerationDesc = exaggerationLevel === 'extreme'
        ? 'wildly exaggerated'
        : exaggerationLevel === 'subtle'
        ? 'gently exaggerated'
        : 'cartoonishly exaggerated';

      const featureNote = profile.ai_appearance_description
        ? 'based on your photo and personality'
        : 'based on your personality (upload a photo for even better results!)';

      return {
        success: true,
        caricatureUrl: rawUrl,
        githubUrl: githubUrl,
        exaggerationLevel: exaggerationLevel,
        affinityScore: feelings.affinityScore,
        trustLevel: feelings.trustLevel,
        message: `Here's your ${exaggerationDesc} caricature, ${username}!\n\n**Caricature:** ${rawUrl}\n\nThis playful drawing is ${featureNote}. It emphasizes your most distinctive features and personality traits for comedic effect!\n\n**How Omega sees you:** "${feelings.thoughts.substring(0, 150)}${feelings.thoughts.length > 150 ? '...' : ''}"\n**Trust level:** ${feelings.trustLevel}/100\n**Affinity:** ${feelings.affinityScore}/100`,
      };
    } catch (error) {
      console.error('Failed to generate caricature:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Caricature generation encountered an error. Please try again.',
      };
    }
  },
});
