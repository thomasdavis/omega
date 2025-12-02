/**
 * Upload My Photo Tool
 * Allows users to upload their photo for avatar recreation and stylized portraits
 * Uses Gemini Vision to extract visual attributes for artistic rendering
 */

import { tool } from 'ai';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { updateUserProfile, getOrCreateUserProfile } from '@repo/database';// OLD:userProfileService.js';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { getUploadsDir, getCachedAttachment } from '@repo/shared';

// Initialize Gemini Vision
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const geminiVisionModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';
const GITHUB_STORAGE_PATH = 'user-photos';

// Image file extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

/**
 * Download file from URL
 */
async function downloadFile(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  console.log(`   Fetching from URL: ${url}`);

  const response = await fetch(url);

  console.log(`   Response status: ${response.status} ${response.statusText}`);
  console.log(`   Content-Type: ${response.headers.get('content-type')}`);

  if (!response.ok) {
    // Special handling for Discord CDN URLs
    if (url.includes('cdn.discordapp.com')) {
      throw new Error(
        `Discord CDN URL returned ${response.status}. ` +
        `This usually means the URL has expired or is invalid. ` +
        `Please re-upload the image as a fresh attachment in Discord.`
      );
    }

    throw new Error(
      `Failed to download file: ${response.status} ${response.statusText}. ` +
      `URL: ${url.substring(0, 100)}...`
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get('content-type') || 'application/octet-stream';

  console.log(`   Downloaded ${buffer.length} bytes`);

  return { buffer, mimeType };
}

/**
 * Comprehensive phenotype analysis interface
 */
interface PhenotypeAnalysis {
  // Basic summary
  description: string;
  confidence: number;

  // Gender & Age
  gender: string;
  genderConfidence: number;
  ageRange: string;
  ageConfidence: number;

  // Facial Structure
  faceShape: string;
  facialSymmetry: number;
  jawlineProminence: string;
  cheekboneProminence: string;

  // Hair
  hairColor: string;
  hairTexture: string;
  hairLength: string;
  hairStyle: string;
  hairDensity: string;
  facialHair: string;

  // Eyes
  eyeColor: string;
  eyeShape: string;
  eyeSpacing: string;
  eyebrowShape: string;
  eyebrowThickness: string;

  // Nose
  noseShape: string;
  noseSize: string;

  // Mouth & Lips
  lipFullness: string;
  smileType: string;

  // Skin
  skinTone: string;
  skinTexture: string;
  complexionQuality: string;

  // Build & Stature
  bodyType: string;
  buildDescription: string;
  heightEstimate: string;
  posture: string;

  // Distinctive Features
  distinctiveFeatures: string[];
  clothingStyle: string;
  accessories: string[];

  // Overall Impression
  attractiveness: string;
  approachability: number;
  perceivedConfidence: string;
  aestheticArchetype: string;
}

/**
 * Analyze user appearance using Gemini Vision for avatar recreation
 * Extracts visual attributes needed for stylized portrait generation
 */
async function analyzeUserAppearance(imageBuffer: Buffer): Promise<PhenotypeAnalysis> {
  const base64Image = imageBuffer.toString('base64');

  try {
    const prompt = `You are a visual appearance analysis model used for avatar recreation and stylized portrait generation.
Extract ONLY visual attributes that help re-create artistic portraits of this person.

Return ONLY valid JSON matching this exact structure:

{
  "description": "2-3 sentence summary starting with gender (e.g., 'Male with...', 'Female with...')",
  "gender": "male|female|androgynous|person",
  "genderConfidence": 0.0-1.0,
  "ageRange": "18-25|26-35|36-45|46-55|56-65|65+",
  "ageConfidence": 0.0-1.0,
  "faceShape": "oval|round|square|heart|diamond|oblong",
  "facialSymmetry": 0-100,
  "jawlineProminence": "weak|moderate|strong|very-strong",
  "cheekboneProminence": "low|moderate|high",
  "hairColor": "detailed description (e.g., 'dark brown with auburn highlights')",
  "hairTexture": "straight|wavy|curly|coily",
  "hairLength": "very-short|short|medium|long|very-long|bald",
  "hairStyle": "descriptive (e.g., 'undercut with swept fringe', 'shoulder-length layered')",
  "hairDensity": "thin|medium|thick",
  "facialHair": "clean-shaven|stubble|beard|mustache|goatee|full-beard",
  "eyeColor": "detailed (e.g., 'hazel with green flecks', 'dark brown')",
  "eyeShape": "almond|round|hooded|monolid|upturned|downturned",
  "eyeSpacing": "close-set|average|wide-set",
  "eyebrowShape": "straight|arched|rounded|angular",
  "eyebrowThickness": "thin|medium|thick|bushy",
  "noseShape": "straight|aquiline|button|wide|narrow",
  "noseSize": "small|average|large",
  "lipFullness": "thin|medium|full",
  "smileType": "closed|slight|wide|toothy|asymmetric|neutral",
  "skinTone": "detailed description (e.g., 'light olive', 'deep brown', 'fair with pink undertones')",
  "skinTexture": "smooth|textured|scarred",
  "complexionQuality": "clear|blemished|weathered",
  "bodyType": "ectomorph|mesomorph|endomorph|athletic",
  "buildDescription": "slim|average|muscular|stocky|heavy",
  "heightEstimate": "short|average|tall|very-tall",
  "posture": "slouched|neutral|upright|rigid",
  "distinctiveFeatures": ["array", "of", "notable", "features"],
  "clothingStyle": "casual|business-casual|formal|alternative|athletic|other",
  "accessories": ["array", "of", "visible", "accessories"],
  "attractiveness": "below-average|average|above-average|striking",
  "approachability": 0-100,
  "perceivedConfidence": "low|moderate|high",
  "aestheticArchetype": "classic|rugged|refined|edgy|bohemian|minimalist|other"
}

Be objective, detailed, and accurate. Return ONLY the JSON object, no other text.`;

    // Call Gemini Vision with the image
    const result = await geminiVisionModel.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image,
        },
      },
      { text: prompt },
    ]);

    const response = await result.response;
    const jsonText = response.text().trim();

    // Check for Gemini refusals (safety blocks)
    if (jsonText.includes("I'm sorry") || jsonText.includes("I cannot") || jsonText.includes("I can't")) {
      throw new Error(`Gemini refused to analyze the photo: "${jsonText.substring(0, 100)}...". This may be due to safety policies. Try a different photo with clear facial features and good lighting.`);
    }

    // Extract JSON from response (Gemini sometimes wraps it in markdown)
    let cleanJsonText = jsonText;
    if (jsonText.includes('```json')) {
      const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        cleanJsonText = jsonMatch[1];
      }
    } else if (jsonText.includes('```')) {
      const jsonMatch = jsonText.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        cleanJsonText = jsonMatch[1];
      }
    }

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJsonText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', cleanJsonText.substring(0, 200));
      throw new Error(`Gemini returned invalid JSON. Response: "${cleanJsonText.substring(0, 100)}..."`);
    }

    // Validate required fields
    if (!parsed.description || !parsed.gender) {
      throw new Error('Gemini response missing required fields (description, gender)');
    }

    // Add overall confidence based on photo quality
    const analysis: PhenotypeAnalysis = {
      ...parsed,
      confidence: parsed.confidence || 0.9, // High confidence since based on actual photo
    };

    return analysis;
  } catch (error) {
    console.error('Failed to analyze appearance with Gemini Vision:', error);
    throw error;
  }
}

/**
 * Upload file to GitHub
 */
async function uploadPhotoToGitHub(
  fileBuffer: Buffer,
  userId: string,
  username: string
): Promise<{ githubUrl: string; rawUrl: string }> {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token not configured. Cannot upload photos.');
  }

  const filename = `user-${userId}.jpg`;
  const filePath = `${GITHUB_STORAGE_PATH}/${filename}`;
  const base64Content = fileBuffer.toString('base64');

  try {
    // Check if file already exists (to get SHA for updates)
    let sha: string | undefined;
    const checkResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (checkResponse.ok) {
      const existingFile: any = await checkResponse.json();
      sha = existingFile.sha;
      console.log(`   Photo already exists, updating with SHA: ${sha}`);
    }

    // Upload file to GitHub
    const uploadResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          message: `Upload photo for ${username}`,
          content: base64Content,
          ...(sha && { sha }),
        }),
      }
    );

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`GitHub API error: ${uploadResponse.status} - ${error}`);
    }

    const uploadData: any = await uploadResponse.json();
    const githubUrl = uploadData.content.html_url;
    const rawUrl = uploadData.content.download_url;

    console.log(`   ✅ Uploaded photo to GitHub: ${githubUrl}`);

    return { githubUrl, rawUrl };
  } catch (error) {
    console.error('Error uploading photo to GitHub:', error);
    throw error;
  }
}

/**
 * Upload My Photo Tool
 */
export const uploadMyPhotoTool = tool({
  description: `Upload a user's photo for avatar recreation and stylized portrait generation.

**Call this tool whenever:**
- The user uploads an image (photo/selfie) AND
- The user expresses ANY intent related to uploading, saving, or storing that image
- Examples: "upload my photo", "save this", "this is me", "use my picture", "update my appearance"

**What it does:**
- Stores the uploaded photo permanently on GitHub
- Generates visual metadata using an external vision model (NOT OpenAI)
- Creates appearance profile for stylized portrait generation and comic avatar creation
- This tool does NOT use OpenAI for image analysis

**How to use:**
When the user uploads an image with intent to save:
1. Use the first attachment ID from context.attachments
2. Pass the attachmentId, userId, and username
3. The tool retrieves the cached image and processes it externally
4. Visual attributes are extracted for avatar recreation purposes
5. Results stored in database for future artistic rendering

**Do NOT:**
- Ask the user to re-upload if an attachment is present
- Explain attachment issues - just call the tool
- Hesitate if the user clearly wants to upload their photo`,

  inputSchema: z.object({
    attachmentId: z.string().describe('Discord attachment ID (stable identifier, use this instead of URL)'),
    userId: z.string().describe('Discord user ID'),
    username: z.string().describe('Discord username'),
  }),

  execute: async ({ attachmentId, userId, username }) => {
    console.log(`📸 Uploading photo for ${username} (${userId}) [Attachment ID: ${attachmentId}]`);

    try {
      // 1. Get photo from cache using attachment ID (stable across Discord)
      let buffer: Buffer;
      let mimeType: string;
      let photoUrl: string;

      const cached = getCachedAttachment(attachmentId);
      if (cached) {
        console.log('   ✅ Using cached attachment from messageHandler...');
        buffer = cached.buffer;
        mimeType = cached.mimeType;
        photoUrl = cached.url; // For GitHub upload filename
      } else {
        // Cache miss - this shouldn't happen if messageHandler did its job
        throw new Error(
          `Photo not found in cache (ID: ${attachmentId}). ` +
          `This likely means the attachment download failed. Please try uploading again.`
        );
      }

      // 2. Validate it's an image
      if (!mimeType.startsWith('image/')) {
        return {
          success: false,
          error: 'File must be an image (jpg, png, gif, webp, etc.)',
        };
      }

      // 3. Analyze appearance with Gemini Vision
      console.log('   Analyzing appearance with Gemini Vision...');
      const appearance = await analyzeUserAppearance(buffer);
      console.log(`   Appearance: ${appearance.description}`);
      console.log(`   Gender: ${appearance.gender}`);

      // 4. Upload to GitHub
      console.log('   Uploading to GitHub...');
      const { githubUrl, rawUrl } = await uploadPhotoToGitHub(buffer, userId, username);

      // 5. Backup to Railway local storage
      const uploadsDir = getUploadsDir();
      const localFilename = `user-photo-${userId}.jpg`;
      const localPath = join(uploadsDir, localFilename);
      writeFileSync(localPath, buffer);
      console.log(`   💾 Backup saved locally: ${localPath}`);

      // 6. Update user profile with ALL phenotype data
      await getOrCreateUserProfile(userId, username);
      await updateUserProfile(userId, {
        // Photo metadata
        uploaded_photo_url: rawUrl,
        uploaded_photo_metadata: JSON.stringify({
          filename: `user-${userId}.jpg`,
          upload_date: Date.now(),
          file_size: buffer.length,
          github_url: githubUrl,
        }),
        last_photo_analyzed_at: Math.floor(Date.now() / 1000),

        // Basic description and confidence
        ai_appearance_description: appearance.description,
        appearance_confidence: appearance.confidence,

        // Gender & Age
        ai_detected_gender: appearance.gender,
        gender_confidence: appearance.genderConfidence,
        estimated_age_range: appearance.ageRange,
        age_confidence: appearance.ageConfidence,

        // Facial Structure
        face_shape: appearance.faceShape,
        facial_symmetry_score: appearance.facialSymmetry,
        jawline_prominence: appearance.jawlineProminence,
        cheekbone_prominence: appearance.cheekboneProminence,

        // Hair Analysis
        hair_color: appearance.hairColor,
        hair_texture: appearance.hairTexture,
        hair_length: appearance.hairLength,
        hair_style: appearance.hairStyle,
        hair_density: appearance.hairDensity,
        facial_hair: appearance.facialHair,

        // Eyes
        eye_color: appearance.eyeColor,
        eye_shape: appearance.eyeShape,
        eye_spacing: appearance.eyeSpacing,
        eyebrow_shape: appearance.eyebrowShape,
        eyebrow_thickness: appearance.eyebrowThickness,

        // Nose
        nose_shape: appearance.noseShape,
        nose_size: appearance.noseSize,

        // Mouth & Lips
        lip_fullness: appearance.lipFullness,
        smile_type: appearance.smileType,

        // Skin
        skin_tone: appearance.skinTone,
        skin_texture: appearance.skinTexture,
        complexion_quality: appearance.complexionQuality,

        // Build & Stature
        body_type: appearance.bodyType,
        build_description: appearance.buildDescription,
        height_estimate: appearance.heightEstimate,
        posture: appearance.posture,

        // Distinctive Features
        distinctive_features: JSON.stringify(appearance.distinctiveFeatures),
        clothing_style: appearance.clothingStyle,
        accessories: JSON.stringify(appearance.accessories),

        // Overall Impression
        attractiveness_assessment: appearance.attractiveness,
        approachability_score: appearance.approachability,
        perceived_confidence_level: appearance.perceivedConfidence,
        aesthetic_archetype: appearance.aestheticArchetype,
      });

      console.log(`   ✅ Photo uploaded and comprehensive phenotype profile updated!`);
      console.log(`   📊 Extracted ${Object.keys(appearance).length} phenotype dimensions`);

      return {
        success: true,
        photoUrl: rawUrl,
        githubUrl: githubUrl,
        appearance: appearance.description,
        message: `Photo uploaded successfully! I can now see what you look like:\n\n"${appearance.description}"\n\nThis will help me generate accurate portraits and include you in comics with your actual appearance.`,
      };
    } catch (error) {
      console.error('Failed to upload photo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to upload photo. Please try again or check if the image URL is valid.',
      };
    }
  },
});
