/**
 * FFmpeg Video Creator Tool - Create videos from image sequences
 *
 * Features:
 * - Accepts uploaded images or image URLs
 * - Processes images in order to create video sequences
 * - Uses FFmpeg for video encoding (MP4 format)
 * - Stores video files in database with metadata
 * - Supports customizable FPS, resolution, and duration
 * - Returns downloadable video URLs
 */

import { tool } from 'ai';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, readFileSync, mkdirSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { saveVideoFile } from '@repo/database';
import { getUploadsDir } from '@repo/shared';

const execAsync = promisify(exec);

// Video encoding defaults
const DEFAULT_FPS = 10; // 10 frames per second for cartoon-style videos
const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 1024;
const DEFAULT_FORMAT = 'mp4';
const DEFAULT_CODEC = 'libx264'; // H.264 codec for wide compatibility
const DEFAULT_PRESET = 'medium'; // Encoding speed/quality balance

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
 * Check if FFmpeg is installed
 */
async function checkFFmpegInstalled(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Create video from image sequence using FFmpeg
 */
async function createVideoFromImages(
  imageUrls: string[],
  options: {
    fps?: number;
    width?: number;
    height?: number;
    title: string;
    description?: string;
    createdBy?: string;
    createdByUsername?: string;
  }
): Promise<VideoMetadata> {
  // Validate FFmpeg is installed
  const ffmpegInstalled = await checkFFmpegInstalled();
  if (!ffmpegInstalled) {
    throw new Error('FFmpeg is not installed. Please install FFmpeg to use video creation features.');
  }

  // Validate we have images
  if (!imageUrls || imageUrls.length === 0) {
    throw new Error('At least one image is required to create a video');
  }

  const fps = options.fps || DEFAULT_FPS;
  const width = options.width || DEFAULT_WIDTH;
  const height = options.height || DEFAULT_HEIGHT;

  // Create temporary directory for processing
  const tempDir = join(getUploadsDir(), 'temp-video-' + randomUUID());
  mkdirSync(tempDir, { recursive: true });

  try {
    console.log(`📁 Created temp directory: ${tempDir}`);
    console.log(`🎬 Processing ${imageUrls.length} images for video...`);

    // Download and save images with sequential naming for FFmpeg
    const imagePaths: string[] = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      const paddedIndex = String(i + 1).padStart(4, '0'); // e.g., 0001, 0002, etc.
      const imagePath = join(tempDir, `frame_${paddedIndex}.png`);

      console.log(`📥 Downloading image ${i + 1}/${imageUrls.length}: ${imageUrl}`);
      const imageBuffer = await downloadImage(imageUrl);
      writeFileSync(imagePath, imageBuffer);
      imagePaths.push(imagePath);
      console.log(`✅ Saved: ${imagePath}`);
    }

    // Generate output filename
    const outputFilename = `${options.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${randomUUID().split('-')[0]}.mp4`;
    const outputPath = join(tempDir, outputFilename);

    // Build FFmpeg command
    // -framerate: input framerate
    // -i: input pattern
    // -c:v: video codec
    // -preset: encoding preset (ultrafast, fast, medium, slow, veryslow)
    // -pix_fmt: pixel format (yuv420p for compatibility)
    // -vf: video filter to resize
    // -y: overwrite output file
    const ffmpegCommand = [
      'ffmpeg',
      '-framerate', fps.toString(),
      '-pattern_type', 'glob',
      '-i', `"${join(tempDir, 'frame_*.png')}"`,
      '-c:v', DEFAULT_CODEC,
      '-preset', DEFAULT_PRESET,
      '-pix_fmt', 'yuv420p',
      '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
      '-y',
      `"${outputPath}"`
    ].join(' ');

    console.log(`🎥 Running FFmpeg command: ${ffmpegCommand}`);
    const { stdout, stderr } = await execAsync(ffmpegCommand);
    console.log('📺 FFmpeg stdout:', stdout);
    if (stderr) console.log('📺 FFmpeg stderr:', stderr);

    // Verify output file was created
    if (!existsSync(outputPath)) {
      throw new Error('FFmpeg did not create output file');
    }

    // Read the generated video file
    const videoBuffer = readFileSync(outputPath);
    console.log(`✅ Video created: ${outputPath} (${videoBuffer.length} bytes)`);

    // Calculate duration (images / fps)
    const duration = imageUrls.length / fps;

    // Save to database
    const videoRecord = await saveVideoFile({
      title: options.title,
      description: options.description || `Video created from ${imageUrls.length} images`,
      videoData: videoBuffer,
      filename: outputFilename,
      format: DEFAULT_FORMAT,
      duration,
      width,
      height,
      fps,
      imageReferences: imageUrls,
      metadata: {
        imageCount: imageUrls.length,
        codec: DEFAULT_CODEC,
        preset: DEFAULT_PRESET,
        createdWith: 'ffmpegVideoCreator',
      },
      createdBy: options.createdBy,
      createdByUsername: options.createdByUsername,
    });

    console.log(`💾 Saved video to database: ID ${videoRecord.id}`);

    // Cleanup temporary files
    try {
      for (const imagePath of imagePaths) {
        if (existsSync(imagePath)) {
          unlinkSync(imagePath);
        }
      }
      if (existsSync(outputPath)) {
        unlinkSync(outputPath);
      }
      // Note: We don't remove the temp directory itself as it might cause issues
      console.log('🗑️  Cleaned up temporary files');
    } catch (cleanupError) {
      console.warn('⚠️  Warning: Failed to cleanup some temporary files:', cleanupError);
      // Don't fail the whole operation if cleanup fails
    }

    return {
      id: videoRecord.id,
      title: videoRecord.title,
      description: videoRecord.description || '',
      filename: videoRecord.filename,
      fileSize: videoRecord.fileSize || videoBuffer.length,
      format: videoRecord.format || DEFAULT_FORMAT,
      duration: videoRecord.duration || duration,
      width: videoRecord.width || width,
      height: videoRecord.height || height,
      fps: videoRecord.fps || fps,
      createdAt: videoRecord.createdAt,
    };
  } catch (error) {
    // Cleanup on error - imagePaths is only available in the try block
    console.warn('⚠️  Warning: Error occurred during video creation, temporary files may need manual cleanup:', error);
    throw error;
  }
}

export const ffmpegVideoCreatorTool = tool({
  description: `Create videos from sequences of still images using FFmpeg automation. Upload or provide URLs to a series of images, and this tool will automatically process them into an MP4 video file. Perfect for creating animations from development cartoons, image sequences, or any series of still frames.

**Features:**
- Accepts image URLs (e.g., from Discord attachments, GitHub, or web)
- Processes images in the order provided
- Creates high-quality MP4 videos with H.264 encoding
- Customizable frame rate (FPS), resolution, and quality
- Stores videos in database with metadata for easy retrieval
- Returns downloadable video URLs

**Video Specifications:**
- Default FPS: 10 (adjustable)
- Default Resolution: 1024x1024 (adjustable)
- Format: MP4 with H.264 codec
- Pixel Format: yuv420p (maximum compatibility)
- Automatic aspect ratio preservation and padding

**Use Cases:**
- Cartoon animations from sequential drawings
- Time-lapse videos from photo sequences
- Animated presentations from slides
- Development process videos from screenshots
- Marketing materials from product images

**Requirements:**
- FFmpeg must be installed on the system
- Images should be in common formats (PNG, JPG, GIF, WebP)
- At least one image is required

The tool automatically handles image downloading, processing, encoding, and cleanup.`,
  inputSchema: z.object({
    imageUrls: z.array(z.string()).min(1).describe('Array of image URLs in the desired sequence order. Images will be processed in the order provided to create the video frames.'),
    title: z.string().describe('Title for the video file'),
    description: z.string().optional().describe('Description of the video content'),
    fps: z.number().min(1).max(60).optional().describe('Frames per second (default: 10). Higher FPS creates smoother but larger videos.'),
    width: z.number().min(100).max(3840).optional().describe('Video width in pixels (default: 1024)'),
    height: z.number().min(100).max(2160).optional().describe('Video height in pixels (default: 1024)'),
    createdBy: z.string().optional().describe('User ID of the video creator'),
    createdByUsername: z.string().optional().describe('Username of the video creator'),
  }),
  execute: async ({ imageUrls, title, description, fps, width, height, createdBy, createdByUsername }) => {
    try {
      console.log('🎬 FFmpeg Video Creator: Starting video creation...');
      console.log(`   📝 Title: ${title}`);
      console.log(`   🖼️  Image count: ${imageUrls.length}`);
      console.log(`   🎞️  FPS: ${fps || DEFAULT_FPS}`);
      console.log(`   📐 Resolution: ${width || DEFAULT_WIDTH}x${height || DEFAULT_HEIGHT}`);

      const metadata = await createVideoFromImages(imageUrls, {
        title,
        description,
        fps,
        width,
        height,
        createdBy,
        createdByUsername,
      });

      // Get server URL for download link
      const serverUrl = process.env.ARTIFACT_SERVER_URL
        || (process.env.NODE_ENV === 'production' ? 'https://omegaai.dev' : 'http://localhost:3001');
      const downloadUrl = `${serverUrl}/api/video/${metadata.id}`;

      console.log(`   ✅ Video created successfully`);
      console.log(`   🔗 Download URL: ${downloadUrl}`);

      return {
        success: true,
        id: metadata.id,
        title: metadata.title,
        description: metadata.description,
        downloadUrl,
        filename: metadata.filename,
        fileSize: metadata.fileSize,
        format: metadata.format,
        duration: metadata.duration,
        durationFormatted: `${metadata.duration.toFixed(2)} seconds`,
        width: metadata.width,
        height: metadata.height,
        fps: metadata.fps,
        imageCount: imageUrls.length,
        message: `✅ Video created successfully!\n\n` +
                 `**Video Details:**\n` +
                 `- Title: ${metadata.title}\n` +
                 `- Resolution: ${metadata.width}x${metadata.height}\n` +
                 `- Duration: ${metadata.duration.toFixed(2)} seconds\n` +
                 `- FPS: ${metadata.fps}\n` +
                 `- Size: ${(metadata.fileSize / 1024 / 1024).toFixed(2)} MB\n` +
                 `- Images: ${imageUrls.length} frames\n\n` +
                 `**Download:** ${downloadUrl}\n\n` +
                 `You can now share, embed, or download this video file!`,
      };
    } catch (error) {
      console.error('❌ Error creating video:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create video',
        message: `Failed to create video: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});
