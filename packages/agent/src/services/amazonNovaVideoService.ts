/**
 * Amazon Nova Video Generation Service
 *
 * Uses AWS Bedrock's Amazon Nova Lite v1 model to generate videos
 * from sequences of images with AI-powered transitions and effects.
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import https from 'https';
import http from 'http';

export interface NovaVideoOptions {
  imageUrls: string[];
  prompt?: string;
  durationSeconds?: number;
  fps?: number;
}

export interface NovaVideoResult {
  success: boolean;
  videoBuffer?: Buffer;
  videoDuration?: number;
  width?: number;
  height?: number;
  fps?: number;
  error?: string;
}

/**
 * Download an image from a URL and convert to base64
 */
async function downloadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        resolve(base64);
      });
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Generate a video using Amazon Nova Lite v1 via AWS Bedrock
 */
export async function generateVideoWithNova(
  options: NovaVideoOptions
): Promise<NovaVideoResult> {
  const {
    imageUrls,
    prompt = 'Create a smooth video with professional transitions between these images',
    durationSeconds = 10,
    fps = 24,
  } = options;

  // Validate AWS credentials
  const awsRegion = process.env.AWS_REGION || 'us-east-1';
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    return {
      success: false,
      error: 'AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.',
    };
  }

  // Validate input
  if (!imageUrls || imageUrls.length === 0) {
    return {
      success: false,
      error: 'At least one image URL is required',
    };
  }

  if (imageUrls.length > 10) {
    return {
      success: false,
      error: 'Maximum of 10 images supported',
    };
  }

  try {
    console.log(`🎬 Starting Amazon Nova video generation with ${imageUrls.length} images...`);

    // Download and convert images to base64
    console.log('📥 Downloading images...');
    const imageDataPromises = imageUrls.map(async (url, index) => {
      try {
        const base64 = await downloadImageAsBase64(url);
        console.log(`  ✅ Image ${index + 1}/${imageUrls.length} downloaded`);
        return base64;
      } catch (error) {
        console.error(`  ❌ Failed to download image ${index + 1}: ${error}`);
        throw new Error(`Failed to download image from ${url}: ${error}`);
      }
    });

    const imageDataArray = await Promise.all(imageDataPromises);

    // Initialize Bedrock client
    const client = new BedrockRuntimeClient({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    });

    // Prepare the request payload for Amazon Nova
    // Nova expects images as content parts with inline data
    const contentParts = imageDataArray.map((imageData, index) => ({
      image: {
        format: 'png',
        source: {
          bytes: imageData,
        },
      },
    }));

    // Build the request following Amazon Nova's API format
    const requestBody = {
      messages: [
        {
          role: 'user',
          content: [
            {
              text: `${prompt}\n\nCreate a ${durationSeconds}-second video at ${fps} FPS with smooth transitions between these ${imageUrls.length} images.`,
            },
            ...contentParts,
          ],
        },
      ],
      inferenceConfig: {
        maxTokens: 4096,
        temperature: 0.7,
        topP: 0.9,
      },
      videoGenerationConfig: {
        durationSeconds,
        fps,
        outputFormat: 'mp4',
      },
    };

    console.log('🚀 Calling Amazon Nova API...');

    // Call the Bedrock API with Amazon Nova Lite v1
    const command = new InvokeModelCommand({
      modelId: 'amazon.nova-lite-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });

    const response = await client.send(command);

    // Parse the response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Extract video data from response
    // Amazon Nova returns video as base64 in the content
    const videoContent = responseBody.content?.find(
      (item: any) => item.video
    );

    if (!videoContent || !videoContent.video) {
      console.error('❌ No video content in response:', responseBody);
      return {
        success: false,
        error: 'No video generated in response from Amazon Nova',
      };
    }

    // Convert base64 video to buffer
    const videoBase64 = videoContent.video.source?.bytes || videoContent.video;
    const videoBuffer = Buffer.from(videoBase64, 'base64');

    console.log(`✅ Video generated successfully (${videoBuffer.length} bytes)`);

    return {
      success: true,
      videoBuffer,
      videoDuration: durationSeconds,
      fps,
      // Note: Width/height may not be in response, using defaults
      width: 1024,
      height: 1024,
    };
  } catch (error) {
    console.error('❌ Amazon Nova video generation failed:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Provide helpful error messages
    if (errorMessage.includes('AccessDenied')) {
      return {
        success: false,
        error: 'AWS access denied. Ensure your AWS credentials have Bedrock permissions and the Amazon Nova model is enabled in your region.',
      };
    }

    if (errorMessage.includes('ModelNotFound')) {
      return {
        success: false,
        error: 'Amazon Nova model not found. Ensure the model is available in your AWS region and you have access.',
      };
    }

    return {
      success: false,
      error: `Amazon Nova video generation failed: ${errorMessage}`,
    };
  }
}
