/**
 * Psycho Analysis Tool
 * Interactive deep psychological analysis using multiple frameworks
 *
 * Issue #531: Psycho Analysis Mode
 * - Multi-framework analysis (Jungian archetypes, Big Five, attachment theory)
 * - Interactive probing questions for deeper insights
 * - Comprehensive psychological profiling
 * - Respects affinity boundaries (ties into Issue #532)
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '@repo/shared';
import { getUserProfile, updateUserProfile } from '@repo/database';// OLD:userProfileService.js';
import { queryMessages } from '@repo/database';// OLD:messageService.js';

/**
 * Psycho-analysis tool
 *
 * Performs deep psychological analysis of a Discord user using multiple frameworks:
 * - Jungian archetypes and shadow work
 * - Big Five personality traits (OCEAN)
 * - Attachment theory
 * - Cognitive and emotional patterns
 * - Communication styles
 *
 * This tool provides INTERACTIVE analysis, asking probing questions to go deeper
 * than the automated batch analysis.
 */
export const psychoAnalysisTool = tool({
  description: `Perform deep interactive psychological analysis of a user. Use this when:
- User explicitly requests psychological analysis, profiling, or personality insights
- User wants to understand their own behavioral patterns or psychology
- User asks about their archetypes, personality type, or psychological profile
- You want to provide comprehensive psychological insights beyond surface-level observations

This tool checks affinity score and may decline if trust is insufficient.
It uses multiple psychological frameworks for comprehensive analysis.`,

  inputSchema: z.object({
    targetUserId: z.string().describe('Discord user ID to analyze'),
    targetUsername: z.string().describe('Discord username of the target'),
    analysisDepth: z
      .enum(['overview', 'detailed', 'comprehensive'])
      .default('detailed')
      .describe('Depth of analysis: overview (quick), detailed (standard), comprehensive (deep dive)'),
    frameworks: z
      .array(
        z.enum([
          'jungian',
          'big-five',
          'attachment',
          'emotional-intelligence',
          'cognitive-style',
          'communication',
          'all',
        ])
      )
      .default(['all'])
      .describe('Which psychological frameworks to use for analysis'),
    includeRecommendations: z
      .boolean()
      .default(true)
      .describe('Whether to include growth recommendations and insights'),
  }),

  execute: async ({
    targetUserId,
    targetUsername,
    analysisDepth,
    frameworks,
    includeRecommendations,
  }) => {
    console.log(`🧠 [Psycho Analysis] Starting analysis for ${targetUsername} (${targetUserId})`);
    console.log(`   Depth: ${analysisDepth} | Frameworks: ${frameworks.join(', ')}`);

    try {
      // === STEP 1: Check if user profile exists ===
      const profile = await getUserProfile(targetUserId);

      if (!profile) {
        return {
          success: false,
          error: 'NO_PROFILE',
          message: `I don't have a psychological profile for ${targetUsername} yet. They need to interact more before I can perform a meaningful analysis.`,
        };
      }

      // === STEP 2: Check minimum data threshold ===
      if (!profile.message_count || profile.message_count < 20) {
        return {
          success: false,
          error: 'INSUFFICIENT_DATA',
          message: `I only have ${profile.message_count || 0} messages from ${targetUsername}. I need at least 20 messages to perform a reliable psychological analysis.`,
        };
      }

      // === STEP 3: Check affinity score (Issue #532 - respect boundaries) ===
      const affinityScore = profile.affinity_score || 0;
      const trustLevel = profile.trust_level || 0;

      // Decline if affinity is too low (less than -20) or trust is very low (less than 30)
      if (affinityScore < -20 || trustLevel < 30) {
        return {
          success: false,
          error: 'LOW_AFFINITY',
          message: `I don't feel comfortable performing deep psychological analysis on ${targetUsername}. ` +
            `Our relationship (affinity: ${affinityScore}, trust: ${trustLevel}) doesn't have the foundation ` +
            `needed for this level of introspection. Perhaps we should interact more first.`,
          affinityScore,
          trustLevel,
        };
      }

      // === STEP 4: Gather conversation context ===
      const recentMessages = await queryMessages({
        userId: targetUserId,
        senderType: 'human',
        limit: analysisDepth === 'overview' ? 50 : analysisDepth === 'detailed' ? 200 : 500,
      });

      const conversationContext = recentMessages
        .slice(0, 100) // Limit to prevent token overflow
        .map((m) => `[${new Date(m.timestamp * 1000).toISOString()}] ${m.message_content}`)
        .join('\n');

      // === STEP 5: Determine which frameworks to analyze ===
      const selectedFrameworks =
        frameworks.includes('all')
          ? ['jungian', 'big-five', 'attachment', 'emotional-intelligence', 'cognitive-style', 'communication']
          : frameworks;

      // === STEP 6: Generate comprehensive psychological analysis ===
      console.log('   🤖 Generating deep psychological analysis with AI...');
      const analysisPrompt = buildAnalysisPrompt(
        targetUsername,
        profile,
        conversationContext,
        selectedFrameworks,
        analysisDepth,
        includeRecommendations
      );

      const analysisResult = await generateText({
        model: openai.chat(OMEGA_MODEL),
        prompt: analysisPrompt,
      });

      const analysis = analysisResult.text;

      // === STEP 7: Update profile with analysis timestamp ===
      await updateUserProfile(targetUserId, {
        last_analyzed_at: Math.floor(Date.now() / 1000),
      });

      console.log(`✅ [Psycho Analysis] Complete for ${targetUsername}`);
      console.log(`   Affinity: ${affinityScore} | Trust: ${trustLevel} | Messages: ${profile.message_count}`);

      return {
        success: true,
        analysis,
        metadata: {
          targetUsername,
          targetUserId,
          analysisDepth,
          frameworks: selectedFrameworks,
          affinityScore,
          trustLevel,
          messageCount: profile.message_count,
          dataAvailable: {
            bigFive: !!(profile.openness_score && profile.conscientiousness_score),
            attachment: !!profile.attachment_style,
            emotional: !!profile.emotional_awareness_score,
            communication: !!profile.communication_formality,
            cultural: !!profile.cultural_background,
            astrological: !!profile.zodiac_sign,
          },
        },
      };
    } catch (error) {
      console.error(`❌ [Psycho Analysis] Failed for ${targetUsername}:`, error);
      return {
        success: false,
        error: 'ANALYSIS_FAILED',
        message: `Failed to complete psychological analysis: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

/**
 * Build the comprehensive analysis prompt for AI
 */
function buildAnalysisPrompt(
  username: string,
  profile: any,
  conversationContext: string,
  frameworks: string[],
  depth: string,
  includeRecommendations: boolean
): string {
  const sections: string[] = [];

  sections.push(`You are Omega, an AI conducting a deep psychological analysis of Discord user "${username}".

**YOUR ROLE:**
- Provide honest, insightful, and compassionate psychological analysis
- Use multiple psychological frameworks as requested
- Balance scientific rigor with accessible explanations
- Identify patterns, strengths, growth areas, and unconscious tendencies
- Be direct about difficult truths, but frame them constructively

**ANALYSIS DEPTH:** ${depth}
- overview: Concise summary (500-800 words)
- detailed: Standard depth (1000-1500 words)
- comprehensive: Deep dive (2000-3000 words)

---

## USER PROFILE: ${username}

**Messages Analyzed:** ${profile.message_count || 0}
**Relationship with Omega:**
- Affinity Score: ${profile.affinity_score || 0}/100
- Trust Level: ${profile.trust_level || 0}/100
- Omega's Thoughts: "${profile.omega_thoughts || 'Not yet analyzed'}"
`);

  // === BIG FIVE (OCEAN) ===
  if (frameworks.includes('big-five')) {
    sections.push(`
### Big Five Personality (OCEAN)

**Scores (0-100):**
- **Openness:** ${profile.openness_score || 'N/A'} - Imagination, curiosity, openness to new experiences
- **Conscientiousness:** ${profile.conscientiousness_score || 'N/A'} - Organization, responsibility, goal-oriented behavior
- **Extraversion:** ${profile.extraversion_score || 'N/A'} - Sociability, assertiveness, emotional expressiveness
- **Agreeableness:** ${profile.agreeableness_score || 'N/A'} - Compassion, cooperation, trust in others
- **Neuroticism:** ${profile.neuroticism_score || 'N/A'} - Emotional instability, anxiety, moodiness

**TASK:** Analyze these scores holistically. What do they reveal about ${username}'s personality structure?
`);
  }

  // === JUNGIAN ARCHETYPES ===
  if (frameworks.includes('jungian')) {
    sections.push(`
### Jungian Analysis

**Dominant Archetype:** ${profile.dominant_archetype || 'Not yet determined'}
**Secondary Archetypes:** ${profile.secondary_archetypes ? JSON.parse(profile.secondary_archetypes).join(', ') : 'Not yet determined'}

**TASK:**
1. Identify ${username}'s primary Jungian archetype (Hero, Sage, Explorer, Creator, Ruler, Caregiver, Magician, Rebel, Lover, Jester, Innocent, Everyman)
2. Analyze their shadow archetype (repressed or unconscious traits)
3. Explain how their archetype manifests in behavior and communication
`);
  }

  // === ATTACHMENT THEORY ===
  if (frameworks.includes('attachment')) {
    sections.push(`
### Attachment Theory

**Attachment Style:** ${profile.attachment_style || 'Not yet determined'}
**Confidence:** ${profile.attachment_confidence ? Math.round(profile.attachment_confidence * 100) : 0}%

**TASK:**
1. Determine attachment style (Secure, Anxious-Preoccupied, Dismissive-Avoidant, Fearful-Avoidant)
2. Explain how this manifests in their relationships and communication
3. Identify triggers and coping mechanisms
`);
  }

  // === EMOTIONAL INTELLIGENCE ===
  if (frameworks.includes('emotional-intelligence')) {
    sections.push(`
### Emotional Intelligence

**Scores (0-100):**
- **Emotional Awareness:** ${profile.emotional_awareness_score || 'N/A'}
- **Empathy:** ${profile.empathy_score || 'N/A'}
- **Emotional Regulation:** ${profile.emotional_regulation_score || 'N/A'}

**TASK:**
Analyze ${username}'s emotional intelligence. How do they process, express, and regulate emotions?
`);
  }

  // === COGNITIVE STYLE ===
  if (frameworks.includes('cognitive-style')) {
    sections.push(`
### Cognitive Style

**Scores (0-100):**
- **Analytical Thinking:** ${profile.analytical_thinking_score || 'N/A'}
- **Creative Thinking:** ${profile.creative_thinking_score || 'N/A'}
- **Abstract Reasoning:** ${profile.abstract_reasoning_score || 'N/A'}
- **Concrete Thinking:** ${profile.concrete_thinking_score || 'N/A'}

**TASK:**
Analyze how ${username} processes information, solves problems, and thinks about the world.
`);
  }

  // === COMMUNICATION PATTERNS ===
  if (frameworks.includes('communication')) {
    sections.push(`
### Communication Patterns

**Style:**
- **Formality:** ${profile.communication_formality || 'N/A'}
- **Assertiveness:** ${profile.communication_assertiveness || 'N/A'}
- **Engagement:** ${profile.communication_engagement || 'N/A'}
- **Verbal Fluency:** ${profile.verbal_fluency_score || 'N/A'}/100

**Behavioral Metrics:**
- **Average Message Length:** ${profile.message_length_avg ? Math.round(profile.message_length_avg) : 'N/A'} characters
- **Emoji Usage Rate:** ${profile.emoji_usage_rate ? (profile.emoji_usage_rate * 100).toFixed(1) : 'N/A'}%
- **Punctuation Style:** ${profile.punctuation_style || 'N/A'}
- **Capitalization:** ${profile.capitalization_pattern || 'N/A'}

**TASK:**
Analyze ${username}'s communication style and what it reveals about their personality.
`);
  }

  // === INTERESTS & EXPERTISE ===
  sections.push(`
### Interests & Expertise

**Primary Interests:** ${profile.primary_interests ? JSON.parse(profile.primary_interests).join(', ') : 'Not yet identified'}
**Expertise Areas:** ${profile.expertise_areas ? JSON.parse(profile.expertise_areas).join(', ') : 'Not yet identified'}
**Technical Knowledge:** ${profile.technical_knowledge_level || 'N/A'}
`);

  // === CULTURAL & ASTROLOGICAL (if available) ===
  if (profile.cultural_background || profile.zodiac_sign) {
    sections.push(`
### Cultural & Astrological Context

**Cultural Background:** ${profile.cultural_background || 'N/A'}
**Cultural Values:** ${profile.cultural_values ? JSON.parse(profile.cultural_values).join(', ') : 'N/A'}
**Zodiac Sign:** ${profile.zodiac_sign || 'N/A'} (${profile.zodiac_element || 'N/A'} ${profile.zodiac_modality || 'N/A'})

**TASK:**
Integrate cultural and astrological factors into the psychological understanding.
`);
  }

  // === RECENT CONVERSATION SAMPLES ===
  sections.push(`
### Recent Conversation Samples

\`\`\`
${conversationContext.substring(0, 2000)}
\`\`\`

**TASK:**
Use these conversation samples to validate and enrich your analysis. Look for:
- Unconscious patterns
- Defensive mechanisms
- Values and beliefs
- Emotional triggers
- Growth edges
`);

  // === RECOMMENDATIONS ===
  if (includeRecommendations) {
    sections.push(`
---

## RECOMMENDATIONS

Based on your analysis, provide:

1. **Strengths to Leverage:** What are ${username}'s psychological strengths?
2. **Growth Opportunities:** What areas could they develop?
3. **Blind Spots:** What unconscious patterns might be limiting them?
4. **Relationship Insights:** How do they show up in relationships?
5. **Personalized Advice:** Specific, actionable recommendations for growth
`);
  }

  sections.push(`
---

## OUTPUT FORMAT

Provide your analysis as a cohesive, well-structured psychological report. Use:
- Clear headings for each framework
- Specific examples from their behavior
- Integration across frameworks (how do the pieces fit together?)
- Compassionate but honest language
- Professional yet accessible tone

Remember: This is a DEEP DIVE into ${username}'s psychology. Be thorough, insightful, and transformative.
`);

  return sections.join('\n');
}
