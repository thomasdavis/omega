/**
 * Generate Personalized Poem Tool
 * Creates personalized poems based on user profile data
 *
 * Features:
 * - Loads user profile information (personality, appearance, interests)
 * - Generates AI-powered poems that reflect the user's unique attributes
 * - Supports multiple poem styles (free verse, rhyming, haiku, sonnet)
 * - Incorporates user's personality traits, communication style, and more
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '@repo/shared';
import { getUserProfile } from '@repo/database';

// Available poem styles
const POEM_STYLES = [
  'free-verse',
  'rhyming',
  'haiku',
  'sonnet',
  'limerick',
  'acrostic',
] as const;

type PoemStyle = typeof POEM_STYLES[number];

/**
 * Generate a personalized poem based on user profile
 */
async function generatePersonalizedPoem(
  userId: string,
  username: string,
  style: PoemStyle = 'free-verse'
): Promise<{
  title: string;
  poem: string;
  style: string;
  analysis: string;
  success: boolean;
  error?: string;
}> {
  try {
    // Load user profile
    console.log(`   Loading profile for ${username}...`);
    const profile = await getUserProfile(userId);

    if (!profile) {
      return {
        title: 'Profile Not Found',
        poem: '',
        style,
        analysis: '',
        success: false,
        error: `No profile found for user ${username}. The user needs to interact more to build a profile.`,
      };
    }

    // Parse profile data
    const feelings = profile.feelings_json ? JSON.parse(profile.feelings_json) : null;
    const personality = profile.personality_facets ? JSON.parse(profile.personality_facets) : null;

    // Build profile context for AI
    const profileContext = buildProfileContext(profile, feelings, personality);

    console.log(`   Generating ${style} poem based on profile...`);

    // Build style-specific guidance
    const styleGuidance = getStyleGuidance(style);

    const prompt = `Generate a deeply personalized poem for ${username} based on their comprehensive profile.

**Profile Context:**
${profileContext}

**Poem Style:** ${style}
${styleGuidance}

**Instructions:**
- Create a poem that truly reflects this person's unique personality, interests, and essence
- Draw from specific details in their profile (personality traits, communication style, interests)
- Make it feel personal and meaningful, not generic
- Use vivid imagery and emotional resonance
- Reference their dominant archetype or personality traits naturally
- If they have a photo/appearance description, you may subtly reference visual elements
- Capture their communication style in the poem's tone
- Make them feel seen and understood

**CRITICAL:** This poem should feel like it was written specifically for ${username}, not just any person. Use their specific traits and characteristics.

Respond in JSON format:
{
  "title": "A creative title for the poem (include their name or a reference to them)",
  "poem": "The complete personalized poem (use \\n for line breaks)",
  "analysis": "A brief 1-2 sentence explanation of how the poem reflects their unique profile"
}`;

    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    const parsed = JSON.parse(result.text.trim());

    return {
      title: parsed.title,
      poem: parsed.poem,
      style,
      analysis: parsed.analysis,
      success: true,
    };
  } catch (error) {
    console.error('Error generating personalized poem:', error);
    return {
      title: 'Error',
      poem: '',
      style,
      analysis: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build comprehensive profile context for the AI
 */
function buildProfileContext(profile: any, feelings: any, personality: any): string {
  const sections: string[] = [];

  // Basic info
  sections.push(`**Username:** ${profile.username}`);
  sections.push(`**Interactions:** ${profile.message_count || 0} messages`);

  // Personality & Archetype
  if (profile.dominant_archetype) {
    sections.push(`**Dominant Archetype:** ${profile.dominant_archetype}`);
  }

  // Big Five personality scores
  if (profile.openness_score !== null) {
    sections.push(
      `**Personality (Big Five):** Openness=${profile.openness_score}, Conscientiousness=${profile.conscientiousness_score}, Extraversion=${profile.extraversion_score}, Agreeableness=${profile.agreeableness_score}, Neuroticism=${profile.neuroticism_score}`
    );
  }

  // Communication style
  if (profile.communication_formality || profile.communication_engagement) {
    sections.push(
      `**Communication Style:** ${profile.communication_formality || 'neutral'} formality, ${profile.communication_engagement || 'moderate'} engagement, ${profile.communication_assertiveness || 'balanced'} assertiveness`
    );
  }

  // Emotional profile
  if (feelings) {
    sections.push(
      `**Emotional Profile:** Affinity score ${feelings.affinityScore || 'unknown'}, Trust level ${feelings.trustLevel || 'unknown'}, Emotional bond: ${feelings.emotionalBond || 'developing'}`
    );
    if (feelings.thoughts) {
      sections.push(`**Omega's Thoughts:** ${feelings.thoughts}`);
    }
  }

  // Personality facets
  if (personality?.dominantArchetypes) {
    sections.push(
      `**Personality Facets:** ${personality.dominantArchetypes.join(', ')}`
    );
  }
  if (personality?.traits) {
    sections.push(`**Key Traits:** ${personality.traits.slice(0, 5).join(', ')}`);
  }

  // Interests and expertise
  if (profile.primary_interests) {
    try {
      const interests = JSON.parse(profile.primary_interests);
      if (interests.length > 0) {
        sections.push(`**Interests:** ${interests.join(', ')}`);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  if (profile.expertise_areas) {
    try {
      const expertise = JSON.parse(profile.expertise_areas);
      if (expertise.length > 0) {
        sections.push(`**Expertise:** ${expertise.join(', ')}`);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Appearance (if available)
  if (profile.ai_appearance_description) {
    sections.push(`**Appearance:** ${profile.ai_appearance_description}`);
  }

  // Overall sentiment
  if (profile.overall_sentiment) {
    sections.push(`**Overall Sentiment:** ${profile.overall_sentiment}`);
  }

  // Attachment style
  if (profile.attachment_style) {
    sections.push(`**Attachment Style:** ${profile.attachment_style}`);
  }

  return sections.join('\n');
}

/**
 * Get style-specific guidance for poem generation
 */
function getStyleGuidance(style: PoemStyle): string {
  const guidance: Record<PoemStyle, string> = {
    'free-verse': `
**Free Verse Guidelines:**
- No strict rhyme or meter requirements
- Focus on natural speech rhythms and imagery
- Use line breaks for emphasis and pacing
- 12-20 lines recommended
- Allow the person's essence to guide the structure`,

    'rhyming': `
**Rhyming Poem Guidelines:**
- Use a consistent rhyme scheme (ABAB, AABB, or ABCB)
- Maintain natural rhythm (iambic or similar)
- 12-16 lines in 3-4 stanzas
- Don't force rhymes - keep it natural
- Rhymes should enhance, not distract from meaning`,

    'haiku': `
**Haiku Guidelines:**
- Traditional 5-7-5 syllable structure
- Capture a single moment or essence
- Use concrete, sensory imagery
- Create a "cutting" or juxtaposition
- May write 3-5 haikus to capture different facets`,

    'sonnet': `
**Sonnet Guidelines:**
- 14 lines total
- Shakespearean (ABAB CDCD EFEF GG) or Petrarchan (ABBAABBA CDECDE)
- Iambic pentameter (10 syllables per line)
- Develop theme through quatrains, resolve in couplet/sestet
- Traditional structure with personal content`,

    'limerick': `
**Limerick Guidelines:**
- 5 lines with AABBA rhyme scheme
- Bouncy, humorous rhythm
- Lines 1, 2, 5 are longer (7-10 syllables)
- Lines 3, 4 are shorter (5-7 syllables)
- Playful and witty tone that captures personality
- May write 2-3 limericks for fuller portrait`,

    'acrostic': `
**Acrostic Guidelines:**
- Each line begins with a letter from the person's name/username
- Lines should flow naturally, not feel forced
- Each line captures an aspect of their personality
- Can be rhyming or free verse
- Make it meaningful and personal`,
  };

  return guidance[style];
}

export const generatePersonalizedPoemTool = tool({
  description: `Generate a deeply personalized poem for a user based on their comprehensive profile data. This tool loads the user's personality traits, communication style, interests, appearance, and emotional profile to create a unique, meaningful poem that truly reflects who they are. Perfect for when someone asks "write me a poem" or wants a personalized poetic expression. The poem will incorporate their Big Five personality scores, dominant archetypes, interests, and other unique characteristics.`,

  inputSchema: z.object({
    userId: z.string().describe('Discord user ID of the person to write the poem for'),
    username: z.string().describe('Discord username of the person'),
    style: z
      .enum(['free-verse', 'rhyming', 'haiku', 'sonnet', 'limerick', 'acrostic'])
      .optional()
      .describe(
        'Poem style (default: free-verse). Options: free-verse (natural/flexible), rhyming (structured rhymes), haiku (5-7-5 syllables), sonnet (14 lines), limerick (humorous 5-line), acrostic (name-based)'
      ),
  }),

  execute: async ({ userId, username, style = 'free-verse' }) => {
    console.log(`📝 Generate Personalized Poem: Creating ${style} poem for ${username}...`);

    const result = await generatePersonalizedPoem(userId, username, style);

    if (!result.success) {
      console.error(`   ❌ Failed: ${result.error}`);
      return {
        success: false,
        error: result.error,
        message: result.error,
      };
    }

    console.log(`   ✨ Generated: "${result.title}"`);

    return {
      success: true,
      title: result.title,
      poem: result.poem,
      style: result.style,
      analysis: result.analysis,
      username,
      availableStyles: Array.from(POEM_STYLES),
      formattedOutput: `**${result.title}**\n\n${result.poem}\n\n*${result.analysis}*\n\n—\n*Style: ${style} | Personalized for ${username}*`,
    };
  },
});
