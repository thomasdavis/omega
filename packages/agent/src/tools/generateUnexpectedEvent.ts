/**
 * Generate Unexpected Event Tool - Creates surprising scenarios for creative inspiration
 *
 * Features:
 * - AI-generated unexpected events and plot twists
 * - Multiple event types (story, game, challenge, creative)
 * - Context-aware scenario generation
 * - Random combination of unrelated elements
 * - Fresh, surprising content every time
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '@repo/shared';

// Available event types
const EVENT_TYPES = [
  'plot-twist',
  'character-reveal',
  'world-event',
  'challenge',
  'complication',
  'opportunity',
  'random',
] as const;

type EventType = typeof EVENT_TYPES[number];

// Intensity levels for events
const INTENSITY_LEVELS = [
  'mild',
  'moderate',
  'dramatic',
  'extreme',
] as const;

type IntensityLevel = typeof INTENSITY_LEVELS[number];

/**
 * Generate an unexpected event using AI
 */
async function generateUnexpectedEvent(
  eventType?: EventType,
  intensity?: IntensityLevel,
  context?: string,
  genre?: string
): Promise<{
  event: string;
  explanation: string;
  type: EventType;
  intensity: IntensityLevel;
  elements: string[];
}> {
  // Select event type
  const selectedType = eventType || EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
  const selectedIntensity = intensity || INTENSITY_LEVELS[Math.floor(Math.random() * INTENSITY_LEVELS.length)];

  // Build type-specific guidance
  const typeGuidance: Record<EventType, string> = {
    'plot-twist': `Generate a plot twist that completely changes the story direction:
- Reveal hidden information that recontextualizes earlier events
- Subvert expectations in a logical but surprising way
- Create a "didn't see that coming" moment
- Make it feel earned, not arbitrary
- Include specific details that make it vivid and believable`,

    'character-reveal': `Generate a character revelation or transformation:
- Reveal hidden identity, motivation, or backstory
- Show a character's unexpected skill, secret, or connection
- Create a moment that changes how we see the character
- Make it psychologically compelling
- Include emotional stakes and consequences`,

    'world-event': `Generate a world-changing event or discovery:
- Introduce a phenomenon that affects the entire setting
- Create a new threat, opportunity, or mystery
- Make it feel epic and consequential
- Consider ripple effects on society/environment
- Include sensory details that make it tangible`,

    'challenge': `Generate an unexpected challenge or obstacle:
- Create a problem that requires creative problem-solving
- Combine unrelated difficulties for complexity
- Make it feel urgent and consequential
- Include specific constraints and stakes
- Leave room for multiple solution approaches`,

    'complication': `Generate a complication that makes things difficult:
- Introduce a factor that disrupts current plans
- Create conflicting interests or priorities
- Make it feel organic to the situation
- Include time pressure or resource limitations
- Raise the stakes in an unexpected way`,

    'opportunity': `Generate an unexpected opportunity or lucky break:
- Present a chance that's too good to ignore
- Include a catch or hidden cost
- Create temptation and difficult choices
- Make it time-sensitive or unique
- Show potential benefits and risks`,

    'random': `Generate a completely random, weird, unexpected event:
- Combine unrelated elements in surprising ways
- Embrace absurdity and creativity
- Make it memorable and vivid
- Include unexpected juxtapositions
- Create something truly bizarre but internally consistent`,
  };

  // Build intensity guidance
  const intensityGuidance: Record<IntensityLevel, string> = {
    mild: `Mild intensity - small but surprising:
- Create a minor twist or complication
- Keep stakes relatively low
- Focus on intrigue and curiosity
- Make it manageable but interesting`,

    moderate: `Moderate intensity - significant but not overwhelming:
- Create substantial but not catastrophic changes
- Raise stakes meaningfully
- Generate strong emotional reactions
- Make it challenging but surmountable`,

    dramatic: `Dramatic intensity - major and game-changing:
- Create major reversals or revelations
- Significantly raise stakes and danger
- Generate shock and strong emotions
- Make it feel like a turning point`,

    extreme: `Extreme intensity - world-shattering:
- Create catastrophic or earth-shattering events
- Push everything to the limit
- Generate maximum shock and impact
- Make it feel epic and unforgettable`,
  };

  // Build context guidance
  let contextGuidance = '';
  if (context) {
    contextGuidance = `\n\nCurrent Story/Situation Context:
${context}

Based on this context:
- Create an event that's unexpected given the current situation
- Make connections to elements already present
- Subvert or complicate the current trajectory
- Feel organic to the world while being surprising
- Consider what would be most interesting/challenging right now`;
  }

  // Build genre guidance
  let genreGuidance = '';
  if (genre) {
    genreGuidance = `\n\nGenre: ${genre}
- Honor the conventions and tone of the ${genre} genre
- Use genre-appropriate imagery and stakes
- Create surprises that fit the genre's sensibilities
- Include genre-specific details and atmosphere`;
  }

  const prompt = `Generate an unexpected event following these guidelines:

Event Type: ${selectedType}
${typeGuidance[selectedType]}

Intensity Level: ${selectedIntensity}
${intensityGuidance[selectedIntensity]}${contextGuidance}${genreGuidance}

Core Requirements:
- Make it genuinely surprising and unexpected
- Include specific, vivid details (not vague or generic)
- Create something memorable and impactful
- Ensure internal logic even if bizarre
- Make it usable for creative inspiration
- Avoid clichés and overused tropes
- Length: 2-4 sentences that paint a vivid picture

Generate 3-5 distinct elements that combine to create this event (e.g., "ancient artifact", "betrayal", "time loop", "sentient AI", "forgotten promise")

Respond in JSON format:
{
  "event": "The unexpected event description (2-4 vivid sentences)",
  "explanation": "Brief 1-2 sentence explanation of why this is surprising and what makes it interesting",
  "elements": ["element1", "element2", "element3", ...]
}`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    const parsed = JSON.parse(result.text.trim());

    return {
      event: parsed.event,
      explanation: parsed.explanation,
      type: selectedType,
      intensity: selectedIntensity,
      elements: parsed.elements || [],
    };
  } catch (error) {
    console.error('Error generating unexpected event:', error);
    // Fallback event in case of error
    return {
      event: "The supposedly abandoned library turns out to be inhabited by a colony of sentient books who've been secretly rewriting history for the past century. They offer you a deal: help them access the internet, and they'll reveal which historical 'facts' they've altered.",
      explanation: "A twist combining unexpected sentience, hidden manipulation, and a morally complex choice.",
      type: selectedType,
      intensity: selectedIntensity,
      elements: ['sentient beings', 'hidden conspiracy', 'moral dilemma', 'altered history', 'technology deal'],
    };
  }
}

export const generateUnexpectedEventTool = tool({
  description: 'Generate unexpected and surprising events, plot twists, or scenarios for creative inspiration. Randomly combines unrelated elements to create surprising challenges, revelations, or complications. Perfect for overcoming writer\'s block, adding excitement to stories/games, or sparking creative problem-solving. Supports various event types (plot-twist, character-reveal, world-event, challenge, complication, opportunity, random) and intensity levels.',
  inputSchema: z.object({
    eventType: z.enum(['plot-twist', 'character-reveal', 'world-event', 'challenge', 'complication', 'opportunity', 'random']).optional().describe('Type of unexpected event (default: random selection). plot-twist=story reversal, character-reveal=hidden truth, world-event=setting change, challenge=obstacle, complication=difficulty, opportunity=lucky break, random=bizarre combination.'),
    intensity: z.enum(['mild', 'moderate', 'dramatic', 'extreme']).optional().describe('How dramatic the event should be (default: random). mild=small twist, moderate=significant, dramatic=game-changing, extreme=world-shattering.'),
    context: z.string().optional().describe('Current story/situation context to make the event more relevant. Include key details about characters, setting, plot, or current situation. The AI will create an event that fits but surprises.'),
    genre: z.string().optional().describe('Genre or style (e.g., "sci-fi", "fantasy", "mystery", "horror", "comedy"). Helps generate genre-appropriate surprises.'),
  }),
  execute: async ({ eventType, intensity, context, genre }) => {
    try {
      console.log('🎲 Generate Unexpected Event: Creating a surprise...');
      if (eventType) {
        console.log(`   🎯 Type: ${eventType}`);
      }
      if (intensity) {
        console.log(`   ⚡ Intensity: ${intensity}`);
      }
      if (context) {
        console.log(`   📖 Using context (${context.length} chars)`);
      }
      if (genre) {
        console.log(`   🎭 Genre: ${genre}`);
      }

      const eventData = await generateUnexpectedEvent(
        eventType,
        intensity,
        context,
        genre
      );

      console.log(`   ✨ Generated: ${eventData.type} (${eventData.intensity})`);

      return {
        success: true,
        event: eventData.event,
        explanation: eventData.explanation,
        type: eventData.type,
        intensity: eventData.intensity,
        elements: eventData.elements,
        contextUsed: !!context,
        genreUsed: genre || 'universal',
        availableTypes: Array.from(EVENT_TYPES),
        availableIntensities: Array.from(INTENSITY_LEVELS),
        formattedOutput: `**Unexpected Event** (${eventData.type} | ${eventData.intensity})\n\n${eventData.event}\n\n*${eventData.explanation}*\n\n**Elements:** ${eventData.elements.join(', ')}`,
      };
    } catch (error) {
      console.error('Error generating unexpected event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate unexpected event',
      };
    }
  },
});
