/**
 * Advanced Image Editing With Context Tool
 *
 * Features:
 * - Multiple sequential edits on the same image
 * - Context-aware editing with memory of previous edits
 * - Support for complex compositing (multiple elements in one request)
 * - AI-powered semantic understanding of edit requests
 * - Layered editing capabilities with multiple passes
 * - Integration with existing image editing infrastructure
 *
 * This tool extends the capabilities of editUserImage and imageEditor
 * by supporting complex, multi-step editing workflows where each edit
 * builds on the previous one.
 */

import { tool } from 'ai';
import { z } from 'zod';
import OpenAI from 'openai';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { getUploadsDir } from '@repo/shared';
import { generateText } from 'ai';
import { openai as aiSdkOpenai } from '@ai-sdk/openai';

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

/**
 * Use AI to break down a complex edit request into sequential steps
 */
async function planEditSequence(editRequest: string): Promise<string[]> {
  try {
    console.log('🧠 Planning edit sequence with AI...');

    const result = await generateText({
      model: aiSdkOpenai.chat('gpt-5-mini'),
      prompt: `You are an expert image editing assistant. Break down this complex image editing request into a sequence of simple, atomic editing steps. Each step should be a single, clear instruction that can be executed by an AI image editing model.

Edit Request: "${editRequest}"

Instructions:
- Break complex requests into 2-4 simple steps maximum
- Each step should add or modify ONE specific element
- Steps should be ordered logically (background first, foreground last)
- Use clear, descriptive language
- Be specific about placement and style
- Consider non-political, tasteful presentation

Return ONLY a JSON array of strings, where each string is one editing step.
Example: ["add a sunset sky in the background", "add three people sitting in the foreground", "add warm lighting to the scene"]`,
    });

    const responseText = result.text.trim();
    console.log('🧠 AI planning response:', responseText);

    // Extract JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('⚠️  Could not parse AI response, using single-step edit');
      return [editRequest];
    }

    const steps = JSON.parse(jsonMatch[0]) as string[];
    console.log(`✅ Planned ${steps.length} editing steps:`, steps);
    return steps;
  } catch (error) {
    console.error('❌ Error planning edit sequence:', error);
    console.warn('⚠️  Falling back to single-step edit');
    return [editRequest];
  }
}

/**
 * Perform a single image edit operation
 */
async function performEdit(
  client: OpenAI,
  imageBuffer: Buffer,
  prompt: string,
  size: '256x256' | '512x512' | '1024x1024'
): Promise<Buffer> {
  console.log(`   🎨 Applying edit: "${prompt}"`);

  // Convert Buffer to File for OpenAI API
  const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' });

  const result = await client.images.edit({
    model: 'gpt-image-1',
    image: imageFile as any,
    prompt,
    size,
    n: 1,
  });

  const firstResult = result.data?.[0];

  if (firstResult?.url) {
    // Download the edited image from URL
    console.log(`   📥 Downloading edited image from URL...`);
    return await downloadImage(firstResult.url);
  } else if (firstResult?.b64_json) {
    // Convert base64 to buffer
    console.log(`   💾 Converting base64 to buffer...`);
    return Buffer.from(firstResult.b64_json, 'base64');
  } else {
    throw new Error('No edited image returned from API');
  }
}

export const advancedImageEditingWithContextTool = tool({
  description: `Advanced context-aware image editing tool with support for complex, multi-step edits.

Perfect for sophisticated editing requests like:
- Adding multiple elements in one request (e.g., "add a harem and the Spice Girls")
- Complex scene composition with multiple objects/characters
- Layered edits that build upon each other
- Context-aware modifications that maintain consistency

The tool uses AI to intelligently break down complex requests into sequential editing steps,
applying each edit while maintaining the context of previous changes. This enables far more
sophisticated results than single-pass editing.

Features:
- AI-powered edit planning (breaks complex requests into steps)
- Sequential editing with context preservation
- Support for multiple elements in one request
- Semantic understanding of edit requirements
- Maintains non-political, tasteful presentation
- Works with Discord attachments and web URLs
- Supports JPG and PNG formats

Model: gpt-image-1 with gpt-5-mini for planning`,
  inputSchema: z.object({
    imageUrl: z.string().describe('URL of the image to edit. Can be a Discord attachment URL (https://cdn.discordapp.com/...) or any web URL'),
    editRequest: z.string().describe('Complex editing request describing all desired changes. Can include multiple elements. Examples: "add a harem and the Spice Girls hanging out in a non-political way", "add a rainbow and a unicorn in a magical forest setting"'),
    size: z.enum(['256x256', '512x512', '1024x1024']).optional().describe('Output dimensions. Default: "1024x1024"'),
    maxSteps: z.number().min(1).max(5).optional().describe('Maximum number of sequential editing steps to perform. Default: 4'),
  }),
  execute: async ({ imageUrl, editRequest, size = '1024x1024', maxSteps = 4 }) => {
    try {
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
      });

      console.log('🎨 Advanced Image Editing With Context: Starting...');
      console.log(`   🔗 Image URL: ${imageUrl}`);
      console.log(`   ✏️  Edit Request: ${editRequest}`);
      console.log(`   📐 Output Size: ${size}`);
      console.log(`   🔢 Max Steps: ${maxSteps}`);

      // Download the original image
      console.log('   📥 Downloading original image...');
      let currentImageBuffer = await downloadImage(imageUrl);
      console.log(`   ✅ Downloaded ${currentImageBuffer.length} bytes`);

      // Validate image size (OpenAI has a 4MB limit)
      const maxSize = 4 * 1024 * 1024; // 4MB
      if (currentImageBuffer.length > maxSize) {
        const sizeMB = (currentImageBuffer.length / 1024 / 1024).toFixed(2);
        return {
          error: `Image too large (${sizeMB}MB). Maximum size is 4MB.`,
          success: false,
          message: `The image is too large (${sizeMB}MB). Please use an image under 4MB.`,
        };
      }

      // Plan the editing sequence using AI
      const editSteps = await planEditSequence(editRequest);
      const stepsToExecute = editSteps.slice(0, maxSteps);

      console.log(`   📋 Executing ${stepsToExecute.length} editing steps...`);

      // Apply each edit sequentially
      const appliedSteps: string[] = [];
      for (let i = 0; i < stepsToExecute.length; i++) {
        const step = stepsToExecute[i];
        console.log(`   🔄 Step ${i + 1}/${stepsToExecute.length}: ${step}`);

        try {
          currentImageBuffer = await performEdit(
            client,
            currentImageBuffer,
            step,
            size as '256x256' | '512x512' | '1024x1024'
          );
          appliedSteps.push(step);
          console.log(`   ✅ Step ${i + 1} completed`);
        } catch (stepError) {
          console.error(`   ❌ Step ${i + 1} failed:`, stepError);
          // Continue with remaining steps even if one fails
          if (i === 0) {
            // If the first step fails, we can't continue
            throw stepError;
          }
          console.log(`   ⚠️  Continuing with remaining steps...`);
        }
      }

      // Save the final edited image
      console.log(`   💾 Saving final edited image...`);
      const uploadsDir = getUploadsDir();
      const filename = `advanced-edit-${randomUUID()}.png`;
      const filepath = join(uploadsDir, filename);
      writeFileSync(filepath, currentImageBuffer);

      // Generate public URL
      const serverUrl = process.env.ARTIFACT_SERVER_URL
        || (process.env.NODE_ENV === 'production' ? 'https://omegaai.dev' : 'http://localhost:3001');
      const editedImageUrl = `${serverUrl}/uploads/${filename}`;

      console.log(`   ✅ Advanced editing completed successfully`);
      console.log(`   📁 Saved to: ${filepath}`);
      console.log(`   🔗 Public URL: ${editedImageUrl}`);

      return {
        success: true,
        originalImageUrl: imageUrl,
        editedImageUrl,
        editRequest,
        appliedSteps,
        totalSteps: appliedSteps.length,
        size,
        message: `Advanced image editing completed! Applied ${appliedSteps.length} sequential edits: ${appliedSteps.join(' → ')}. View the result at: ${editedImageUrl}`,
      };
    } catch (error) {
      console.error('❌ Error in advancedImageEditingWithContext tool:');
      console.error(`   Error Type: ${error instanceof Error ? error.constructor.name : typeof error}`);
      console.error(`   Error Message:`, error instanceof Error ? error.message : String(error));
      console.error(`   Full Error:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      if (error instanceof Error && error.stack) {
        console.error(`   Stack Trace:`, error.stack);
      }

      // Provide helpful error messages
      let errorMessage = 'Failed to perform advanced image editing. ';
      if (error instanceof Error) {
        if (error.message.includes('download')) {
          errorMessage += 'Could not download the source image. Please verify the URL is valid and accessible.';
        } else if (error.message.includes('API error') || error.message.includes('API')) {
          errorMessage += 'OpenAI API error. The image format might be unsupported or the request needs adjustment.';
        } else {
          errorMessage += error.message;
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to perform advanced image editing',
        success: false,
        message: errorMessage,
      };
    }
  },
});
