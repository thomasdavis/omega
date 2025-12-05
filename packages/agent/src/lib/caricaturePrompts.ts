/**
 * Caricature Prompt Engineering Utilities
 * Generates prompts for Gemini to create caricatures with exaggerated features
 * based on user photos and personality profiles
 */

import { type UserProfileRecord } from '@repo/database';

/**
 * Personality-informed exaggeration suggestions for each archetype
 */
const ARCHETYPE_EXAGGERATIONS: Record<string, string> = {
  Sage: 'oversized wise eyes behind comically large glasses, exaggerated forehead suggesting deep thoughts, thoughtful wrinkles',
  Explorer: 'adventurous wide eyes, excited expression, exaggerated dynamic posture suggesting constant motion',
  Hero: 'exaggerated strong jaw, determined expression with comically firm brow, heroic pose with chest out',
  Caregiver: 'warm oversized eyes, gentle exaggerated smile, soft rounded features suggesting nurturing nature',
  Rebel: 'defiant raised eyebrow, mischievous smirk, wild exaggerated hair suggesting rebellious energy',
  Magician: 'mysterious twinkling eyes, knowing smirk, dramatic exaggerated mystical aura',
  Innocent: 'wide innocent eyes, pure childlike expression, exaggerated hope and wonder in features',
  Lover: 'passionate expressive eyes, warm inviting smile, exaggerated emotional openness',
  Jester: 'playful grin, mischievous eyes, exaggerated comedic expressions and animated features',
  Everyman: 'relatable friendly features, exaggerated approachable smile, comfortable casual expression',
  Ruler: 'commanding presence, exaggerated confident chin, authoritative gaze',
  Creator: 'imaginative sparkle in eyes, thoughtful expression, exaggerated creative energy',
};

/**
 * Feature-specific exaggeration mapping
 */
interface FeatureExaggerations {
  face_shape?: string;
  jawline?: string;
  eyes?: string;
  nose?: string;
  smile?: string;
  hair?: string;
}

/**
 * Build feature exaggerations based on user's facial features
 */
function buildFeatureExaggerations(profile: UserProfileRecord): FeatureExaggerations {
  const exaggerations: FeatureExaggerations = {};

  // Face shape exaggerations
  if (profile.face_shape) {
    const shapeMap: Record<string, string> = {
      round: 'comically round, soft circular face like a friendly moon',
      oval: 'elegantly elongated oval, gracefully stretched proportions',
      square: 'dramatically square jaw, strong angular features like carved stone',
      heart: 'exaggerated heart shape with prominent forehead tapering to delicate chin',
      diamond: 'striking diamond shape with prominent cheekbones',
    };
    exaggerations.face_shape = shapeMap[profile.face_shape.toLowerCase()] || profile.face_shape;
  }

  // Jawline exaggerations
  if (profile.jawline_prominence) {
    const jawMap: Record<string, string> = {
      strong: 'heroically prominent jaw, chiseled to comic proportions',
      defined: 'noticeably defined jawline, clean angular profile',
      soft: 'gently rounded jaw, soft welcoming contours',
      prominent: 'dramatically jutting jaw suggesting determination',
    };
    exaggerations.jawline = jawMap[profile.jawline_prominence.toLowerCase()] || profile.jawline_prominence;
  }

  // Eye exaggerations
  const eyeShape = profile.eye_shape || '';
  const eyeColor = profile.eye_color || '';
  if (eyeShape || eyeColor) {
    const shapeDesc = eyeShape.includes('large')
      ? 'cartoonishly large expressive eyes'
      : eyeShape.includes('almond')
      ? 'dramatically almond-shaped eyes'
      : 'expressively exaggerated eyes';
    const colorDesc = eyeColor ? ` with vibrant sparkling ${eyeColor}` : '';
    exaggerations.eyes = `${shapeDesc}${colorDesc}`;
  }

  // Nose exaggerations
  if (profile.nose_shape) {
    const noseMap: Record<string, string> = {
      button: 'adorably tiny button nose',
      straight: 'perfectly straight nose of exaggerated length',
      aquiline: 'dramatically curved aquiline nose with distinguished profile',
      broad: 'comically broad nose dominating the face',
      upturned: 'charmingly upturned nose with exaggerated lift',
    };
    exaggerations.nose = noseMap[profile.nose_shape.toLowerCase()] || `exaggerated ${profile.nose_shape} nose`;
  }

  // Smile exaggerations
  if (profile.smile_type) {
    const smileMap: Record<string, string> = {
      wide: 'enormously wide grin stretching across the face',
      subtle: 'mysteriously subtle knowing smile',
      asymmetric: 'charmingly crooked asymmetric smirk',
      toothy: 'beaming toothy smile with exaggerated teeth',
    };
    exaggerations.smile = smileMap[profile.smile_type.toLowerCase()] || profile.smile_type;
  }

  // Hair exaggerations
  const hairColor = profile.hair_color || '';
  const hairStyle = profile.hair_style || '';
  const hairTexture = profile.hair_texture || '';
  if (hairColor || hairStyle || hairTexture) {
    const colorDesc = hairColor ? `vibrant ${hairColor}` : 'hair';
    const textureDesc = hairTexture ? ` with exaggerated ${hairTexture} texture` : '';
    const styleDesc = hairStyle ? ` styled in ${hairStyle} fashion` : '';
    exaggerations.hair = `${colorDesc}${textureDesc}${styleDesc}, dramatically emphasized`;
  }

  return exaggerations;
}

/**
 * Determine exaggeration intensity descriptions
 */
function getExaggerationDirective(level: 'subtle' | 'moderate' | 'extreme'): string {
  switch (level) {
    case 'subtle':
      return 'Gently exaggerate the most distinctive features while keeping proportions mostly realistic. Think editorial cartoon style.';
    case 'moderate':
      return 'Clearly exaggerate distinctive features for comic effect while maintaining recognizability. Classic caricature style.';
    case 'extreme':
      return 'Wildly exaggerate all distinctive features to absurd proportions for maximum comedic impact. Think political cartoon or MAD Magazine style.';
  }
}

/**
 * Build personality-based expression guidance
 */
function buildPersonalityExpression(
  personality: any,
  feelings: any,
  exaggerationLevel: 'subtle' | 'moderate' | 'extreme'
): string {
  const dominantArchetype = personality.dominantArchetypes?.[0] || 'Everyman';
  const archetypeExaggeration = ARCHETYPE_EXAGGERATIONS[dominantArchetype] || 'friendly approachable features';

  const affinityNote = feelings.affinityScore > 60
    ? 'Express with affectionate warmth and playful fondness'
    : feelings.affinityScore > 30
    ? 'Express with friendly good humor'
    : 'Express with neutral comedic observation';

  const traitNotes = feelings.facets?.slice(0, 3).join(', ') || 'distinctive personality';

  return `**Personality Expression (${dominantArchetype}):**
${archetypeExaggeration}

**Character Traits to Visualize:**
${traitNotes}

**Emotional Approach:**
${affinityNote} (Omega's affinity: ${feelings.affinityScore}/100)

**Expression Style:**
${exaggerationLevel === 'extreme' ? 'Maximum comedic exaggeration' : exaggerationLevel === 'moderate' ? 'Balanced caricature exaggeration' : 'Gentle artistic exaggeration'}`;
}

/**
 * Build complete caricature prompt with photo-based features
 */
export function buildCaricaturePrompt(
  profile: UserProfileRecord,
  feelings: any,
  personality: any,
  exaggerationLevel: 'subtle' | 'moderate' | 'extreme'
): string {
  // Gender specification
  const gender = (profile as any).ai_detected_gender || 'person';
  const genderNote = gender === 'male'
    ? 'IMPORTANT: This is a MALE person. Ensure masculine features.'
    : gender === 'female'
    ? 'IMPORTANT: This is a FEMALE person. Ensure feminine features.'
    : 'IMPORTANT: This person has an androgynous or neutral presentation.';

  // Base appearance
  const baseDescription = profile.ai_appearance_description ||
    'A person with distinctive features';

  // Feature exaggerations
  const features = buildFeatureExaggerations(profile);
  const featureList = Object.entries(features)
    .map(([key, value]) => `- ${key.replace('_', ' ')}: ${value}`)
    .join('\n');

  // Personality expression
  const personalityExpression = buildPersonalityExpression(
    personality,
    feelings,
    exaggerationLevel
  );

  // Exaggeration directive
  const exaggerationDirective = getExaggerationDirective(exaggerationLevel);

  // Build final prompt
  return `Create a caricature drawing that cartoonishly exaggerates this person's distinctive features:

**${genderNote}**

**Base Appearance:**
${baseDescription}

**Features to Exaggerate:**
${featureList || '- Distinctive facial features and expressions'}

${personalityExpression}

**Caricature Style Instructions:**
${exaggerationDirective}

**Technical Specifications:**
- Style: Professional caricature illustration
- Medium: Digital art with clean lines and vibrant colors
- Composition: Portrait format, head and shoulders
- Background: Simple complementary color or gradient
- Quality: High detail in exaggerated features

**Key Requirements:**
1. Maintain recognizability despite exaggeration
2. Keep it playful and fun, not mean-spirited
3. Emphasize the most distinctive features
4. Reflect personality through visual exaggeration
5. Ensure gender presentation matches "${gender}"

**Omega's Thoughts About Them:**
"${feelings.thoughts}"

Create a caricature that captures both their physical appearance and personality essence through artistic exaggeration!`;
}

/**
 * Build caricature prompt without photo (personality-based only)
 */
export function buildGenericCaricaturePrompt(
  feelings: any,
  personality: any,
  username: string,
  exaggerationLevel: 'subtle' | 'moderate' | 'extreme'
): string {
  const dominantArchetype = personality.dominantArchetypes?.[0] || 'Everyman';
  const archetypeExaggeration = ARCHETYPE_EXAGGERATIONS[dominantArchetype];
  const traits = feelings.facets?.slice(0, 3).join(', ') || 'unique personality';

  const exaggerationDirective = getExaggerationDirective(exaggerationLevel);

  return `Create a caricature of ${username} based on their personality and how Omega perceives them:

**Personality Archetype (${dominantArchetype}):**
${archetypeExaggeration}

**Character Traits to Visualize:**
${traits}

**Omega's Perception:**
Trust level: ${feelings.trustLevel}/100
Affinity: ${feelings.affinityScore}/100
Thoughts: "${feelings.thoughts}"

**Caricature Style:**
${exaggerationDirective}

**Instructions:**
Since no photo is available, create an imaginative caricature that:
1. Visually represents their personality archetype
2. Exaggerates character traits into physical features
3. Captures the essence of how Omega sees them
4. Uses symbolic and creative interpretation
5. Maintains playful, fun energy

**Style:** Professional caricature illustration, digital art, vibrant colors
**Composition:** Portrait format with personality-driven exaggerated features

Create a character that embodies their personality through creative caricature!`;
}
