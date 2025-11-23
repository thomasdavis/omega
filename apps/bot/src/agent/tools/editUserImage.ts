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
    size: z.enum(['1024x1024', '1792x1024', '1024x1792']).optional().describe('Output image dimensions. Options: "1024x1024" (square, default), "1792x1024" (landscape), "1024x1792" (portrait)'),
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
      const result = await client.images.edit({
        model: 'gpt-image-1', // new hotness
        image: imageBuffer, // JPG/PNG works
        prompt,
        size,
        n: 1,
      });

      const edited = result.data?.[0]?.url;

      if (!edited) {
        throw new Error('No edited image returned from API');
      }

      console.log(`   ✅ Image edited successfully`);
      console.log(`   🔗 URL: ${edited}`);

      return {
        success: true,
        originalImageUrl: imageUrl,
        imageUrl: edited,
        prompt,
        size,
        message: 'Image edited successfully using GPT-Image-1',
      };
    } catch (error) {
      console.error('Error in editUserImage tool:', error);

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
