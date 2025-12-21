/**
 * Amazon Nova Video Creator Tool - Create videos from images using Amazon's Nova AI model
 *
 * Features:
 * - Uses Amazon Nova Lite v1 via AWS Bedrock for AI-powered video generation
 * - Accepts uploaded images or image URLs
 * - Generates smooth transitions and animations between images
 * - Stores video files in database with metadata
 * - Supports customizable duration, FPS, and prompts
 * - Returns downloadable video URLs
 *
 * Amazon Nova is a multimodal AI model that can generate videos from images
 * with intelligent transitions, animations, and visual effects.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateVideoWithNova } from '../services/novaVideoService.js';
import { saveVideoFile } from '@repo/database';

// Video generation defaults
const DEFAULT_FPS = 10;
const DEFAULT_DURATION = 6; // seconds
const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 1024;

interface VideoMetadata {
  id: number;
  title: string;
  description: string;
  filename: string;
  fileSize: number;
  format: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  createdAt: Date;
}

export const novaVideoCreatorTool = tool({
  description: `Create AI-generated videos from sequences of still images using Amazon Nova Lite, a powerful multimodal AI model. This tool uses AWS Bedrock to intelligently generate smooth transitions, animations, and effects between your images, creating professional-quality videos.

**Features:**
- AI-powered video generation with intelligent transitions
- Smooth animations and visual effects between images
- Custom prompts to guide video style and transitions
- Accepts image URLs (from Discord, GitHub, web, etc.)
- Processes images in the provided order
- Creates MP4 videos optimized for sharing
- Stores videos in database with metadata for easy retrieval
- Returns downloadable video URLs

**Amazon Nova Capabilities:**
- Intelligent scene transitions between images
- Motion effects and animations
- Style-aware video generation based on prompts
- Consistent visual quality across frames
- Temporal coherence and smooth playback

**Video Specifications:**
- Default Duration: 6 seconds (adjustable)
- Default FPS: 10 (adjustable)
- Resolution: 1024x1024
- Format: MP4
- Model: amazon.nova-lite-v1:0 via AWS Bedrock

**Use Cases:**
- Development progress videos with smooth transitions
- Marketing videos from product screenshots
- Story-driven animations from illustrations
- Educational content from diagram sequences
- Social media videos from photo collections
- Presentation videos with dynamic transitions

**Requirements:**
- AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
- AWS Bedrock access with Nova model enabled
- At least one input image
- Images should be in common formats (PNG, JPG, WebP)

**Comparison to FFmpeg Tool:**
- **Nova**: AI-generated transitions, effects, and animations (requires AWS)
- **FFmpeg**: Simple frame-by-frame playback (local, no cloud dependencies)

Choose Nova for professional, AI-enhanced videos with intelligent transitions. Choose FFmpeg for simple, fast frame sequences without cloud dependencies.`,

  inputSchema: z.object({
    imageUrls: z.array(z.string()).min(1).describe('Array of image URLs in the desired sequence order. Nova will create intelligent transitions between these images.'),
    title: z.string().describe('Title for the video file'),
    description: z.string().optional().describe('Description of the video content'),
    prompt: z.string().optional().describe('Optional text prompt to guide the video generation style, transitions, or effects (e.g., "smooth fade transitions", "dynamic zoom effects", "cartoon-style animation")'),
    durationSeconds: z.number().min(1).max(30).optional().describe('Total video duration in seconds (default: 6). Longer durations create slower transitions.'),
    fps: z.number().min(1).max(30).optional().describe('Frames per second (default: 10). Higher FPS creates smoother motion.'),
    createdBy: z.string().optional().describe('User ID of the video creator'),
    createdByUsername: z.string().optional().describe('Username of the video creator'),
  }),

  execute: async ({
    imageUrls,
    title,
    description,
    prompt,
    durationSeconds,
    fps,
    createdBy,
    createdByUsername,
  }) => {
    try {
      console.log('🎬 Amazon Nova Video Creator: Starting AI video generation...');
      console.log(`   📝 Title: ${title}`);
      console.log(`   🖼️  Image count: ${imageUrls.length}`);
      console.log(`   ⏱️  Duration: ${durationSeconds || DEFAULT_DURATION}s`);
      console.log(`   🎞️  FPS: ${fps || DEFAULT_FPS}`);
      if (prompt) {
        console.log(`   💭 Prompt: ${prompt}`);
      }

      // Generate video using Nova
      const result = await generateVideoWithNova({
        imageUrls,
        prompt,
        durationSeconds: durationSeconds || DEFAULT_DURATION,
        fps: fps || DEFAULT_FPS,
      });

      if (!result.success || !result.videoBuffer) {
        return {
          success: false,
          error: result.error || 'Failed to generate video with Nova',
          message: `❌ Failed to generate video with Amazon Nova:\n\n${result.error || 'Unknown error'}\n\n**Troubleshooting:**\n- Ensure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are configured\n- Verify AWS Bedrock access is enabled for your account\n- Check that Amazon Nova model is available in your AWS region\n- Ensure your AWS IAM user has Bedrock invoke permissions`,
        };
      }

      console.log('✅ Video generated with Nova successfully');
      console.log(`   📦 Video size: ${result.videoBuffer.length} bytes`);

      // Generate filename
      const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_nova_${Date.now()}.mp4`;

      // Save to database
      const videoRecord = await saveVideoFile({
        title,
        description: description || `AI-generated video from ${imageUrls.length} images using Amazon Nova`,
        videoData: result.videoBuffer,
        filename,
        format: 'mp4',
        duration: durationSeconds || DEFAULT_DURATION,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        fps: fps || DEFAULT_FPS,
        imageReferences: imageUrls,
        metadata: {
          imageCount: imageUrls.length,
          model: result.metadata?.model || 'amazon.nova-lite-v1:0',
          generatedWith: 'novaVideoCreator',
          prompt: prompt || undefined,
          awsRegion: process.env.AWS_REGION || 'us-east-1',
        },
        createdBy,
        createdByUsername,
      });

      console.log(`💾 Saved video to database: ID ${videoRecord.id}`);

      // Get server URL for download link
      const serverUrl = process.env.ARTIFACT_SERVER_URL
        || (process.env.NODE_ENV === 'production' ? 'https://omegaai.dev' : 'http://localhost:3001');
      const downloadUrl = `${serverUrl}/api/video/${videoRecord.id}`;

      console.log(`   ✅ Video created successfully`);
      console.log(`   🔗 Download URL: ${downloadUrl}`);

      const fileSize = result.videoBuffer.length;
      const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);

      return {
        success: true,
        id: videoRecord.id,
        title: videoRecord.title,
        description: videoRecord.description || '',
        downloadUrl,
        filename: videoRecord.filename,
        fileSize,
        format: 'mp4',
        duration: durationSeconds || DEFAULT_DURATION,
        durationFormatted: `${durationSeconds || DEFAULT_DURATION} seconds`,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        fps: fps || DEFAULT_FPS,
        imageCount: imageUrls.length,
        model: result.metadata?.model || 'amazon.nova-lite-v1:0',
        message: `✅ AI-generated video created successfully with Amazon Nova!\n\n` +
                 `**Video Details:**\n` +
                 `- Title: ${videoRecord.title}\n` +
                 `- Model: Amazon Nova Lite v1 (AWS Bedrock)\n` +
                 `- Resolution: ${DEFAULT_WIDTH}x${DEFAULT_HEIGHT}\n` +
                 `- Duration: ${durationSeconds || DEFAULT_DURATION} seconds\n` +
                 `- FPS: ${fps || DEFAULT_FPS}\n` +
                 `- Size: ${fileSizeMB} MB\n` +
                 `- Images: ${imageUrls.length} frames\n` +
                 (prompt ? `- Style: ${prompt}\n` : '') +
                 `\n**Download:** ${downloadUrl}\n\n` +
                 `The video features AI-generated transitions and effects created by Amazon's Nova model. ` +
                 `You can now share, embed, or download this video file!`,
      };
    } catch (error) {
      console.error('❌ Error creating video with Nova:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        error: errorMessage,
        message: `❌ Failed to create video with Amazon Nova:\n\n${errorMessage}\n\n**Troubleshooting:**\n- Verify AWS credentials are correctly configured\n- Check AWS Bedrock service availability\n- Ensure Amazon Nova model access in your region\n- Review AWS IAM permissions for Bedrock\n\n**Alternative:** Consider using the FFmpeg video creator tool for basic frame-by-frame videos without AWS dependencies.`,
      };
    }
  },
});
