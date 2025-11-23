/**
 * Generate User Image Tool - AI-powered image generation service
 *
 * Features:
 * - Generates images from text prompts using OpenAI's DALL-E
 * - Creates high-quality AI-generated images
 * - Returns image URLs that can be posted directly to Discord
 * - Supports various styles and creative directions
 */

import { tool } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

/**
 * Generate an image using OpenAI's DALL-E API
 */
async function generateImage(
  prompt: string,
  size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024',
  quality: 'standard' | 'hd' = 'standard'
): Promise<{
  imageUrl: string;
  revisedPrompt?: string;
}> {
  try {
    // Use OpenAI's native image generation API
    // Note: This uses the OpenAI client directly, not the AI SDK's generateText
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size,
        quality,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ OpenAI Image Generation API Error:');
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Full Error Response:`, JSON.stringify(errorData, null, 2));
      throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json() as {
      data: Array<{
        url: string;
        revised_prompt?: string;
      }>;
    };

    if (!data.data || !data.data[0] || !data.data[0].url) {
      console.error('❌ Invalid OpenAI API Response:');
      console.error(`   Full Response:`, JSON.stringify(data, null, 2));
      throw new Error('Invalid response from OpenAI API: missing image URL');
    }

    return {
      imageUrl: data.data[0].url,
      revisedPrompt: data.data[0].revised_prompt,
    };
  } catch (error) {
    console.error('❌ Error generating image:');
    console.error(`   Error Type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.error(`   Error Message:`, error instanceof Error ? error.message : String(error));
    console.error(`   Full Error Object:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    if (error instanceof Error && error.stack) {
      console.error(`   Stack Trace:`, error.stack);
    }
    throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const generateUserImageTool = tool({
  description: 'Generate AI-powered images from text prompts using DALL-E 3. Creates high-quality, creative images based on user descriptions. Perfect for creating artwork, illustrations, visual concepts, and creative content. The generated images are automatically available as URLs that can be displayed in Discord.',
  inputSchema: z.object({
    prompt: z.string().describe('The text description of the image to generate. Be detailed and specific for best results. Example: "A serene mountain landscape at sunset with snow-capped peaks reflecting in a crystal-clear lake"'),
    size: z.enum(['1024x1024', '1792x1024', '1024x1792']).optional().describe('Image dimensions. Options: "1024x1024" (square, default), "1792x1024" (landscape), "1024x1792" (portrait)'),
    quality: z.enum(['standard', 'hd']).optional().describe('Image quality. Options: "standard" (default, faster), "hd" (higher detail, takes longer)'),
  }),
  execute: async ({ prompt, size = '1024x1024', quality = 'standard' }) => {
    try {
      console.log('🎨 Generate User Image: Processing image generation...');
      console.log(`   📝 Prompt: ${prompt}`);
      console.log(`   📐 Size: ${size}`);
      console.log(`   ✨ Quality: ${quality}`);

      const result = await generateImage(prompt, size, quality);

      console.log(`   ✅ Image generated successfully`);
      console.log(`   🔗 URL: ${result.imageUrl}`);
      if (result.revisedPrompt) {
        console.log(`   📋 Revised prompt: ${result.revisedPrompt}`);
      }

      return {
        imageUrl: result.imageUrl,
        revisedPrompt: result.revisedPrompt,
        prompt: prompt,
        size: size,
        quality: quality,
        success: true,
        message: `Image generated successfully! You can view it at: ${result.imageUrl}`,
      };
    } catch (error) {
      console.error('❌ Error in generateUserImage tool:');
      console.error(`   Error Type: ${error instanceof Error ? error.constructor.name : typeof error}`);
      console.error(`   Error Message:`, error instanceof Error ? error.message : String(error));
      console.error(`   Full Error Object:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      if (error instanceof Error && error.stack) {
        console.error(`   Stack Trace:`, error.stack);
      }
      return {
        error: error instanceof Error ? error.message : 'Failed to generate image',
        success: false,
        message: 'Failed to generate image. Please try again with a different prompt.',
      };
    }
  },
});
