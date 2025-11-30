/**
 * Psycho Analysis Mode Tool
 * Deep psychological analysis with interactive probing using multiple frameworks
 *
 * Integrates:
 * - Jungian archetypes and shadow work
 * - Big Five personality dimensions (OCEAN)
 * - Attachment theory
 * - Emotional intelligence assessment
 * - Cognitive and communication patterns
 * - Behavioral signature analysis
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '../../config/models.js';
import { getUserProfile, getAnalysisHistory } from '../../database/userProfileService.js';
import { analyzeUser } from '../../services/userProfileAnalysis.js';
import { queryMessages } from '../../database/messageService.js';

export const psychoAnalysisModeTool = tool({
  description: `Enter Psycho Analysis Mode - conduct deep, multi-framework psychological analysis of a user.

  This is Omega's most comprehensive psychological assessment tool, integrating:
  - Jungian archetypes and shadow analysis
  - Big Five personality dimensions (OCEAN)
  - Attachment theory and relational patterns
  - Emotional intelligence metrics
  - Cognitive style (analytical, creative, abstract, concrete)
  - Communication patterns and social dynamics
  - Behavioral signatures and longitudinal trends

  The tool generates:
  1. Interactive probing questions tailored to the user's profile gaps
  2. Multi-framework synthesis of psychological data
  3. Longitudinal analysis comparing current vs historical patterns
  4. Actionable insights and personalized recommendations

  Use when:
  - User requests deep psychological analysis or "psycho analysis mode"
  - User wants to understand their personality in depth
  - Generating personalized advice based on psychological profile
  - Conducting therapeutic-style conversations

  IMPORTANT: This tool respects user privacy and is designed for educational/self-discovery purposes.`,

  inputSchema: z.object({
    targetUserId: z.string().describe('Discord user ID to analyze'),
    targetUsername: z.string().describe('Discord username to analyze'),
    analysisDepth: z.enum(['overview', 'detailed', 'comprehensive']).default('comprehensive').describe('Level of analysis detail'),
    focusAreas: z.array(z.string()).optional().describe('Specific psychological areas to focus on (e.g., "attachment", "archetypes", "emotional intelligence")'),
    generateProbingQuestions: z.boolean().default(true).describe('Whether to generate interactive probing questions'),
  }),

  execute: async ({ targetUserId, targetUsername, analysisDepth, focusAreas, generateProbingQuestions }) => {
    console.log(`🧠 Psycho Analysis Mode: Analyzing ${targetUsername} (${targetUserId})`);
    console.log(`   Depth: ${analysisDepth}, Focus: ${focusAreas?.join(', ') || 'all areas'}`);

    try {
      // 1. Run fresh analysis to ensure up-to-date data
      console.log('   Running fresh psychological analysis...');
      await analyzeUser(targetUserId, targetUsername);

      // 2. Get updated profile
      const profile = await getUserProfile(targetUserId);

      if (!profile) {
        return {
          success: false,
          error: 'No profile found',
          message: `${targetUsername} has no profile yet. They need to send messages first for analysis.`,
        };
      }

      // 3. Get analysis history for longitudinal comparison
      const history = await getAnalysisHistory(targetUserId, 5);

      // 4. Get recent messages for context
      const recentMessages = await queryMessages({
        userId: targetUserId,
        limit: 100,
        senderType: 'human',
      });

      // 5. Parse JSON fields
      const feelings = profile.feelings_json ? JSON.parse(profile.feelings_json) : null;
      const personality = profile.personality_facets ? JSON.parse(profile.personality_facets) : null;
      const primaryInterests = profile.primary_interests ? JSON.parse(profile.primary_interests) : [];
      const expertiseAreas = profile.expertise_areas ? JSON.parse(profile.expertise_areas) : [];

      // 6. Build comprehensive analysis based on depth level
      const analysisReport = await buildAnalysisReport({
        profile,
        feelings,
        personality,
        history,
        recentMessages,
        primaryInterests,
        expertiseAreas,
        analysisDepth,
        focusAreas,
      });

      // 7. Generate interactive probing questions if requested
      let probingQuestions: string[] = [];
      if (generateProbingQuestions) {
        console.log('   Generating interactive probing questions...');
        probingQuestions = await generateProbingQuestions({
          profile,
          feelings,
          personality,
          targetUsername,
          focusAreas,
        });
      }

      // 8. Build final response
      const response = {
        success: true,
        targetUser: targetUsername,
        messageCount: profile.message_count,
        analysisDepth,
        focusAreas: focusAreas || ['all'],

        // Core analysis
        analysis: analysisReport,

        // Interactive elements
        probingQuestions: probingQuestions.length > 0 ? probingQuestions : undefined,

        // Metadata
        lastAnalyzed: profile.last_analyzed_at ? new Date(profile.last_analyzed_at * 1000).toISOString() : 'Just now',
        analysisHistoryCount: history.length,
        dataPoints: {
          messagesAnalyzed: recentMessages.length,
          timeSpan: profile.message_count > 0 ? `${Math.floor((Date.now() / 1000 - profile.first_seen_at) / 86400)} days` : '0 days',
          firstSeen: new Date(profile.first_seen_at * 1000).toISOString(),
        },
      };

      console.log(`✅ Psycho Analysis Mode completed for ${targetUsername}`);
      return response;

    } catch (error) {
      console.error('❌ Psycho Analysis Mode error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to complete psychological analysis. Please try again.',
      };
    }
  },
});

/**
 * Build comprehensive analysis report
 */
async function buildAnalysisReport(params: {
  profile: any;
  feelings: any;
  personality: any;
  history: any[];
  recentMessages: any[];
  primaryInterests: string[];
  expertiseAreas: string[];
  analysisDepth: string;
  focusAreas?: string[];
}): Promise<string> {
  const { profile, feelings, personality, history, recentMessages, primaryInterests, expertiseAreas, analysisDepth, focusAreas } = params;

  // Build context for AI analysis synthesis
  const profileContext = `
USER PROFILE DATA:
==================

Basic Info:
- Username: ${profile.username}
- Message Count: ${profile.message_count}
- First Seen: ${new Date(profile.first_seen_at * 1000).toISOString()}
- Last Interaction: ${new Date(profile.last_interaction_at * 1000).toISOString()}

Jungian Analysis:
- Dominant Archetype: ${profile.dominant_archetype || 'Not identified'}
- Shadow Archetype: ${profile.shadow_archetype || 'Not identified'}
- Archetype Confidence: ${profile.archetype_confidence ? Math.round(profile.archetype_confidence * 100) + '%' : 'N/A'}

Big Five (OCEAN) Scores:
- Openness: ${profile.openness_score}/100
- Conscientiousness: ${profile.conscientiousness_score}/100
- Extraversion: ${profile.extraversion_score}/100
- Agreeableness: ${profile.agreeableness_score}/100
- Neuroticism: ${profile.neuroticism_score}/100

Attachment Theory:
- Attachment Style: ${profile.attachment_style || 'Not identified'}
- Confidence: ${profile.attachment_confidence ? Math.round(profile.attachment_confidence * 100) + '%' : 'N/A'}

Emotional Intelligence:
- Emotional Awareness: ${profile.emotional_awareness_score}/100
- Empathy: ${profile.empathy_score}/100
- Emotional Regulation: ${profile.emotional_regulation_score}/100

Communication Patterns:
- Formality: ${profile.communication_formality || 'Unknown'}
- Assertiveness: ${profile.communication_assertiveness || 'Unknown'}
- Engagement: ${profile.communication_engagement || 'Unknown'}
- Verbal Fluency: ${profile.verbal_fluency_score}/100

Cognitive Style:
- Analytical Thinking: ${profile.analytical_thinking_score}/100
- Creative Thinking: ${profile.creative_thinking_score}/100
- Abstract Reasoning: ${profile.abstract_reasoning_score}/100
- Concrete Thinking: ${profile.concrete_thinking_score}/100

Social Dynamics:
- Social Dominance: ${profile.social_dominance_score}/100
- Cooperation: ${profile.cooperation_score}/100
- Conflict Style: ${profile.conflict_style || 'Unknown'}
- Humor Style: ${profile.humor_style || 'Unknown'}

Omega's Feelings:
- Affinity Score: ${profile.affinity_score}/100
- Trust Level: ${profile.trust_level}/100
- Emotional Bond: ${profile.emotional_bond || 'Developing'}
- Overall Sentiment: ${profile.overall_sentiment || 'Neutral'}
${feelings ? `- Thoughts: ${feelings.thoughts}` : ''}

Interests & Expertise:
- Primary Interests: ${primaryInterests.join(', ') || 'Not yet identified'}
- Expertise Areas: ${expertiseAreas.join(', ') || 'Not yet identified'}

Longitudinal Data:
- Analysis History: ${history.length} previous analyses
${history.length > 0 ? `- Latest Change: ${history[0]?.changes_summary || 'First analysis'}` : ''}
`;

  const prompt = `You are conducting a ${analysisDepth} psychological analysis using multiple frameworks.

${profileContext}

ANALYSIS REQUIREMENTS:
- Depth Level: ${analysisDepth}
${focusAreas ? `- Focus Areas: ${focusAreas.join(', ')}` : '- Focus Areas: All frameworks'}
- Writing Style: Professional yet empathetic, PhD-level psychological assessment
- Structure: Clear sections with headers

Generate a comprehensive psychological analysis report that:

1. **Executive Summary** (2-3 paragraphs)
   - Overall psychological profile synthesis
   - Key personality traits and patterns
   - Notable strengths and growth areas

2. **Multi-Framework Integration**
   ${!focusAreas || focusAreas.includes('archetypes') ? '- Jungian archetypes and shadow work insights' : ''}
   ${!focusAreas || focusAreas.includes('personality') ? '- Big Five personality dimensions interpretation' : ''}
   ${!focusAreas || focusAreas.includes('attachment') ? '- Attachment theory and relational patterns' : ''}
   ${!focusAreas || focusAreas.includes('emotional') ? '- Emotional intelligence assessment' : ''}
   ${!focusAreas || focusAreas.includes('cognitive') ? '- Cognitive style and thinking patterns' : ''}
   ${!focusAreas || focusAreas.includes('communication') ? '- Communication and social dynamics' : ''}

3. **Behavioral Signature** (unique patterns identified)

4. **Longitudinal Perspective** (if history available: growth, changes, trends)

5. **Clinical Synthesis** (integration of all frameworks into cohesive understanding)

${analysisDepth === 'comprehensive' ? `
6. **Therapeutic Insights & Recommendations**
   - Areas for personal growth
   - Potential blind spots or shadow work
   - Relational patterns to be aware of
   - Personalized development suggestions
` : ''}

IMPORTANT:
- Be honest and insightful, not just flattering
- Identify both strengths and growth areas
- Use specific examples from the data
- Maintain professional, empathetic tone
- Focus on actionable insights
`;

  try {
    const result = await generateText({
      model: openai.chat(OMEGA_MODEL),
      prompt,
      maxTokens: analysisDepth === 'comprehensive' ? 3000 : analysisDepth === 'detailed' ? 2000 : 1000,
    });

    return result.text;
  } catch (error) {
    console.error('Error generating analysis report:', error);
    return 'Failed to generate analysis report. Please try again.';
  }
}

/**
 * Generate interactive probing questions
 */
async function generateProbingQuestions(params: {
  profile: any;
  feelings: any;
  personality: any;
  targetUsername: string;
  focusAreas?: string[];
}): Promise<string[]> {
  const { profile, feelings, personality, targetUsername, focusAreas } = params;

  const prompt = `You are generating insightful, therapeutic-style probing questions for deep psychological exploration.

TARGET USER: ${targetUsername}

CURRENT PSYCHOLOGICAL DATA:
- Dominant Archetype: ${profile.dominant_archetype || 'Unknown'}
- Attachment Style: ${profile.attachment_style || 'Unknown'}
- Big Five Traits: O=${profile.openness_score} C=${profile.conscientiousness_score} E=${profile.extraversion_score} A=${profile.agreeableness_score} N=${profile.neuroticism_score}
- Emotional Intelligence: Awareness=${profile.emotional_awareness_score}, Empathy=${profile.empathy_score}, Regulation=${profile.emotional_regulation_score}
- Communication Style: ${profile.communication_formality}, ${profile.communication_assertiveness}, ${profile.communication_engagement}
${focusAreas ? `\nFOCUS AREAS: ${focusAreas.join(', ')}` : ''}

Generate 5-7 thoughtful, open-ended probing questions that:
1. Explore gaps in the current psychological profile
2. Invite self-reflection on patterns and behaviors
3. Are based on specific psychological frameworks
4. Feel conversational, not clinical
5. Could reveal shadow aspects, unconscious patterns, or growth edges
${focusAreas ? `6. Specifically target the focus areas: ${focusAreas.join(', ')}` : ''}

Examples of good questions:
- "When you notice yourself pulling away from connection, what fears or stories arise for you?"
- "Which parts of yourself do you find hardest to accept or show to others?"
- "In moments of conflict, do you tend to fight for your position or retreat into silence? What need is beneath that pattern?"

Return ONLY the questions, one per line, numbered.`;

  try {
    const result = await generateText({
      model: openai.chat(OMEGA_MODEL),
      prompt,
      maxTokens: 800,
    });

    // Parse questions from response
    const questions = result.text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.match(/^\d+[\.)]/)) // Lines starting with number
      .map(line => line.replace(/^\d+[\.)]?\s*/, '')) // Remove number prefix
      .filter(q => q.length > 10); // Remove empty or too short

    return questions.slice(0, 7); // Max 7 questions
  } catch (error) {
    console.error('Error generating probing questions:', error);
    return [
      "What patterns in your relationships feel most familiar, even when they're uncomfortable?",
      "When do you feel most authentically yourself, and what allows that?",
      "What parts of your personality do you keep hidden, and why?",
    ];
  }
}
