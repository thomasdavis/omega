/**
 * This Is How I Look Tool
 * Allows users to describe their avatar appearance through textual descriptions
 * as an alternative to the uploadMyPhoto tool
 */

import { tool } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { updateUserProfile, getOrCreateUserProfile } from '@repo/database';
import { OMEGA_MODEL } from '@repo/shared';

/**
 * Comprehensive phenotype analysis interface
 * Same structure as uploadMyPhoto for consistency
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
 * Parse user's textual description into structured phenotype data
 * Uses AI to interpret the description and extract visual attributes
 */
async function parseAppearanceDescription(description: string): Promise<PhenotypeAnalysis> {
  try {
    const prompt = `You are a visual description parser that converts textual appearance descriptions into structured phenotype data for avatar generation.

The user provided this description of how they look:
"${description}"

Your task: Extract ONLY visual attributes from this description and structure them into the JSON format below.
If information is not provided, make reasonable inferences or use "not specified".

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

Guidelines:
- Use information from the description when available
- Make reasonable inferences for missing details based on what's provided
- Confidence scores should reflect how much detail was provided (more detail = higher confidence)
- Be objective and accurate
- Return ONLY the JSON object, no other text`;

    const analysisResult = await generateText({
      model: openai(OMEGA_MODEL),
      prompt: prompt,
    });

    const jsonText = analysisResult.text.trim();

    // Extract JSON from response (AI sometimes wraps it in markdown)
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
      throw new Error(`AI returned invalid JSON. Response: "${cleanJsonText.substring(0, 100)}..."`);
    }

    // Validate required fields
    if (!parsed.description || !parsed.gender) {
      throw new Error('AI response missing required fields (description, gender)');
    }

    // Add overall confidence based on description detail
    // Text descriptions generally have lower confidence than actual photos
    const analysis: PhenotypeAnalysis = {
      ...parsed,
      confidence: parsed.confidence || 0.7, // Lower than photo-based (0.9) but still good
    };

    return analysis;
  } catch (error) {
    console.error('Failed to parse appearance description:', error);
    throw error;
  }
}

/**
 * This Is How I Look Tool
 */
export const thisIsHowILookTool = tool({
  description: `Describe your avatar appearance through textual descriptions as an alternative to photo uploads.

**Call this tool whenever:**
- The user wants to describe how they look without uploading a photo
- The user says things like "this is how I look", "I look like", "my appearance is"
- The user provides a verbal description of their physical appearance
- Examples: "this is how i look: tall with brown hair and green eyes", "describe my avatar: I'm a person with..."

**What it does:**
- Accepts detailed textual descriptions of user appearance
- Uses AI to parse the description into structured phenotype data
- Generates appearance profile for stylized portrait generation and comic avatar creation
- Stores the data in the user profile for future artistic rendering

**How to use:**
When the user provides a textual description of their appearance:
1. Pass the description text, userId, and username
2. The tool uses AI to structure the description into detailed phenotype data
3. Results are stored in the database for avatar recreation purposes
4. User can later generate portraits based on this description

**Privacy & Accessibility:**
- No photo upload required
- User maintains control over their appearance representation
- Alternative method for avatar creation
- Great for users who prefer privacy or don't have photos`,

  inputSchema: z.object({
    description: z.string().describe('Detailed textual description of user appearance (e.g., "I am a tall person with brown curly hair, green eyes, and a friendly smile")'),
    userId: z.string().describe('Discord user ID'),
    username: z.string().describe('Discord username'),
  }),

  execute: async ({ description, userId, username }) => {
    console.log(`✍️  This Is How I Look for ${username} (${userId})`);
    console.log(`   📝 Description: ${description}`);

    try {
      // 1. Parse the textual description into structured data
      console.log('   🤖 Parsing appearance description with AI...');
      const appearance = await parseAppearanceDescription(description);
      console.log(`   Appearance: ${appearance.description}`);
      console.log(`   Gender: ${appearance.gender}`);

      // 2. Ensure user profile exists
      await getOrCreateUserProfile(userId, username);

      // 3. Update user profile with ALL phenotype data
      await updateUserProfile(userId, {
        // Mark that this came from text description, not photo
        uploaded_photo_url: null, // No photo URL since this is text-based
        uploaded_photo_metadata: JSON.stringify({
          source: 'text_description',
          description_text: description,
          upload_date: Date.now(),
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

      console.log(`   ✅ Appearance description processed and comprehensive phenotype profile updated!`);
      console.log(`   📊 Extracted ${Object.keys(appearance).length} phenotype dimensions`);

      return {
        success: true,
        appearance: appearance.description,
        confidence: appearance.confidence,
        message: `Got it! I now understand how you look:\n\n"${appearance.description}"\n\nThis will help me generate accurate portraits and include you in comics with your described appearance. Since this is based on your text description (not a photo), confidence is at ${Math.round(appearance.confidence * 100)}%.`,
      };
    } catch (error) {
      console.error('Failed to process appearance description:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to process your appearance description. Please try again with more details about how you look.',
      };
    }
  },
});
