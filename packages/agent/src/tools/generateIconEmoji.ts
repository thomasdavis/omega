/**
 * Generate Icon/Emoji Tool - AI-powered icon and emoji generation
 *
 * Features:
 * - Generates icons and emoji from text prompts using OpenAI's DALL-E
 * - Optimized for small, expressive graphical elements
 * - Supports various styles (flat, 3D, pixel art, minimal, colorful)
 * - Returns image URLs suitable for chat, websites, apps, and communication platforms
 * - Square format optimized for icon/emoji use
 */

import { tool } from 'ai';
import { z } from 'zod';
import { saveGeneratedImage } from '@repo/database';

/**
 * Generate an icon or emoji using OpenAI's DALL-E API
 */
async function generateIconEmoji(
  prompt: string,
  style: string = 'colorful',
  userId?: string,
  username?: string,
  discordMessageId?: string
): Promise<{
  imageUrl: string;
  revisedPrompt?: string;
}> {
  try {
    // Enhance the prompt for icon/emoji generation
    const enhancedPrompt = `Create a high-quality icon or emoji: ${prompt}

Style: ${style}
Format: Square, centered design
Background: Clean or transparent-ready
Usage: Suitable for chat, websites, apps, and communication platforms
Quality: High detail, professional, visually appealing
Size optimized: Icon/emoji friendly

Create a small, expressive graphical element that clearly represents the concept.`;

    // Use OpenAI's native image generation API
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1024', // Square format for icons/emoji
        quality: 'standard',
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

    const result = {
      imageUrl: data.data[0].url,
      revisedPrompt: data.data[0].revised_prompt,
    };

    // Save image metadata to database
    try {
      const filename = `icon-emoji-${Date.now()}.png`;
      await saveGeneratedImage({
        title: `Icon/Emoji - ${new Date().toISOString()}`,
        description: prompt.substring(0, 500),
        prompt,
        revisedPrompt: result.revisedPrompt,
        toolUsed: 'generateIconEmoji',
        modelUsed: 'dall-e-3',
        filename,
        publicUrl: result.imageUrl,
        format: 'png',
        createdBy: userId,
        createdByUsername: username,
        discordMessageId,
      });
      console.log(`💾 Image metadata saved to database`);
    } catch (dbError) {
      console.error('⚠️ Failed to save image metadata to database:', dbError);
    }

    return result;
  } catch (error) {
    console.error('❌ Error generating icon/emoji:');
    console.error(`   Error Type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.error(`   Error Message:`, error instanceof Error ? error.message : String(error));
    console.error(`   Full Error Object:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    if (error instanceof Error && error.stack) {
      console.error(`   Stack Trace:`, error.stack);
    }
    throw new Error(`Failed to generate icon/emoji: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const generateIconEmojiTool = tool({
  description: 'Generate icons and emoji from text prompts using DALL-E 3. Creates small, expressive graphical elements optimized for use in chat, websites, apps, and communication platforms. Perfect for creating custom icons, emoji, badges, and visual symbols. The generated images are automatically available as URLs that can be displayed in Discord.',
  inputSchema: z.object({
    prompt: z.string().describe('The text description of the icon or emoji to generate. Be specific about what you want. Examples: "a happy robot face", "a coffee cup steaming", "a lightning bolt with sparkles", "a cute cat paw"'),
    style: z.enum(['flat', '3d', 'pixel-art', 'minimal', 'colorful', 'gradient', 'line-art', 'realistic']).optional().default('colorful').describe('Visual style for the icon/emoji. Options: "flat" (simple 2D), "3d" (dimensional), "pixel-art" (retro pixelated), "minimal" (clean and simple), "colorful" (vibrant, default), "gradient" (smooth color transitions), "line-art" (outlined style), "realistic" (photorealistic)'),
    userId: z.string().optional().describe('Optional user ID for tracking who created the image'),
    username: z.string().optional().describe('Optional username for tracking who created the image'),
    discordMessageId: z.string().optional().describe('Optional Discord message ID to associate with this generated image'),
  }),
  execute: async ({ prompt, style = 'colorful', userId, username, discordMessageId }) => {
    try {
      console.log('🎨 Generate Icon/Emoji: Processing icon/emoji generation...');
      console.log(`   📝 Prompt: ${prompt}`);
      console.log(`   🎭 Style: ${style}`);

      const result = await generateIconEmoji(prompt, style, userId, username, discordMessageId);

      console.log(`   ✅ Icon/emoji generated successfully`);
      console.log(`   🔗 URL: ${result.imageUrl}`);
      if (result.revisedPrompt) {
        console.log(`   📋 Revised prompt: ${result.revisedPrompt}`);
      }

      return {
        imageUrl: result.imageUrl,
        revisedPrompt: result.revisedPrompt,
        prompt: prompt,
        style: style,
        success: true,
        message: `Icon/emoji generated successfully! You can view it at: ${result.imageUrl}`,
      };
    } catch (error) {
      console.error('❌ Error in generateIconEmoji tool:');
      console.error(`   Error Type: ${error instanceof Error ? error.constructor.name : typeof error}`);
      console.error(`   Error Message:`, error instanceof Error ? error.message : String(error));
      console.error(`   Full Error Object:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      if (error instanceof Error && error.stack) {
        console.error(`   Stack Trace:`, error.stack);
      }
      return {
        error: error instanceof Error ? error.message : 'Failed to generate icon/emoji',
        success: false,
        message: 'Failed to generate icon/emoji. Please try again with a different prompt.',
      };
    }
  },
});
