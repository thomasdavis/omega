/**
 * Amazon Nova Video Creator Tool - Create AI-powered videos from image sequences
 *
 * Features:
 * - Uses Amazon Nova Lite v1 via AWS Bedrock for video generation
 * - AI-generated transitions and effects between images
 * - Accepts image URLs from any source
 * - Creates high-quality MP4 videos with custom prompts
 * - Stores videos in database with metadata
 * - Returns downloadable video URLs
 */

import { tool } from 'ai';
import { z } from 'zod';
import { saveVideoFile } from '@repo/database';
import { generateVideoWithNova } from '../services/amazonNovaVideoService.js';

export const amazonNovaVideoCreatorTool = tool({
  description: `Create AI-powered videos from sequences of images using Amazon Nova Lite v1. This tool uses AWS Bedrock's advanced AI to generate smooth, professional videos with intelligent transitions and effects between your images.

**Key Features:**
- **AI-Powered Transitions**: Automatically generates smooth, context-aware transitions between images
- **Custom Prompts**: Guide the video style with natural language descriptions
- **Professional Quality**: Uses Amazon's state-of-the-art video generation model
- **Flexible Duration**: 1-30 seconds per video
- **Customizable FPS**: 1-30 frames per second
- **Database Storage**: Videos stored with full metadata for easy retrieval

**Video Specifications:**
- Model: Amazon Nova Lite v1 (via AWS Bedrock)
- Format: MP4
- Default Duration: 10 seconds
- Default FPS: 24
- Maximum Images: 10 per video
- Resolution: 1024x1024

**Use Cases:**
- Development progress videos with creative transitions
- Product showcase videos with AI-generated effects
- Animated presentations with professional polish
- Marketing videos from product images
- Story-telling videos from sequential images

**Comparison with FFmpeg Tool:**
- FFmpeg Tool: Simple frame-by-frame playback (like a slideshow)
- Nova Tool: AI-generated transitions, animations, and effects (cinematic)

**Requirements:**
- AWS account with Bedrock access
- AWS credentials configured (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
- Amazon Nova model enabled in your AWS region

Example usage:
{
  "imageUrls": ["https://example.com/image1.png", "https://example.com/image2.png"],
  "title": "My Project Progress",
  "prompt": "Create a dynamic video with smooth fades and zoom transitions",
  "durationSeconds": 15,
  "fps": 24
}`,

  inputSchema: z.object({
    imageUrls: z
      .array(z.string().url())
      .min(1, 'At least one image URL is required')
      .max(10, 'Maximum 10 images allowed')
      .describe(
        'Array of image URLs in sequence order. Images will be processed in the order provided. Supports any publicly accessible image URLs.'
      ),
    title: z
      .string()
      .min(1)
      .max(200)
      .describe('Title for the video (used for filename and database record)'),
    description: z
      .string()
      .optional()
      .describe('Optional description of the video content'),
    prompt: z
      .string()
      .optional()
      .describe(
        'Optional AI prompt to guide the video style and transitions. Example: "Create a professional video with smooth cross-fades and subtle zoom effects" or "Make an energetic video with dynamic transitions"'
      ),
    durationSeconds: z
      .number()
      .min(1)
      .max(30)
      .default(10)
      .describe('Video duration in seconds (1-30). Default: 10 seconds'),
    fps: z
      .number()
      .min(1)
      .max(30)
      .default(24)
      .describe('Frames per second (1-30). Higher FPS = smoother video. Default: 24'),
    createdBy: z
      .string()
      .optional()
      .describe('User ID of the video creator (for tracking)'),
    createdByUsername: z
      .string()
      .optional()
      .describe('Username of the video creator (for display)'),
  }),

  execute: async (input) => {
    console.log('🎬 Amazon Nova Video Creator - Starting video generation');
    console.log(`📝 Title: ${input.title}`);
    console.log(`🖼️  Images: ${input.imageUrls.length}`);
    console.log(`⏱️  Duration: ${input.durationSeconds}s @ ${input.fps} FPS`);
    if (input.prompt) {
      console.log(`💬 Custom prompt: ${input.prompt}`);
    }

    try {
      // Generate video using Amazon Nova
      const result = await generateVideoWithNova({
        imageUrls: input.imageUrls,
        prompt: input.prompt,
        durationSeconds: input.durationSeconds,
        fps: input.fps,
      });

      if (!result.success || !result.videoBuffer) {
        console.error('❌ Video generation failed:', result.error);
        return {
          success: false,
          error: result.error || 'Failed to generate video',
        };
      }

      // Generate filename
      const sanitizedTitle = input.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const timestamp = Date.now();
      const filename = `${sanitizedTitle}_nova_${timestamp}.mp4`;

      console.log('💾 Saving video to database...');

      // Save to database
      const videoRecord = await saveVideoFile({
        title: input.title,
        description:
          input.description ||
          `AI-powered video created from ${input.imageUrls.length} images using Amazon Nova`,
        videoData: result.videoBuffer,
        filename,
        format: 'mp4',
        duration: result.videoDuration || input.durationSeconds,
        width: result.width || 1024,
        height: result.height || 1024,
        fps: result.fps || input.fps,
        imageReferences: input.imageUrls,
        metadata: {
          imageCount: input.imageUrls.length,
          model: 'amazon.nova-lite-v1:0',
          prompt: input.prompt,
          createdWith: 'amazonNovaVideoCreator',
          aiGenerated: true,
        },
        createdBy: input.createdBy,
        createdByUsername: input.createdByUsername,
      });

      const downloadUrl = `/api/video/${videoRecord.id}`;

      console.log(`✅ Video created successfully!`);
      console.log(`📊 Video ID: ${videoRecord.id}`);
      console.log(`📦 File size: ${result.videoBuffer.length} bytes`);
      console.log(`🔗 Download URL: ${downloadUrl}`);

      return {
        success: true,
        message: 'Video created successfully with Amazon Nova AI',
        video: {
          id: videoRecord.id,
          title: videoRecord.title,
          description: videoRecord.description || '',
          filename: videoRecord.filename,
          fileSize: videoRecord.fileSize || result.videoBuffer.length,
          format: videoRecord.format || 'mp4',
          duration: videoRecord.duration || result.videoDuration,
          width: videoRecord.width || result.width,
          height: videoRecord.height || result.height,
          fps: videoRecord.fps || result.fps,
          downloadUrl,
          createdAt: videoRecord.createdAt,
          metadata: {
            imageCount: input.imageUrls.length,
            model: 'amazon.nova-lite-v1:0',
            aiGenerated: true,
          },
        },
      };
    } catch (error) {
      console.error('❌ Amazon Nova video creation failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      return {
        success: false,
        error: `Failed to create video: ${errorMessage}`,
        details:
          'Check that AWS credentials are configured and Amazon Nova model is available in your region.',
      };
    }
  },
});
