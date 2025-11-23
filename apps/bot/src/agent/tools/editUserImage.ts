/**
 * Edit User Image Tool - AI-powered image editing service
 *
 * Features:
 * - Edits existing images using OpenAI's GPT-Image-1 model
 * - Downloads images from Discord attachments or URLs
 * - Supports creative edits like adding/removing objects, changing styles
 * - Returns edited image URLs that can be posted directly to Discord
 * - Works with both JPG and PNG formats (no transparency required)
 */

import { tool } from 'ai';
import { z } from 'zod';
import OpenAI from 'openai';

/**
 * Download image from URL
 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    console.error('❌ Failed to download image:');
    console.error(`   URL: ${url}`);
    console.error(`   Status: ${response.status} ${response.statusText}`);
    console.error(`   Headers:`, JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    throw new Error(`Failed to download image: HTTP ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export const editUserImageTool = tool({
  description: `Edit existing images using OpenAI's latest image editing models (GPT-Image-1).
Supports creative edits such as:
- Adding new characters or objects
- Changing moods/styles/colors
- Generating realistic inpainting
- Replacing or modifying background elements

NO NEED for PNG transparency or alpha channel.
Works with JPG and PNG normally.

Uses model: gpt-image-1 (or any newer model)`,
  inputSchema: z.object({
    imageUrl: z.string().describe('URL of the image to edit (e.g., Discord attachment URL like https://cdn.discordapp.com/...)'),
    prompt: z.string().describe('Description of the edits to make. Be specific about what you want to add, change, or modify. Example: "add a rainbow in the sky" or "make the background a starry night"'),
    size: z.enum(['256x256', '512x512', '1024x1024']).optional().describe('Output image dimensions. Options: "256x256", "512x512", "1024x1024" (default)'),
  }),
  execute: async ({ imageUrl, prompt, size = '1024x1024' }) => {
    try {
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
      });

      console.log('🎨 Edit User Image: Processing image edit...');
      console.log(`   🔗 Image URL: ${imageUrl}`);
      console.log(`   📝 Edit Prompt: ${prompt}`);
      console.log(`   📐 Size: ${size}`);

      // Download the image
      console.log('   📥 Downloading image...');
      const imageBuffer = await downloadImage(imageUrl);
      console.log(`   ✅ Downloaded ${imageBuffer.length} bytes`);

      // Validate image size (OpenAI has a 4MB limit for image edits)
      const maxSize = 4 * 1024 * 1024; // 4MB
      if (imageBuffer.length > maxSize) {
        return {
          error: `Image too large (${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB). Maximum size is 4MB.`,
          success: false,
          message: `Image too large (${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB). Max allowed is 4MB for editing.`,
        };
      }

      // Edit the image using GPT-Image-1
      console.log('   🎨 Editing image with GPT-Image-1...');

      // Convert Buffer to File for OpenAI API
      const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' });

      const result = await client.images.edit({
        model: 'gpt-image-1', // new hotness
        image: imageFile as any, // TypeScript doesn't recognize File as Uploadable, but it works at runtime
        prompt,
        size: size as '256x256' | '512x512' | '1024x1024',
        n: 1,
        response_format: 'url', // Request URL format instead of b64_json
      });

      console.log('   📊 OpenAI API Response Details:');
      console.log(`   Result Object:`, JSON.stringify(result, null, 2));

      // Handle both URL and base64 responses
      const firstResult = result.data?.[0];
      let edited: string;

      if (firstResult?.url) {
        edited = firstResult.url;
      } else if (firstResult?.b64_json) {
        // Convert base64 to data URL
        edited = `data:image/png;base64,${firstResult.b64_json}`;
      } else {
        console.error('❌ No edited image returned from OpenAI API:');
        console.error(`   Full API Response:`, JSON.stringify(result, null, 2));
        console.error(`   Result.data:`, result.data);
        console.error(`   Result.data[0]:`, result.data?.[0]);
        throw new Error('No edited image returned from API');
      }

      console.log(`   ✅ Image edited successfully`);
      console.log(`   🔗 URL/Format: ${edited.startsWith('data:') ? 'base64 data URL' : edited}`);

      return {
        success: true,
        originalImageUrl: imageUrl,
        imageUrl: edited,
        prompt,
        size,
        message: 'Image edited successfully using GPT-Image-1',
      };
    } catch (error) {
      console.error('❌ Error in editUserImage tool:');
      console.error(`   Error Type: ${error instanceof Error ? error.constructor.name : typeof error}`);
      console.error(`   Error Message:`, error instanceof Error ? error.message : String(error));
      console.error(`   Full Error Object:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      if (error instanceof Error && error.stack) {
        console.error(`   Stack Trace:`, error.stack);
      }

      // Log OpenAI-specific error details if available
      if (error && typeof error === 'object' && 'response' in error) {
        console.error('   OpenAI API Error Details:');
        const apiError = error as any;
        if (apiError.response) {
          console.error(`   Response Status:`, apiError.response.status);
          console.error(`   Response Data:`, JSON.stringify(apiError.response.data, null, 2));
        }
        if (apiError.error) {
          console.error(`   Error Object:`, JSON.stringify(apiError.error, null, 2));
        }
      }

      // Provide helpful error messages based on common issues
      let errorMessage = 'Failed to edit image. ';
      if (error instanceof Error) {
        if (error.message.includes('download')) {
          errorMessage += 'Could not download the image. Please check the URL is valid and accessible.';
        } else if (error.message.includes('API error') || error.message.includes('returned from API')) {
          errorMessage += 'OpenAI API error. The image might not be in the correct format or the prompt might need adjustment.';
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
