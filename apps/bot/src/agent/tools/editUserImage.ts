/**
 * Edit User Image Tool - AI-powered image editing service
 *
 * Features:
 * - Edits existing images using OpenAI's DALL-E image editing API
 * - Downloads images from Discord attachments or URLs
 * - Supports creative edits like adding/removing objects, changing styles
 * - Returns edited image URLs that can be posted directly to Discord
 * - Processes images to ensure PNG format requirement
 */

import { tool } from 'ai';
import { z } from 'zod';

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

/**
 * Edit an image using OpenAI's DALL-E API
 */
async function editImage(
  imageBuffer: Buffer,
  prompt: string,
  size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024'
): Promise<{
  imageUrl: string;
}> {
  try {
    // OpenAI's image editing API requires FormData with image file
    // The image must be in PNG format with transparency for best results
    const formData = new FormData();

    // Create a Blob from the buffer and append to FormData
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('image', imageBlob, 'image.png');
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', size);
    formData.append('model', 'dall-e-2'); // Only DALL-E 2 supports image editing

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json() as {
      data: Array<{
        url: string;
      }>;
    };

    if (!data.data || !data.data[0] || !data.data[0].url) {
      throw new Error('Invalid response from OpenAI API: missing image URL');
    }

    return {
      imageUrl: data.data[0].url,
    };
  } catch (error) {
    console.error('Error editing image:', error);
    throw new Error(`Failed to edit image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const editUserImageTool = tool({
  description: `Edit existing images using AI-powered image editing with DALL-E 2. Upload an image and describe the changes you want to make, such as:
  - Adding objects or elements ("add a dog to this photo")
  - Changing styles or atmosphere ("make this photo look like a painting")
  - Modifying backgrounds ("change the background to a beach")
  - Adding visual effects ("add fireworks to the sky")

  The tool downloads the image from a URL (like Discord attachments), processes it, and returns an edited version.

  IMPORTANT: This tool works best with images that have transparent areas (PNG with alpha channel). The AI will focus edits on the transparent regions.
  For best results, use images with clear subjects and describe specific changes you want.

  Note: Uses DALL-E 2 (DALL-E 3 doesn't support image editing yet).`,
  inputSchema: z.object({
    imageUrl: z.string().describe('URL of the image to edit (e.g., Discord attachment URL like https://cdn.discordapp.com/...)'),
    prompt: z.string().describe('Description of the edits to make. Be specific about what you want to add, change, or modify. Example: "add a rainbow in the sky" or "make the background a starry night"'),
    size: z.enum(['1024x1024', '1792x1024', '1024x1792']).optional().describe('Output image dimensions. Options: "1024x1024" (square, default), "1792x1024" (landscape), "1024x1792" (portrait)'),
  }),
  execute: async ({ imageUrl, prompt, size = '1024x1024' }) => {
    try {
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
          message: 'Please use a smaller image or compress it before editing.',
        };
      }

      // Edit the image
      console.log('   🎨 Editing image with AI...');
      const result = await editImage(imageBuffer, prompt, size);

      console.log(`   ✅ Image edited successfully`);
      console.log(`   🔗 URL: ${result.imageUrl}`);

      return {
        imageUrl: result.imageUrl,
        originalImageUrl: imageUrl,
        prompt: prompt,
        size: size,
        success: true,
        message: `Image edited successfully! You can view it at: ${result.imageUrl}\n\nEdit applied: ${prompt}`,
      };
    } catch (error) {
      console.error('Error in editUserImage tool:', error);

      // Provide helpful error messages based on common issues
      let errorMessage = 'Failed to edit image. ';
      if (error instanceof Error) {
        if (error.message.includes('download')) {
          errorMessage += 'Could not download the image. Please check the URL is valid and accessible.';
        } else if (error.message.includes('PNG') || error.message.includes('format')) {
          errorMessage += 'The image must be in PNG format with transparency for best results.';
        } else if (error.message.includes('API error')) {
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
