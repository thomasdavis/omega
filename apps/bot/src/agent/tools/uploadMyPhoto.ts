/**
 * Upload My Photo Tool
 * Allows users to upload their photo so Omega can see what they look like
 * Uses GPT-4o vision to analyze appearance and stores both photo + description
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { updateUserProfile, getOrCreateUserProfile } from '../../database/userProfileService.js';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { getUploadsDir } from '../../utils/storage.js';

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';
const GITHUB_STORAGE_PATH = 'user-photos';

// Image file extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

/**
 * Download file from URL
 */
async function downloadFile(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get('content-type') || 'application/octet-stream';

  return { buffer, mimeType };
}

/**
 * Analyze user appearance using GPT-4o vision
 */
async function analyzeUserAppearance(imageBuffer: Buffer): Promise<{
  description: string;
  confidence: number;
  gender: string;
}> {
  const base64Image = imageBuffer.toString('base64');

  try {
    const result = await generateText({
      model: openai.chat('gpt-4o'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Describe this person's physical appearance in detail for use in AI-generated portraits. Focus on:
- Gender presentation (male, female, androgynous, etc.) - BE EXPLICIT AND ACCURATE
- Hair (color, style, length)
- Facial features (eye color, facial structure, distinctive characteristics)
- Build and stature if visible
- Overall appearance and impression
- Any notable features

IMPORTANT: Start your description with gender (e.g., "Male with..." or "Female with..." or "Person with...").
Be objective and descriptive. Keep it to 2-3 sentences. This will be used to generate artistic portraits that capture their likeness.`,
            },
            {
              type: 'image',
              image: base64Image,
            },
          ],
        },
      ],
    });

    // Extract gender from the description (should be at the start)
    const description = result.text;
    let gender = 'person'; // default fallback

    if (description.toLowerCase().startsWith('male')) {
      gender = 'male';
    } else if (description.toLowerCase().startsWith('female')) {
      gender = 'female';
    } else if (description.toLowerCase().includes('man with')) {
      gender = 'male';
    } else if (description.toLowerCase().includes('woman with')) {
      gender = 'female';
    }

    return {
      description,
      confidence: 0.9, // High confidence since based on actual photo
      gender,
    };
  } catch (error) {
    console.error('Failed to analyze appearance with GPT-4o:', error);
    throw error;
  }
}

/**
 * Upload file to GitHub
 */
async function uploadPhotoToGitHub(
  fileBuffer: Buffer,
  userId: string,
  username: string
): Promise<{ githubUrl: string; rawUrl: string }> {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token not configured. Cannot upload photos.');
  }

  const filename = `user-${userId}.jpg`;
  const filePath = `${GITHUB_STORAGE_PATH}/${filename}`;
  const base64Content = fileBuffer.toString('base64');

  try {
    // Check if file already exists (to get SHA for updates)
    let sha: string | undefined;
    const checkResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (checkResponse.ok) {
      const existingFile: any = await checkResponse.json();
      sha = existingFile.sha;
      console.log(`   Photo already exists, updating with SHA: ${sha}`);
    }

    // Upload file to GitHub
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
          message: `Upload photo for ${username}`,
          content: base64Content,
          ...(sha && { sha }),
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

    console.log(`   ✅ Uploaded photo to GitHub: ${githubUrl}`);

    return { githubUrl, rawUrl };
  } catch (error) {
    console.error('Error uploading photo to GitHub:', error);
    throw error;
  }
}

/**
 * Upload My Photo Tool
 */
export const uploadMyPhotoTool = tool({
  description: `Upload your photo so Omega can see what you look like. This helps Omega:
  - Generate accurate portraits of you based on your actual appearance
  - Include you in comics with your real look
  - Form a complete mental image when talking to you

  The photo is analyzed with AI to extract appearance details (hair color, facial features, etc.)
  and stored permanently on GitHub. Both the photo and AI description are saved.

  Use when:
  - User uploads an image and says "this is me", "here's what I look like", etc.
  - User explicitly asks to save their photo
  - User wants to update their appearance

  IMPORTANT: Only use when the user clearly indicates the image is of themselves.`,

  inputSchema: z.object({
    photoUrl: z.string().describe('URL of the photo (Discord attachment URL)'),
    userId: z.string().describe('Discord user ID'),
    username: z.string().describe('Discord username'),
  }),

  execute: async ({ photoUrl, userId, username }) => {
    console.log(`📸 Uploading photo for ${username} (${userId})`);

    try {
      // 1. Download photo
      console.log('   Downloading photo...');
      const { buffer, mimeType } = await downloadFile(photoUrl);

      // 2. Validate it's an image
      if (!mimeType.startsWith('image/')) {
        return {
          success: false,
          error: 'File must be an image (jpg, png, gif, webp, etc.)',
        };
      }

      // 3. Analyze appearance with GPT-4o vision
      console.log('   Analyzing appearance with GPT-4o...');
      const appearance = await analyzeUserAppearance(buffer);
      console.log(`   Appearance: ${appearance.description}`);
      console.log(`   Gender: ${appearance.gender}`);

      // 4. Upload to GitHub
      console.log('   Uploading to GitHub...');
      const { githubUrl, rawUrl } = await uploadPhotoToGitHub(buffer, userId, username);

      // 5. Backup to Railway local storage
      const uploadsDir = getUploadsDir();
      const localFilename = `user-photo-${userId}.jpg`;
      const localPath = join(uploadsDir, localFilename);
      writeFileSync(localPath, buffer);
      console.log(`   💾 Backup saved locally: ${localPath}`);

      // 6. Update user profile
      await getOrCreateUserProfile(userId, username);
      await updateUserProfile(userId, {
        uploaded_photo_url: rawUrl,
        uploaded_photo_metadata: JSON.stringify({
          filename: `user-${userId}.jpg`,
          upload_date: Date.now(),
          file_size: buffer.length,
          github_url: githubUrl,
        }),
        ai_appearance_description: appearance.description,
        appearance_confidence: appearance.confidence,
        ai_detected_gender: appearance.gender,
      });

      console.log(`   ✅ Photo uploaded and profile updated!`);

      return {
        success: true,
        photoUrl: rawUrl,
        githubUrl: githubUrl,
        appearance: appearance.description,
        message: `Photo uploaded successfully! I can now see what you look like:\n\n"${appearance.description}"\n\nThis will help me generate accurate portraits and include you in comics with your actual appearance.`,
      };
    } catch (error) {
      console.error('Failed to upload photo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to upload photo. Please try again or check if the image URL is valid.',
      };
    }
  },
});
