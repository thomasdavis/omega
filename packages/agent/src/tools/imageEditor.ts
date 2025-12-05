/**
 * Image Editor Tool - Advanced AI-powered image editing with inpainting
 *
 * Features:
 * - Edit and modify existing images using OpenAI's GPT-Image-1 model
 * - Add new elements, characters, or objects to images
 * - Change styles, moods, backgrounds, and atmospheres
 * - AI-powered inpainting for seamless edits
 * - Works with Discord attachments and URLs
 * - Supports JPG and PNG formats
 */

import { tool } from 'ai';
import { z } from 'zod';
import OpenAI from 'openai';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { getUploadsDir } from '@repo/shared';
import { saveGeneratedImage } from '@repo/database';

/**
 * Download image from URL
 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    console.error('❌ Failed to download image:');
    console.error(`   URL: ${url}`);
    console.error(`   Status: ${response.status} ${response.statusText}`);
    throw new Error(`Failed to download image: HTTP ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export const imageEditorTool = tool({
  description: `Advanced image editing tool using OpenAI's GPT-Image-1 model with AI-powered inpainting.
Perfect for creatively modifying images:
- Add new elements, characters, or objects (e.g., "add a harem in a nice way")
- Modify backgrounds, atmospheres, or settings
- Change colors, moods, styles, or lighting
- Replace or enhance existing elements
- Generate realistic and seamless edits

Works with both JPG and PNG formats. No transparency required.
Accepts Discord attachment URLs and web URLs.

Model: gpt-image-1 (latest OpenAI image editing model)`,
  inputSchema: z.object({
    imageUrl: z.string().describe('URL of the image to edit. Can be a Discord attachment URL (https://cdn.discordapp.com/...) or any web URL'),
    editPrompt: z.string().describe('Detailed description of what you want to add or change in the image. Be specific and descriptive. Examples: "add a rainbow in the sky", "add a group of elegant people in the background", "change the background to a starry night"'),
    size: z.enum(['256x256', '512x512', '1024x1024']).optional().describe('Output dimensions. Default: "1024x1024". Options: "256x256", "512x512", "1024x1024"'),
    userId: z.string().optional().describe('User ID of the image editor. Use the current user\'s ID from context if available.'),
    username: z.string().optional().describe('Username of the image editor. Use the current user\'s username from context if available.'),
    discordMessageId: z.string().optional().describe('Discord message ID if this edit was requested via Discord.'),
  }),
  execute: async ({ imageUrl, editPrompt, size = '1024x1024', userId, username, discordMessageId }) => {
    try {
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
      });

      console.log('🎨 Image Editor: Processing advanced image edit...');
      console.log(`   🔗 Image URL: ${imageUrl}`);
      console.log(`   ✏️  Edit Prompt: ${editPrompt}`);
      console.log(`   📐 Output Size: ${size}`);

      // Download the source image
      console.log('   📥 Downloading source image...');
      const imageBuffer = await downloadImage(imageUrl);
      console.log(`   ✅ Downloaded ${imageBuffer.length} bytes`);

      // Validate image size (OpenAI has a 4MB limit)
      const maxSize = 4 * 1024 * 1024; // 4MB
      if (imageBuffer.length > maxSize) {
        const sizeMB = (imageBuffer.length / 1024 / 1024).toFixed(2);
        return {
          error: `Image too large (${sizeMB}MB). Maximum size is 4MB.`,
          success: false,
          message: `The image is too large (${sizeMB}MB). Please use an image under 4MB.`,
        };
      }

      // Convert Buffer to File for OpenAI API
      const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' });

      // Edit the image using GPT-Image-1
      console.log('   🎨 Editing image with GPT-Image-1 (AI inpainting)...');

      const result = await client.images.edit({
        model: 'gpt-image-1',
        image: imageFile as any, // TypeScript doesn't recognize File as Uploadable, but it works at runtime
        prompt: editPrompt,
        size: size as '256x256' | '512x512' | '1024x1024',
        n: 1,
      });

      console.log('   📊 OpenAI API Response received');

      // Handle both URL and base64 responses
      const firstResult = result.data?.[0];
      let editedImageUrl: string;

      let editedImageBuffer: Buffer | undefined;
      let filename: string | undefined;
      let filepath: string | undefined;

      if (firstResult?.url) {
        // URL returned directly from API
        editedImageUrl = firstResult.url;
        console.log(`   ✅ Image edited successfully (URL)`);
        console.log(`   🔗 Edited Image URL: ${editedImageUrl}`);
      } else if (firstResult?.b64_json) {
        // Save base64 image to uploads directory
        console.log(`   💾 Saving base64 image to uploads directory...`);

        const uploadsDir = getUploadsDir();
        filename = `edited-${randomUUID()}.png`;
        filepath = join(uploadsDir, filename);

        // Convert base64 to buffer and save
        editedImageBuffer = Buffer.from(firstResult.b64_json, 'base64');
        writeFileSync(filepath, editedImageBuffer);

        // Generate public URL
        const serverUrl = process.env.ARTIFACT_SERVER_URL
          || (process.env.NODE_ENV === 'production' ? 'https://omegaai.dev' : 'http://localhost:3001');
        editedImageUrl = `${serverUrl}/uploads/${filename}`;

        console.log(`   ✅ Image edited successfully (saved to disk)`);
        console.log(`   📁 Saved to: ${filepath}`);
        console.log(`   🔗 Public URL: ${editedImageUrl}`);
      } else {
        console.error('❌ No edited image returned from OpenAI API');
        console.error(`   Full API Response:`, JSON.stringify(result, null, 2));
        throw new Error('No edited image returned from API');
      }

      // Save metadata to database
      if (filename) {
        try {
          await saveGeneratedImage({
            title: `Edited Image - ${new Date().toISOString()}`,
            description: editPrompt.substring(0, 500),
            prompt: editPrompt,
            revisedPrompt: editPrompt,
            toolUsed: 'imageEditor',
            modelUsed: 'gpt-image-1',
            filename,
            artifactPath: filepath,
            publicUrl: editedImageUrl,
            format: 'png',
            imageData: editedImageBuffer,
            createdBy: userId,
            createdByUsername: username,
            discordMessageId,
          });
          console.log(`   💾 Image metadata saved to database`);
        } catch (dbError) {
          console.error('⚠️ Failed to save image metadata to database:', dbError);
          // Don't fail the whole operation if DB save fails
        }
      }

      return {
        success: true,
        originalImageUrl: imageUrl,
        editedImageUrl,
        editPrompt,
        size,
        message: `Image edited successfully using AI-powered inpainting! View the edited image at: ${editedImageUrl}`,
      };
    } catch (error) {
      console.error('❌ Error in imageEditor tool:');
      console.error(`   Error Type: ${error instanceof Error ? error.constructor.name : typeof error}`);
      console.error(`   Error Message:`, error instanceof Error ? error.message : String(error));
      console.error(`   Full Error:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      if (error instanceof Error && error.stack) {
        console.error(`   Stack Trace:`, error.stack);
      }

      // Provide helpful error messages
      let errorMessage = 'Failed to edit image. ';
      if (error instanceof Error) {
        if (error.message.includes('download')) {
          errorMessage += 'Could not download the source image. Please verify the URL is valid and accessible.';
        } else if (error.message.includes('API error') || error.message.includes('API')) {
          errorMessage += 'OpenAI API error. The image format might be unsupported or the prompt needs adjustment.';
        } else {
          errorMessage += error.message;
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to edit image',
        success: false,
        message: errorMessage,
      };
    }
  },
});
