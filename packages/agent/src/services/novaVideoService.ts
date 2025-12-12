/**
 * Amazon Nova Video Generation Service
 *
 * Uses AWS Bedrock Runtime API to generate videos from images
 * using Amazon's Nova Lite model (amazon.nova-lite-v1:0)
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';

export interface NovaVideoOptions {
  imageUrls: string[];
  prompt?: string;
  durationSeconds?: number;
  fps?: number;
}

export interface NovaVideoResult {
  success: boolean;
  videoBuffer?: Buffer;
  videoBase64?: string;
  error?: string;
  metadata?: {
    model: string;
    duration: number;
    inputImages: number;
  };
}

/**
 * Generate a video using Amazon Nova via AWS Bedrock
 */
export async function generateVideoWithNova(
  options: NovaVideoOptions
): Promise<NovaVideoResult> {
  const { imageUrls, prompt, durationSeconds = 6, fps = 10 } = options;

  // Validate AWS credentials
  const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
  const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
  const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    return {
      success: false,
      error: 'AWS credentials (AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY) are not configured',
    };
  }

  // Validate inputs
  if (!imageUrls || imageUrls.length === 0) {
    return {
      success: false,
      error: 'At least one image URL is required',
    };
  }

  try {
    // Initialize Bedrock Runtime client
    const client = new BedrockRuntimeClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });

    // Download images and convert to base64
    console.log(`📥 Downloading ${imageUrls.length} images...`);
    const imageData: string[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      console.log(`  ${i + 1}/${imageUrls.length}: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download image ${i + 1}: HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      imageData.push(base64);
    }

    console.log(`✅ Downloaded ${imageData.length} images`);

    // Build the request payload for Nova
    // Nova accepts images and generates video based on them
    const requestPayload = {
      taskType: 'TEXT_VIDEO',
      textToVideoParams: {
        text: prompt || 'Create a smooth video transition from these images',
        images: imageData.map((base64Data, index) => ({
          format: 'png',
          source: {
            bytes: base64Data,
          },
        })),
      },
      videoGenerationConfig: {
        durationSeconds,
        fps,
        dimension: '1024x1024', // Match FFmpeg default resolution
        seed: Math.floor(Math.random() * 1000000),
      },
    };

    console.log('🎬 Calling Amazon Nova Lite model via Bedrock...');
    console.log(`   Model: amazon.nova-lite-v1:0`);
    console.log(`   Duration: ${durationSeconds}s`);
    console.log(`   FPS: ${fps}`);
    console.log(`   Images: ${imageUrls.length}`);

    // Invoke the model
    const modelId = 'amazon.nova-lite-v1:0';
    const input: InvokeModelCommandInput = {
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestPayload),
    };

    const command = new InvokeModelCommand(input);
    const response = await client.send(command);

    // Parse response
    if (!response.body) {
      return {
        success: false,
        error: 'No response body from Bedrock API',
      };
    }

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log('✅ Received response from Nova');

    // Extract video data from response
    // The response format may vary - adjust based on actual API response
    let videoData: string | undefined;

    if (responseBody.videos && responseBody.videos.length > 0) {
      // Assuming response has videos array with base64 data
      videoData = responseBody.videos[0];
    } else if (responseBody.videoData) {
      videoData = responseBody.videoData;
    } else if (responseBody.video) {
      videoData = responseBody.video;
    } else {
      // Fallback: try to find any base64-encoded video data in response
      console.warn('⚠️  Unexpected response format from Nova API');
      console.log('Response structure:', Object.keys(responseBody));

      return {
        success: false,
        error: `Unexpected response format from Nova API. Response keys: ${Object.keys(responseBody).join(', ')}`,
      };
    }

    if (!videoData) {
      return {
        success: false,
        error: 'No video data found in Nova API response',
      };
    }

    // Convert base64 to buffer
    const videoBuffer = Buffer.from(videoData, 'base64');
    console.log(`✅ Video generated: ${videoBuffer.length} bytes`);

    return {
      success: true,
      videoBuffer,
      videoBase64: videoData,
      metadata: {
        model: modelId,
        duration: durationSeconds,
        inputImages: imageUrls.length,
      },
    };
  } catch (error) {
    console.error('❌ Error generating video with Nova:', error);

    // Provide helpful error messages
    let errorMessage = 'Unknown error';

    if (error instanceof Error) {
      errorMessage = error.message;

      // Check for common errors
      if (errorMessage.includes('credentials')) {
        errorMessage = 'AWS credentials are invalid or expired. Please check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.';
      } else if (errorMessage.includes('AccessDenied')) {
        errorMessage = 'Access denied to AWS Bedrock. Ensure your AWS account has Bedrock access and the model is enabled.';
      } else if (errorMessage.includes('ResourceNotFound')) {
        errorMessage = 'Amazon Nova Lite model not found. Ensure the model is available in your AWS region.';
      } else if (errorMessage.includes('ValidationException')) {
        errorMessage = 'Invalid request format. The API may have changed - please check AWS Bedrock documentation.';
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
