/**
 * Gemini Image Generation Service
 *
 * Uses Google's Gemini API (via @google/genai) to generate images
 * based on prompts derived from GitHub issues or PR descriptions.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { formatMultipleCharacters, type UserCharacter } from '../lib/userAppearance.js';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

export interface GeminiImageOptions {
  prompt: string;
  outputPath?: string;
  negativePrompt?: string;
}

export interface GeminiImageResult {
  success: boolean;
  imagePath?: string;
  imageBuffer?: Buffer;
  error?: string;
}

/**
 * Generate an image using Gemini's Nanobanana API
 */
export async function generateImageWithGemini(
  options: GeminiImageOptions
): Promise<GeminiImageResult> {
  const { prompt, outputPath, negativePrompt } = options;

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return {
      success: false,
      error: 'GEMINI_API_KEY is not configured',
    };
  }

  try {
    // Initialize Gemini client
    const genai = new GoogleGenerativeAI(GEMINI_API_KEY);

    // Request image generation with text and image modalities
    const fullPrompt = negativePrompt
      ? `${prompt}\n\nNegative prompt: ${negativePrompt}`
      : prompt;

    // Get the generative model (use same model as comic generation)
    const model = genai.getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
    });

    // Retry logic for transient 429 rate limit errors
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 [Gemini] Retry attempt ${attempt}/${MAX_RETRIES}...`);
        }

        // Generate content
        const result = await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: fullPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            // Note: Image generation with Gemini is still experimental
            // This configuration may need adjustment based on the actual API
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
          },
        });

        // Extract image data from response
        const imageParts = result.response.candidates?.[0]?.content?.parts?.filter(
          (part: any) => part.inlineData?.mimeType?.startsWith('image/')
        );

        if (!imageParts || imageParts.length === 0) {
          return {
            success: false,
            error: 'No image generated in response. Note: Gemini image generation may require specific API access.',
          };
        }

        const imagePart = imageParts[0];
        const imageData = (imagePart as any).inlineData?.data;

        if (!imageData) {
          return {
            success: false,
            error: 'Image data not found in response',
          };
        }

        const imageBuffer = Buffer.from(imageData, 'base64');

        if (outputPath) {
          const outputDir = path.dirname(outputPath);
          await mkdir(outputDir, { recursive: true });
          await writeFile(outputPath, imageBuffer);

          return {
            success: true,
            imagePath: outputPath,
            imageBuffer,
          };
        }

        return {
          success: true,
          imageBuffer,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const errorMsg = lastError.message;

        // Check if this is a 429 rate limit error
        const is429 = errorMsg.includes('429') && errorMsg.includes('Too Many Requests');

        if (!is429) {
          // Non-rate-limit error — don't retry
          break;
        }

        // Check for permanent quota exhaustion (free tier with limit: 0)
        const isFreeTierZeroQuota = errorMsg.includes('free_tier') && errorMsg.includes('limit: 0');
        if (isFreeTierZeroQuota) {
          console.error('🚫 [Gemini] Free tier quota is 0 — API key needs billing enabled for this model');
          return {
            success: false,
            error: 'Gemini API key is on the free tier with zero quota for gemini-3-pro-image. Please enable billing on the Google Cloud project associated with GEMINI_API_KEY.',
          };
        }

        if (attempt >= MAX_RETRIES) {
          console.error(`❌ [Gemini] All ${MAX_RETRIES} retries exhausted for rate limit error`);
          break;
        }

        // Parse retry delay from error message if available
        const retryMatch = errorMsg.match(/retry in ([\d.]+)s/i);
        const retryDelaySec = retryMatch ? Math.min(parseFloat(retryMatch[1]), 60) : null;
        const backoffDelay = retryDelaySec ? retryDelaySec * 1000 : (5000 * Math.pow(2, attempt));

        console.log(`⏳ [Gemini] Rate limited. Waiting ${(backoffDelay / 1000).toFixed(1)}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }

    // All retries exhausted or non-retryable error
    console.error('Error generating image with Gemini:', lastError);
    return {
      success: false,
      error: lastError?.message || 'Unknown error generating image',
    };
  } catch (error) {
    console.error('Error generating image with Gemini:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate comic with user characters included
 */
export async function generateComicWithUsers(
  scenario: string,
  userProfiles: UserCharacter[]
): Promise<GeminiImageResult> {
  // Build character descriptions for the comic using shared formatting
  const characterDescriptions = formatMultipleCharacters(userProfiles);

  const comicPrompt = `Create a humorous comic illustration:

PRIMARY FOCUS - Base the comic on this specific scenario:
${scenario}

Characters (secondary context for visual representation):
${characterDescriptions}

Style: Digital comic art, vibrant colors, expressive cartoon characters, developer/tech humor
Include: Speech bubbles, character interactions, visual humor, expressive faces
Ensure: Each character is visually distinct and matches their description

IMPORTANT: Focus primarily on illustrating the scenario above. Use character context only for accurate visual representation.

Make it entertaining and capture the personalities!`;

  return generateImageWithGemini({ prompt: comicPrompt });
}

/**
 * Generate a comic-style image from issue/PR content
 */
export async function generateComicFromIssue(
  issueTitle: string,
  issueBody: string,
  issueNumber: number
): Promise<GeminiImageResult> {
  // Create a comic-style prompt from the issue
  const comicPrompt = `Create a humorous comic illustration about this software development task:

PRIMARY FOCUS - Illustrate this specific issue:

Issue #${issueNumber}: ${issueTitle}

${issueBody}

Style: Digital comic art, vibrant colors, funny cartoon characters, developer humor
Theme: Software development, coding, debugging, tech humor
Include: Speech bubbles, expressive characters, visual jokes

IMPORTANT: Focus the comic on the issue content above. Do not include unrelated conversation context.

Make it entertaining and relatable to software developers!`;

  // Generate filename based on issue number
  const timestamp = Date.now();
  const filename = `comic-issue-${issueNumber}-${timestamp}.png`;
  const outputPath = path.join(process.cwd(), 'generated-images', filename);

  return generateImageWithGemini({
    prompt: comicPrompt,
    outputPath,
  });
}
