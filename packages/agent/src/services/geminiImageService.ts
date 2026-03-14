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

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 5000;

/**
 * Extract retry delay from a Gemini 429 error message, if available.
 * Returns delay in milliseconds, or null if not found.
 */
function extractRetryDelay(errorMessage: string): number | null {
  // Match "Please retry in Xs" or "retryDelay":"Xs"
  const match = errorMessage.match(/retry\s+in\s+([\d.]+)s/i)
    || errorMessage.match(/"retryDelay"\s*:\s*"([\d.]+)s"/i);
  if (match) {
    const seconds = parseFloat(match[1]);
    if (!isNaN(seconds) && seconds > 0 && seconds <= 120) {
      return seconds * 1000;
    }
  }
  return null;
}

/**
 * Check if an error is a rate limit (429) error
 */
function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('429') || error.message.includes('Too Many Requests')
      || error.message.includes('quota');
  }
  return false;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

    // Generate content with retry logic for rate limit errors
    let result;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        result = await model.generateContent({
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
        break; // Success, exit retry loop
      } catch (error) {
        if (isRateLimitError(error) && attempt < MAX_RETRIES) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          const retryDelay = extractRetryDelay(errorMsg) || (BASE_DELAY_MS * Math.pow(2, attempt));
          console.warn(
            `⚠️ [generateImageWithGemini] Rate limited (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${Math.round(retryDelay / 1000)}s...`
          );
          await sleep(retryDelay);
          continue;
        }
        throw error; // Non-retryable error or max retries exceeded
      }
    }

    if (!result) {
      return {
        success: false,
        error: 'Failed to generate image after retries - rate limit exceeded. Please try again later.',
      };
    }

    // Extract image data from response
    // The response may contain multiple parts, find the image part
    const imageParts = result.response.candidates?.[0]?.content?.parts?.filter(
      (part: any) => part.inlineData?.mimeType?.startsWith('image/')
    );

    if (!imageParts || imageParts.length === 0) {
      return {
        success: false,
        error: 'No image generated in response. Note: Gemini image generation may require specific API access.',
      };
    }

    // Get the first image part
    const imagePart = imageParts[0];
    const imageData = (imagePart as any).inlineData?.data;

    if (!imageData) {
      return {
        success: false,
        error: 'Image data not found in response',
      };
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageData, 'base64');

    // If outputPath is provided, save to file
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

    // Otherwise, just return the buffer
    return {
      success: true,
      imageBuffer,
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
