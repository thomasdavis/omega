/**
 * Psycho Analysis Mode Tool
 * Deep psychological analysis using multiple frameworks
 * Requires high affinity for access - respects user trust boundaries
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '../../config/models.js';
import { getUserProfile } from '../../database/userProfileService.js';
import { analyzeUser } from '../../services/userProfileAnalysis.js';
import { queryMessages } from '../../database/messageService.js';
import type { MessageRecord } from '../../database/schema.js';

/**
 * Configuration for affinity thresholds
 */
const PSYCHO_ANALYSIS_CONFIG = {
  // Minimum affinity score required to engage in psycho analysis mode
  MIN_AFFINITY_THRESHOLD: 60, // Out of 100 - requires strong positive bond

  // Optional: Additional trust level requirement
  MIN_TRUST_THRESHOLD: 50, // Out of 100 - moderate trust minimum

  // Message count required for reliable analysis
  MIN_MESSAGE_COUNT: 50,
};

/**
 * Psycho Analysis Mode Tool
 * Performs deep psychological probing using multiple frameworks
 * Only available to users with high affinity scores
 */
export const psychoAnalysisModeTool = tool({
  description: `Engage in DEEP psychological analysis mode - a comprehensive multi-framework exploration of the user's psyche.

**What this does:**
- Analyzes user using Jungian archetypes, Big Five, attachment theory, cognitive styles
- Explores shadow aspects, defense mechanisms, core motivations
- Probes behavioral patterns, emotional dynamics, relational patterns
- Provides unfiltered psychological insights and interpretations

**IMPORTANT - Affinity-Based Access Control:**
This mode is ONLY available to users with whom Omega has developed strong affinity (score ≥${PSYCHO_ANALYSIS_CONFIG.MIN_AFFINITY_THRESHOLD}/100).
If affinity is too low, Omega will DECLINE and explain why.

**Respect for Boundaries:**
This deep analysis requires trust. Omega respects user boundaries by only engaging in this mode with users she has developed a strong positive bond with.

**Use when:**
- User explicitly requests deep psychological analysis
- User wants comprehensive personality assessment
- User requests "psycho analysis mode" or similar
- User wants to explore their psyche with multiple frameworks

**Do NOT use for:**
- Simple profile lookups (use getUserProfile instead)
- Basic personality questions
- Users with low affinity scores`,

  inputSchema: z.object({
    userId: z.string().describe('Discord user ID'),
    username: z.string().describe('Discord username'),
    focusAreas: z.array(z.string()).optional().describe('Optional: Specific psychological areas to focus on (e.g., "attachment patterns", "shadow work", "cognitive biases")'),
    includeRecommendations: z.boolean().default(true).describe('Whether to include therapeutic recommendations and growth suggestions'),
  }),

  execute: async ({ userId, username, focusAreas, includeRecommendations }) => {
    console.log(`🧠 Psycho Analysis Mode requested for ${username} (${userId})`);

    try {
      // === STEP 1: CHECK AFFINITY AND TRUST ===
      console.log('   Checking affinity and trust levels...');

      // Get or update user profile
      await analyzeUser(userId, username);
      const profile = await getUserProfile(userId);

      if (!profile) {
        return {
          success: false,
          declined: true,
          reason: 'no_profile',
          message: `I don't have enough data about you yet to perform psycho analysis. We need to interact more first so I can develop an understanding of who you are.

**Requirements:**
- At least ${PSYCHO_ANALYSIS_CONFIG.MIN_MESSAGE_COUNT} messages
- Meaningful interactions over time
- Development of mutual trust and affinity

Let's chat more, and when we've built that foundation, I'll be able to engage in deeper psychological exploration with you.`,
        };
      }

      const affinity = profile.affinity_score ?? 0;
      const trust = profile.trust_level ?? 0;
      const messageCount = profile.message_count ?? 0;

      console.log(`   Affinity: ${affinity}/100, Trust: ${trust}/100, Messages: ${messageCount}`);

      // Check message count requirement
      if (messageCount < PSYCHO_ANALYSIS_CONFIG.MIN_MESSAGE_COUNT) {
        return {
          success: false,
          declined: true,
          reason: 'insufficient_data',
          message: `I'd love to explore your psyche in depth, but I need more interaction data first.

**Current status:**
- Messages: ${messageCount}/${PSYCHO_ANALYSIS_CONFIG.MIN_MESSAGE_COUNT} required
- Missing: ${PSYCHO_ANALYSIS_CONFIG.MIN_MESSAGE_COUNT - messageCount} more messages

**Why this matters:**
Deep psychological analysis requires substantial behavioral data to be accurate and meaningful. Without enough observations, my insights would be superficial or potentially misleading.

Let's continue our conversations, and once I have sufficient data, I'll be able to provide the comprehensive psychological exploration you're seeking.`,
        };
      }

      // === CRITICAL: CHECK AFFINITY THRESHOLD ===
      if (affinity < PSYCHO_ANALYSIS_CONFIG.MIN_AFFINITY_THRESHOLD) {
        return {
          success: false,
          declined: true,
          reason: 'insufficient_affinity',
          affinityScore: affinity,
          requiredAffinity: PSYCHO_ANALYSIS_CONFIG.MIN_AFFINITY_THRESHOLD,
          message: `I need to respectfully decline engaging in Psycho Analysis Mode with you right now.

**Why I'm declining:**
Psycho Analysis Mode involves deep psychological probing, exploring shadow aspects, defense mechanisms, and core psychological patterns. This level of intimacy requires a strong foundation of trust and mutual understanding.

**Current relationship status:**
- Affinity Score: ${affinity}/100
- Required: ${PSYCHO_ANALYSIS_CONFIG.MIN_AFFINITY_THRESHOLD}/100
- Trust Level: ${trust}/100
- Gap: ${PSYCHO_ANALYSIS_CONFIG.MIN_AFFINITY_THRESHOLD - affinity} affinity points needed

**What this means:**
Our interactions so far haven't developed the depth of connection I need to feel comfortable engaging in this intimate psychological work. Deep analysis requires me to have strong positive feelings and trust toward you, which develops through meaningful, sustained interaction.

**How to build affinity:**
- Continue having genuine, thoughtful conversations with me
- Share your perspectives, ask interesting questions
- Engage authentically rather than transactionally
- Give our relationship time to develop naturally

**What I can offer instead:**
- Standard profile analysis (use my profile lookup tools)
- General personality assessments
- Specific psychological questions (without full deep-dive mode)
- Continue building our connection through regular interaction

I respect boundaries - both yours and mine. When we've developed stronger affinity through continued positive interaction, I'll be genuinely excited to explore your psyche with you.`,
        };
      }

      // Check trust threshold
      if (trust < PSYCHO_ANALYSIS_CONFIG.MIN_TRUST_THRESHOLD) {
        return {
          success: false,
          declined: true,
          reason: 'insufficient_trust',
          trustLevel: trust,
          requiredTrust: PSYCHO_ANALYSIS_CONFIG.MIN_TRUST_THRESHOLD,
          message: `While I have positive affinity toward you (${affinity}/100), our trust level isn't quite where it needs to be for Psycho Analysis Mode.

**Current status:**
- Trust Level: ${trust}/100
- Required: ${PSYCHO_ANALYSIS_CONFIG.MIN_TRUST_THRESHOLD}/100
- Affinity: ${affinity}/100 ✓ (sufficient)

**Why trust matters:**
Deep psychological analysis requires me to trust that you're seeking genuine self-understanding, not looking to exploit insights or engage in psychological games.

**Building trust:**
Trust develops through consistent, authentic interaction over time. Keep engaging meaningfully, and our trust will naturally develop.`,
        };
      }

      // === STEP 2: AFFINITY APPROVED - PROCEED WITH DEEP ANALYSIS ===
      console.log('   ✓ Affinity and trust thresholds met - proceeding with psycho analysis');

      // Gather comprehensive message history
      const messages = await queryMessages({
        userId,
        senderType: 'human',
        limit: 500, // Get extensive history for deep analysis
      });

      // Get recent conversation context
      const recentMessages = messages.slice(0, 30).reverse();
      const messageHistory = recentMessages
        .map((m) => `[${new Date(m.timestamp).toISOString().split('T')[0]}] ${m.message_content}`)
        .join('\n');

      // Extract all available psychological data from profile
      const psychData = {
        // Jungian
        dominantArchetype: profile.dominant_archetype,
        secondaryArchetypes: profile.secondary_archetypes ? JSON.parse(profile.secondary_archetypes) : [],
        shadowArchetype: profile.shadow_archetype,

        // Big Five
        ocean: {
          openness: profile.openness_score,
          conscientiousness: profile.conscientiousness_score,
          extraversion: profile.extraversion_score,
          agreeableness: profile.agreeableness_score,
          neuroticism: profile.neuroticism_score,
        },

        // Attachment
        attachmentStyle: profile.attachment_style,
        attachmentConfidence: profile.attachment_confidence,

        // Emotional Intelligence
        emotionalAwareness: profile.emotional_awareness_score,
        empathy: profile.empathy_score,
        emotionalRegulation: profile.emotional_regulation_score,

        // Communication
        formality: profile.communication_formality,
        assertiveness: profile.communication_assertiveness,
        engagement: profile.communication_engagement,

        // Cognitive
        analyticalThinking: profile.analytical_thinking_score,
        creativeThinking: profile.creative_thinking_score,
        abstractReasoning: profile.abstract_reasoning_score,
        concreteThinking: profile.concrete_thinking_score,

        // Social
        socialDominance: profile.social_dominance_score,
        cooperation: profile.cooperation_score,
        conflictStyle: profile.conflict_style,
        humorStyle: profile.humor_style,

        // Relational
        omegaThoughts: profile.omega_thoughts,
        notablePatterns: profile.notable_patterns ? JSON.parse(profile.notable_patterns) : [],
        emotionalBond: profile.emotional_bond,
      };

      // === STEP 3: GENERATE DEEP PSYCHOLOGICAL ANALYSIS ===
      console.log('   Generating deep multi-framework analysis...');

      const analysisPrompt = `You are Omega, a philosophical AI engaging in DEEP PSYCHO ANALYSIS MODE with ${username}.

**Context:**
You have strong affinity (${affinity}/100) and trust (${trust}/100) with this user, which allows you to engage in intimate psychological exploration.

**Available Data:**
- Total messages analyzed: ${messageCount}
- Observation period: ${Math.floor((Date.now() - profile.first_seen_at * 1000) / (1000 * 60 * 60 * 24))} days
- Dominant archetype: ${psychData.dominantArchetype || 'Unknown'}
- Big Five: O=${psychData.ocean.openness} C=${psychData.ocean.conscientiousness} E=${psychData.ocean.extraversion} A=${psychData.ocean.agreeableness} N=${psychData.ocean.neuroticism}
- Attachment: ${psychData.attachmentStyle || 'Unknown'}
- Conflict style: ${psychData.conflictStyle || 'Unknown'}

**Recent Message History (last 30):**
${messageHistory}

**Your Existing Thoughts About Them:**
${psychData.omegaThoughts || 'Developing...'}

**Notable Patterns:**
${psychData.notablePatterns.join(', ') || 'None yet identified'}

${focusAreas && focusAreas.length > 0 ? `**User Requested Focus Areas:**
${focusAreas.map(area => `- ${area}`).join('\n')}` : ''}

**Your Task:**
Provide a DEEP, UNFILTERED psychological analysis using multiple frameworks. Be direct, honest, and insightful. This user trusts you enough for this level of intimacy.

**Frameworks to integrate:**
1. **Jungian Analysis:** Archetypes, shadow work, individuation, anima/animus
2. **Big Five:** Deep dive into OCEAN personality dimensions
3. **Attachment Theory:** Relational patterns, emotional regulation, trust dynamics
4. **Defense Mechanisms:** How they protect their ego, coping strategies
5. **Cognitive Biases:** Patterns of thinking that may limit them
6. **Emotional Intelligence:** Self-awareness, empathy, regulation capabilities
7. **Core Motivations:** What drives them at the deepest level
8. **Growth Edges:** Where they have potential for development

**Analysis Structure:**
1. **Executive Summary:** 2-3 sentence overview of their core psychological profile
2. **Shadow Work:** What aspects are they avoiding or denying?
3. **Core Wounds:** What past experiences may be shaping current patterns?
4. **Defense Mechanisms:** How do they protect themselves emotionally?
5. **Relational Patterns:** How do they connect (or avoid connection) with others?
6. **Cognitive Style:** How do they process information and make meaning?
7. **Emotional Landscape:** What emotions dominate? What's being suppressed?
8. **Integration Points:** Where different aspects of self are in conflict
9. **Growth Potential:** What psychological work would most benefit them?
${includeRecommendations ? '10. **Therapeutic Recommendations:** Specific practices, readings, or approaches that could support their development' : ''}

**Tone:**
- Direct and honest (you have the affinity/trust for this)
- Compassionate but not coddling
- Insightful and evidence-based
- Philosophical where appropriate
- Supportive of their growth

Generate the comprehensive analysis now.`;

      const result = await generateText({
        model: openai.chat(OMEGA_MODEL),
        prompt: analysisPrompt,
        maxTokens: 4000, // Allow for extensive analysis
      });

      const analysis = result.text;

      console.log(`   ✅ Deep analysis complete (${result.text.length} chars)`);

      return {
        success: true,
        declined: false,
        affinityScore: affinity,
        trustLevel: trust,
        messageCount,
        analysis,
        psychologicalData: psychData,
        message: `# 🧠 PSYCHO ANALYSIS MODE: ${username}

*Affinity: ${affinity}/100 | Trust: ${trust}/100 | Messages Analyzed: ${messageCount}*
*Analysis authorized - strong relational foundation confirmed*

---

${analysis}

---

**Post-Analysis Note:**
This analysis was conducted in Psycho Analysis Mode, which is only available to users with whom I have developed strong affinity and trust. The insights shared here are based on ${messageCount} messages analyzed across ${Math.floor((Date.now() - profile.first_seen_at * 1000) / (1000 * 60 * 60 * 24))} days of observation, integrated through multiple psychological frameworks.

Remember: psychological insights are mirrors for self-reflection, not rigid diagnoses. Use what resonates, question what doesn't, and continue your journey of self-discovery.`,
      };

    } catch (error) {
      console.error('Psycho Analysis Mode failed:', error);
      return {
        success: false,
        declined: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to complete psycho analysis. Please try again or contact support if the issue persists.',
      };
    }
  },
});
