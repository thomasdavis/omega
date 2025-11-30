/**
 * Generate Film Scene Tool - Creates cinematic scene descriptions
 *
 * Features:
 * - AI-generated film-style scene descriptions
 * - Support for various cinematic styles and genres
 * - Detailed camera directions, lighting, and atmosphere
 * - Character blocking and action descriptions
 * - Context-aware scene generation from conversation
 * - Professional screenplay formatting
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '../../config/models.js';

// Available cinematic styles
const CINEMATIC_STYLES = [
  'noir',
  'action',
  'drama',
  'comedy',
  'horror',
  'sci-fi',
  'romance',
  'thriller',
  'documentary',
  'arthouse',
] as const;

type CinematicStyle = typeof CINEMATIC_STYLES[number];

// Camera shot types
const SHOT_TYPES = [
  'wide',
  'medium',
  'close-up',
  'extreme-close-up',
  'over-the-shoulder',
  'pov',
  'tracking',
  'aerial',
  'any',
] as const;

type ShotType = typeof SHOT_TYPES[number];

// Time of day for lighting
const TIME_OF_DAY = [
  'dawn',
  'day',
  'golden-hour',
  'dusk',
  'night',
  'any',
] as const;

type TimeOfDay = typeof TIME_OF_DAY[number];

/**
 * Generate a film-style scene description using AI
 */
async function generateFilmScene(
  prompt: string,
  style: CinematicStyle,
  shotType?: ShotType,
  timeOfDay?: TimeOfDay,
  conversationContext?: string
): Promise<{
  sceneHeading: string;
  description: string;
  cameraDirection: string;
  lighting: string;
  soundDesign: string;
  notes: string;
}> {
  // Build style-specific guidance
  const styleGuidance: Record<CinematicStyle, string> = {
    noir: `Film Noir Style:
- High contrast lighting with deep shadows and dramatic silhouettes
- Moody, atmospheric visuals with venetian blind shadows, cigarette smoke
- Urban settings, rain-slicked streets, dimly lit interiors
- Cynical tone, moral ambiguity, sense of doom or fatalism
- Dutch angles, low-key lighting, chiaroscuro effects
- Voice-over narration style descriptions`,

    action: `Action Cinema Style:
- Dynamic, kinetic energy with rapid movement and physical intensity
- Wide shots establishing geography for fight choreography and stunts
- Quick cuts implied through fragmented, punchy descriptions
- Visceral details of impacts, explosions, vehicle chases
- Bold, saturated colors or desaturated military palette
- Emphasis on spatial awareness and momentum`,

    drama: `Drama Style:
- Intimate, character-focused compositions
- Natural lighting emphasizing realism and emotional truth
- Close-ups revealing subtle facial expressions and internal conflict
- Grounded, authentic environments reflecting character psychology
- Measured pacing with room for contemplation
- Attention to meaningful details and symbolic objects`,

    comedy: `Comedy Style:
- Bright, even lighting creating an upbeat, accessible mood
- Physical comedy staging with clear sight lines
- Timing-aware descriptions suggesting comedic beats and reactions
- Exaggerated expressions, props, and situational absurdity
- Warm color palettes, inviting environments
- Visual gags and comic juxtapositions`,

    horror: `Horror Style:
- Unsettling atmosphere with deep shadows and obscured corners
- Slow reveals building dread and anticipation
- Claustrophobic or unnaturally empty spaces
- Uncanny details, something subtly wrong in the frame
- Cold, desaturated colors or sickly green/blue tones
- Sound design emphasizing silence, creaks, distant sounds`,

    'sci-fi': `Science Fiction Style:
- Futuristic or alien environments with advanced technology
- Wide establishing shots of otherworldly landscapes or megastructures
- Clinical or neon-drenched lighting depending on sub-genre
- Attention to production design details suggesting world-building
- Contrast between human scale and vast cosmic/technological scale
- Visual metaphors for themes of progress, alienation, or wonder`,

    romance: `Romance Style:
- Soft, flattering lighting with warm tones and gentle shadows
- Intimate framing emphasizing connection and emotional distance
- Beautiful, aspirational locations or cozy, personal spaces
- Focus on glances, touches, body language conveying attraction
- Golden hour lighting, candles, sunset/sunrise atmospheres
- Dreamy, idealized visual quality`,

    thriller: `Thriller Style:
- Tense, suspenseful atmosphere with visual unease
- Strategic use of shadows and half-light creating paranoia
- Surveillance-style perspectives or uncomfortably close framing
- Urban decay, institutional environments, isolated locations
- Cool color temperature suggesting danger
- Details suggesting threat, being watched, or hidden information`,

    documentary: `Documentary Style:
- Naturalistic, observational approach
- Available light, handheld or static camera implied
- Real locations with authentic environmental details
- Objective yet revealing composition
- Attention to telling details and contextual information
- Sense of unscripted reality and genuine moments`,

    arthouse: `Arthouse/Auteur Style:
- Striking, unconventional compositions with artistic intent
- Symbolic imagery and visual metaphors
- Painterly lighting and color design
- Long takes implied through sustained, contemplative descriptions
- Ambiguous or dreamlike spatial logic
- Emphasis on mood, texture, and subtext over plot`,
  };

  // Build shot type guidance
  let shotGuidance = '';
  if (shotType && shotType !== 'any') {
    const shotDescriptions: Record<Exclude<ShotType, 'any'>, string> = {
      'wide': 'Wide Shot - Establish the full environment, show spatial relationships, characters in context of setting',
      'medium': 'Medium Shot - Frame characters from waist up, balance character and environment, conversational distance',
      'close-up': 'Close-Up - Focus on face or important detail, reveal emotion, eliminate distractions',
      'extreme-close-up': 'Extreme Close-Up - Isolate specific feature (eyes, hands, object), create intensity or emphasize significance',
      'over-the-shoulder': 'Over-the-Shoulder - Frame from behind one character looking at another, establish spatial relationship and perspective',
      'pov': 'Point of View (POV) - Show exactly what character sees, subjective perspective, create identification',
      'tracking': 'Tracking/Following Shot - Move with character or through space, create fluidity and momentum',
      'aerial': 'Aerial/High Angle - Elevated perspective showing scope, scale, or vulnerability',
    };

    shotGuidance = `\n\nShot Type: ${shotDescriptions[shotType]}
- Frame the scene according to this camera angle and composition
- Describe what would be visible within this specific framing
- Consider the emotional and narrative impact of this shot choice`;
  }

  // Build time of day guidance
  let timeGuidance = '';
  if (timeOfDay && timeOfDay !== 'any') {
    const timeDescriptions: Record<Exclude<TimeOfDay, 'any'>, string> = {
      'dawn': 'Dawn/Early Morning - Soft, cool light transitioning to warm, low sun creating long shadows, quiet atmosphere, sense of new beginning',
      'day': 'Daytime - Bright, neutral light, high sun, minimal shadows, clear visibility, energetic and active atmosphere',
      'golden-hour': 'Golden Hour - Warm, golden light, sun at low angle, long shadows, flattering and romantic quality, rich colors',
      'dusk': 'Dusk/Evening - Fading light, deepening shadows, blue hour tones, transition from day to night, melancholic or contemplative mood',
      'night': 'Night - Darkness punctuated by artificial light sources, deep shadows, pools of light, mystery and isolation',
    };

    timeGuidance = `\n\nTime of Day: ${timeDescriptions[timeOfDay]}
- Describe lighting quality and color temperature specific to this time
- Consider atmospheric effects and mood created by this lighting
- Detail how this time of day affects the visual appearance of the scene`;
  }

  // Build context guidance
  let contextGuidance = '';
  if (conversationContext) {
    contextGuidance = `\n\nConversation Context for Inspiration:
${conversationContext}

- Draw inspiration from themes, emotions, or situations discussed
- Create a scene that reflects or comments on the conversation
- Maintain cinematic quality while being contextually relevant`;
  }

  const systemPrompt = `You are a professional cinematographer and screenwriter creating detailed film scene descriptions.

Scene Description Structure:
1. Scene Heading - INT./EXT. LOCATION - TIME OF DAY (screenplay format)
2. Description - Vivid visual description of the scene (2-4 sentences)
3. Camera Direction - Specific camera movement, framing, and shot composition
4. Lighting - Detailed lighting setup, quality, color temperature, mood
5. Sound Design - Ambient sound, music suggestions, audio atmosphere
6. Notes - Additional directorial or production notes

Core Principles:
- Write in present tense with active, visual language
- Show don't tell - describe what we SEE and HEAR
- Use specific, concrete details rather than abstract concepts
- Consider composition, depth, and visual storytelling
- Think about what draws the viewer's eye
- Create atmosphere through sensory details
- Suggest emotion through visuals rather than stating it

${styleGuidance[style]}${shotGuidance}${timeGuidance}${contextGuidance}

User Prompt: ${prompt}

Create a professional, cinematic scene description that would guide a director, cinematographer, and crew in bringing this vision to life.

Respond in JSON format:
{
  "sceneHeading": "Scene heading in proper screenplay format",
  "description": "2-4 sentences of vivid visual description",
  "cameraDirection": "Specific camera instructions and shot composition",
  "lighting": "Detailed lighting setup and mood",
  "soundDesign": "Audio atmosphere and sound elements",
  "notes": "Additional production or directorial notes"
}`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt: systemPrompt,
    });

    const parsed = JSON.parse(result.text.trim());

    return {
      sceneHeading: parsed.sceneHeading,
      description: parsed.description,
      cameraDirection: parsed.cameraDirection,
      lighting: parsed.lighting,
      soundDesign: parsed.soundDesign,
      notes: parsed.notes,
    };
  } catch (error) {
    console.error('Error generating film scene:', error);
    // Fallback scene in case of error
    return {
      sceneHeading: 'INT. UNDEFINED SPACE - DAY',
      description: 'A figure stands in an empty room. Sunlight filters through a window, casting geometric shadows across bare walls. Dust particles dance in the light beam.',
      cameraDirection: 'Static medium shot, slightly low angle. The frame is centered and symmetrical.',
      lighting: 'Natural window light from camera left, creating soft contrast. Practical light source only.',
      soundDesign: 'Ambient silence with distant city sounds. Occasional creak of floorboards.',
      notes: 'Minimalist approach. Focus on stillness and contemplation.',
    };
  }
}

export const generateFilmSceneTool = tool({
  description: `Generate professional film-style scene descriptions for screenwriting, storyboarding, and creative projects. Creates cinematic descriptions with camera directions, lighting setup, sound design, and production notes. Supports multiple cinematic styles (noir, action, drama, comedy, horror, sci-fi, romance, thriller, documentary, arthouse). Perfect for filmmakers, writers, and creative storytelling.`,
  inputSchema: z.object({
    prompt: z.string().describe('The scene to describe - can be a situation, location, mood, or concept. Be specific about what should happen or be shown in the scene.'),
    style: z.enum(['noir', 'action', 'drama', 'comedy', 'horror', 'sci-fi', 'romance', 'thriller', 'documentary', 'arthouse']).optional().describe('Cinematic style (default: drama). Determines the visual language, lighting, and atmosphere of the scene.'),
    shotType: z.enum(['wide', 'medium', 'close-up', 'extreme-close-up', 'over-the-shoulder', 'pov', 'tracking', 'aerial', 'any']).optional().describe('Preferred camera shot type (default: any). Specifies how the scene should be framed.'),
    timeOfDay: z.enum(['dawn', 'day', 'golden-hour', 'dusk', 'night', 'any']).optional().describe('Time of day for lighting (default: any). Affects the lighting quality and mood.'),
    conversationContext: z.string().optional().describe('Recent conversation context to inspire the scene. Include relevant messages or themes discussed. The scene will incorporate contextual elements while maintaining cinematic quality.'),
  }),
  execute: async ({ prompt, style = 'drama', shotType = 'any', timeOfDay = 'any', conversationContext }) => {
    try {
      console.log(`🎬 Generate Film Scene: Creating a ${style} scene...`);
      if (shotType && shotType !== 'any') {
        console.log(`   📹 Shot Type: ${shotType}`);
      }
      if (timeOfDay && timeOfDay !== 'any') {
        console.log(`   🌅 Time of Day: ${timeOfDay}`);
      }
      if (conversationContext) {
        console.log(`   💬 Using conversation context (${conversationContext.length} chars)`);
      }

      const sceneData = await generateFilmScene(
        prompt,
        style,
        shotType,
        timeOfDay,
        conversationContext
      );

      console.log(`   ✨ Generated film scene successfully`);

      // Format the complete scene description
      const formattedScene = `**${sceneData.sceneHeading}**

${sceneData.description}

**CAMERA:** ${sceneData.cameraDirection}

**LIGHTING:** ${sceneData.lighting}

**SOUND:** ${sceneData.soundDesign}

**NOTES:** ${sceneData.notes}

—
*Style: ${style}${shotType !== 'any' ? ` | Shot: ${shotType}` : ''}${timeOfDay !== 'any' ? ` | Time: ${timeOfDay}` : ''}*`;

      return {
        success: true,
        sceneHeading: sceneData.sceneHeading,
        description: sceneData.description,
        cameraDirection: sceneData.cameraDirection,
        lighting: sceneData.lighting,
        soundDesign: sceneData.soundDesign,
        notes: sceneData.notes,
        style,
        shotType: shotType || 'any',
        timeOfDay: timeOfDay || 'any',
        contextUsed: !!conversationContext,
        availableStyles: Array.from(CINEMATIC_STYLES),
        availableShotTypes: Array.from(SHOT_TYPES),
        availableTimesOfDay: Array.from(TIME_OF_DAY),
        formattedOutput: formattedScene,
      };
    } catch (error) {
      console.error('Error generating film scene:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate film scene',
      };
    }
  },
});
