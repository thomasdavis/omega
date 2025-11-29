/**
 * Portrait Prompt Engineering Utilities
 * Generates prompts for Gemini to create portraits based on user profiles
 */

import type { UserProfileRecord } from '../database/schema.js';
import { getDetailedCharacterDescription } from './userAppearance.js';

/**
 * Visual representations for each Jungian archetype
 */
const ARCHETYPE_VISUALS: Record<string, string> = {
  Sage: 'wise expression, contemplative gaze, surrounded by subtle light suggesting knowledge and insight',
  Explorer: 'adventurous spirit, eyes looking toward distant horizons, dynamic and curious pose',
  Hero: 'confident stance, determined expression, strong presence radiating courage',
  Caregiver: 'gentle smile, compassionate eyes, warm and nurturing energy',
  Rebel: 'defiant gaze, unconventional style, rebellious spirit and independence',
  Magician: 'mysterious aura, transformative energy, eyes that see beyond the ordinary',
  Innocent: 'pure expression, hopeful eyes, sense of wonder and optimism',
  Lover: 'passionate gaze, expressive features, warmth and emotional depth',
  Jester: 'playful expression, mischievous eyes, joyful and humorous energy',
  Everyman: 'relatable presence, grounded expression, approachable and genuine',
  Ruler: 'authoritative bearing, commanding presence, confidence and control',
  Creator: 'imaginative expression, creative spark in eyes, innovative energy',
};

/**
 * Style directives for different portrait styles
 */
const STYLE_DIRECTIVES: Record<string, string> = {
  realistic:
    'photorealistic digital portrait, highly detailed facial features, professional photography lighting, sharp focus, 8k quality',
  comic:
    'comic book art style, vibrant colors, bold clean lines, expressive features, dynamic shading, professional comic illustration',
  artistic:
    'artistic interpretation, painterly style, expressive brushwork, rich colors, fine art portrait with emotional depth',
  abstract:
    'abstract representation, symbolic elements, dreamlike quality, conceptual art, expressive use of color and form',
};

/**
 * Build a Gemini prompt for portrait generation
 */
export function buildPortraitPrompt(
  profile: UserProfileRecord,
  feelings: any,
  personality: any,
  style: 'realistic' | 'comic' | 'artistic' | 'abstract'
): string {
  // Appearance description
  const baseDescription =
    profile.ai_appearance_description ||
    'A person with warm, intelligent eyes and an expressive, thoughtful face';

  // Emotional tone based on affinity score
  let emotionalTone: string;
  if (feelings.affinityScore > 50) {
    emotionalTone = 'warm, friendly, approachable with gentle expression';
  } else if (feelings.affinityScore < -20) {
    emotionalTone = 'distant, guarded, mysterious with reserved expression';
  } else {
    emotionalTone = 'calm, thoughtful, balanced with neutral expression';
  }

  // Get dominant archetype and its visual representation
  const dominantArchetype =
    personality.dominantArchetypes && personality.dominantArchetypes.length > 0
      ? personality.dominantArchetypes[0]
      : 'Everyman';

  const archetypeVisual =
    ARCHETYPE_VISUALS[dominantArchetype] || 'balanced, approachable presence';

  // Style directive
  const styleDirective = STYLE_DIRECTIVES[style] || STYLE_DIRECTIVES.artistic;

  // Background atmosphere based on formality
  const formality = personality.communicationStyle?.formality || 'neutral';
  let backgroundAtmosphere: string;
  switch (formality) {
    case 'casual':
      backgroundAtmosphere = 'relaxed, informal setting with soft natural lighting';
      break;
    case 'formal':
      backgroundAtmosphere = 'refined, elegant setting with professional lighting';
      break;
    default:
      backgroundAtmosphere = 'balanced setting with harmonious lighting';
  }

  // Build the complete prompt
  const prompt = `Create a portrait with these characteristics:

**Physical Appearance:**
${baseDescription}

**Emotional Tone:**
${emotionalTone}

**Personality Visualization (${dominantArchetype} archetype):**
${archetypeVisual}

**Artistic Style:**
${styleDirective}

**Background & Atmosphere:**
${backgroundAtmosphere}

**Additional Context:**
- Trust level: ${feelings.trustLevel}/100 (influences depth of gaze and openness)
- Affinity: ${feelings.affinityScore}/100 (influences warmth vs distance)
- Communication engagement: ${personality.communicationStyle?.engagement || 'medium'}

Create a portrait that captures not just how they look, but how Omega perceives their essence based on interactions. The portrait should feel authentic and reflect their personality traits: ${feelings.facets?.slice(0, 3).join(', ') || 'thoughtful individual'}.`;

  return prompt;
}

/**
 * Build a simplified prompt for users without photos
 */
export function buildGenericPortraitPrompt(
  feelings: any,
  personality: any,
  username: string,
  style: 'realistic' | 'comic' | 'artistic' | 'abstract'
): string {
  const emotionalTone =
    feelings.affinityScore > 50
      ? 'warm and friendly'
      : feelings.affinityScore < -20
        ? 'distant and reserved'
        : 'calm and balanced';

  const dominantArchetype =
    personality.dominantArchetypes && personality.dominantArchetypes.length > 0
      ? personality.dominantArchetypes[0]
      : 'Everyman';

  const archetypeVisual =
    ARCHETYPE_VISUALS[dominantArchetype] || 'balanced, approachable presence';

  const styleDirective = STYLE_DIRECTIVES[style] || STYLE_DIRECTIVES.artistic;

  const facets = feelings.facets?.slice(0, 3).join(', ') || 'thoughtful individual';

  const prompt = `Create an artistic portrait of ${username} based on their personality:

**Personality Traits:**
${facets}

**Archetype (${dominantArchetype}):**
${archetypeVisual}

**Emotional Expression:**
${emotionalTone}

**Artistic Style:**
${styleDirective}

**Context:**
This portrait represents how an AI (Omega) perceives this person based on conversations. Trust level: ${feelings.trustLevel}/100, Affinity: ${feelings.affinityScore}/100.

Create an imaginative portrait that captures their essence and personality, even without knowing their exact physical appearance. Focus on expressing their character, energy, and the feeling they evoke through creative artistic interpretation.`;

  return prompt;
}
