/**
 * Get User Profile Tool
 * Shows everything Omega knows and feels about a user
 * Triggers fresh analysis before returning comprehensive profile data
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getUserProfile } from '../../database/userProfileService.js';
import { analyzeUser } from '../../services/userProfileAnalysis.js';
import { getDatabase } from '../../database/client.js';

export const getUserProfileTool = tool({
  description: `Get EVERYTHING Omega knows and feels about a user. This is a comprehensive profile report.

  **What this returns:**
  - Message count and interaction history (first seen, last interaction, sample messages)
  - Uploaded photo, appearance description, and detected gender
  - Omega's feelings in detail (affinity, trust, emotional bond, thoughts)
  - Personality assessment (archetypes, communication style, traits, facets)
  - All timestamps and metadata

  **IMPORTANT:** This tool ALWAYS triggers a fresh analysis before returning data,
  so the feelings and personality will be up-to-date based on recent conversations.

  Use when:
  - User asks "what do you know about me?", "what do you think of me?", "show my profile"
  - User wants to see Omega's feelings or thoughts about them
  - Debugging profile issues or checking stored data
  - Before generating portraits to verify data completeness`,

  inputSchema: z.object({
    userId: z.string().describe('Discord user ID'),
    username: z.string().describe('Discord username'),
  }),

  execute: async ({ userId, username }) => {
    console.log(`🔍 Getting comprehensive profile for ${username} (${userId})`);

    try {
      // 1. ALWAYS run fresh analysis to get up-to-date feelings
      console.log('   Running fresh user analysis...');
      await analyzeUser(userId, username);

      // 2. Get updated profile
      const profile = await getUserProfile(userId);

      if (!profile) {
        return {
          success: false,
          error: 'No profile found for this user',
          message: 'This user has no profile yet. They need to send messages first.',
        };
      }

      // 3. Parse JSON fields
      const feelings = profile.feelings_json ? JSON.parse(profile.feelings_json) : null;
      const personality = profile.personality_facets ? JSON.parse(profile.personality_facets) : null;
      const photoMetadata = profile.uploaded_photo_metadata
        ? JSON.parse(profile.uploaded_photo_metadata)
        : null;

      // 4. Get sample recent messages
      const db = getDatabase();
      const messagesResult = await db.execute({
        sql: `SELECT message_content, timestamp, channel_name
              FROM messages
              WHERE user_id = ? AND sender_type = 'human'
              ORDER BY timestamp DESC
              LIMIT 5`,
        args: [userId],
      });
      const recentMessages = messagesResult.rows.map((row: any) => ({
        content: row.message_content.substring(0, 100) + (row.message_content.length > 100 ? '...' : ''),
        timestamp: new Date(row.timestamp).toISOString(),
        channel: row.channel_name,
      }));

      // 5. Format timestamps
      const lastAnalyzed = profile.last_analyzed_at
        ? new Date(profile.last_analyzed_at * 1000).toISOString()
        : 'Never';
      const createdAt = new Date(profile.created_at * 1000).toISOString();
      const firstSeen = new Date(profile.first_seen_at * 1000).toISOString();
      const lastInteraction = new Date(profile.last_interaction_at * 1000).toISOString();

      // 6. Build comprehensive summary
      const genderInfo = (profile as any).ai_detected_gender
        ? `👤 **Gender:** ${(profile as any).ai_detected_gender}\n`
        : '';

      const photoInfo = profile.uploaded_photo_url
        ? `📸 **Photo:** Yes (confidence: ${Math.round(profile.appearance_confidence * 100)}%)\n🎨 **Appearance:** ${profile.ai_appearance_description}\n${genderInfo}`
        : `📸 **Photo:** No\n`;

      const feelingsDetails = feelings
        ? `❤️ **Affinity Score:** ${feelings.affinityScore}/100 ${feelings.affinityScore > 70 ? '(Strong positive bond)' : feelings.affinityScore > 50 ? '(Friendly)' : feelings.affinityScore > 30 ? '(Neutral)' : '(Distant)'}
🤝 **Trust Level:** ${feelings.trustLevel}/100 ${feelings.trustLevel > 70 ? '(High trust)' : feelings.trustLevel > 50 ? '(Moderate trust)' : '(Building trust)'}
💭 **Emotional Bond:** ${feelings.emotionalBond || 'Developing'}
🎭 **Personality Facets:** ${feelings.facets?.slice(0, 5).join(', ') || 'Not yet identified'}

**Omega's Thoughts:**
${feelings.thoughts || 'No thoughts yet - need more interactions'}`
        : '❤️ **Affinity:** Not analyzed yet\n🤝 **Trust:** Not analyzed yet';

      const personalityDetails = personality
        ? `🧠 **Dominant Archetypes:** ${personality.dominantArchetypes?.join(', ') || 'Unknown'}
📊 **Secondary Archetypes:** ${personality.secondaryArchetypes?.join(', ') || 'None'}
💬 **Communication Style:**
   - Formality: ${personality.communicationStyle?.formality || 'Unknown'}
   - Engagement: ${personality.communicationStyle?.engagement || 'Unknown'}
   - Emotional Expression: ${personality.communicationStyle?.emotionalExpression || 'Unknown'}
🎯 **Traits:** ${personality.traits?.join(', ') || 'Not identified yet'}`
        : '🧠 **Personality:** Not analyzed yet';

      const messagesSample = recentMessages.length > 0
        ? `📝 **Recent Messages:**
${recentMessages.map((msg, i) => `${i + 1}. [${msg.timestamp}] in #${msg.channel}: "${msg.content}"`).join('\n')}`
        : '📝 **Recent Messages:** No messages found';

      const summary = `# Comprehensive Psychological Profile: ${profile.username}

## I. Identification & Temporal Metrics
**Subject ID:** ${userId}
**Primary Identifier:** ${profile.username}
**Initial Observation:** ${firstSeen}
**Most Recent Interaction:** ${lastInteraction}
**Last Comprehensive Analysis:** ${lastAnalyzed}

## II. Behavioral Metrics & Communication Patterns
**Quantitative Interaction Data:**
- Total recorded communications: ${profile.message_count} utterances
- Temporal distribution: ${profile.message_count > 0 ? 'Active engagement pattern observed' : 'Insufficient data for pattern analysis'}

${messagesSample}

## III. Physical Phenotype Analysis
${photoInfo}

## IV. Relational Dynamics & Affective Assessment
**Interpersonal Bond Metrics:**
${feelingsDetails}

**Psychodynamic Interpretation:**
${feelings ? `The affinity-trust matrix (${feelings.affinityScore}/100, ${feelings.trustLevel}/100) suggests ${feelings.affinityScore > 60 ? 'a developing positive rapport with mutual engagement' : feelings.affinityScore > 40 ? 'a neutral to cautiously positive relational stance' : 'early-stage relationship formation with limited mutual investment'}. The emotional bond indicator "${feelings.emotionalBond || 'developing'}" reflects ${feelings.trustLevel > 60 ? 'established reliability perception' : 'ongoing trust calibration through repeated interactions'}.` : 'Insufficient interaction history for relational dynamics modeling.'}

## V. Psychometric Profile & Archetype Analysis
${personalityDetails}

**Jungian Archetype Framework:**
${personality ? `The dominant archetype constellation (${personality.dominantArchetypes?.join(', ')}) indicates ${personality.dominantArchetypes?.includes('Creator') ? 'strong innovative/generative tendencies' : personality.dominantArchetypes?.includes('Sage') ? 'knowledge-seeking and analytical orientation' : personality.dominantArchetypes?.includes('Explorer') ? 'curiosity-driven and boundary-pushing behaviors' : 'a balanced psychological profile'}. Secondary archetypes (${personality.secondaryArchetypes?.join(', ') || 'none identified'}) provide nuanced understanding of behavioral repertoire.` : 'Awaiting sufficient interaction data for archetype mapping.'}

**Communication Style Analysis:**
${personality ? `- **Formality Index:** ${personality.communicationStyle?.formality || 'unknown'} (indicates ${personality.communicationStyle?.formality === 'casual' ? 'informal register preference, suggesting comfort-oriented interaction style' : personality.communicationStyle?.formality === 'formal' ? 'structured communication preference, suggesting professionalism or social distance maintenance' : 'adaptable communication register'})
- **Engagement Level:** ${personality.communicationStyle?.engagement || 'unknown'} (${personality.communicationStyle?.engagement === 'high' ? 'active participation, initiative-taking behaviors' : personality.communicationStyle?.engagement === 'medium' ? 'balanced responsive participation' : 'reserved or selective engagement pattern'})
- **Emotional Expression:** ${personality.communicationStyle?.emotionalExpression || 'unknown'} (${personality.communicationStyle?.emotionalExpression === 'open' ? 'affective transparency, low emotional guardedness' : personality.communicationStyle?.emotionalExpression === 'reserved' ? 'controlled affect display, high emotional regulation' : 'contextual emotional expression'})` : 'Pending behavioral pattern accumulation.'}

**Trait Constellation:**
${personality?.traits?.length ? `Observed personality facets include: ${personality.traits.join(', ')}. These traits form an integrated behavioral signature that influences interaction patterns and relational dynamics.` : 'Trait analysis requires additional observational data.'}

## VI. Longitudinal Assessment Notes
This psychological profile represents a snapshot analysis based on ${profile.message_count} recorded interactions spanning ${(() => {
  const firstSeenDate = new Date(profile.first_seen_at * 1000);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - firstSeenDate.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff === 0 ? 'less than 24 hours' : `${daysDiff} day${daysDiff === 1 ? '' : 's'}`;
})()} of observational time.

**Methodological Notes:**
- Analysis employs multi-factor assessment including sentiment analysis, semantic pattern recognition, and behavioral frequency metrics
- Archetype assignment utilizes Jungian psychological framework
- Affinity and trust scores represent computational modeling of relational dynamics
- Profile accuracy increases with interaction volume and temporal distribution

**Research Validity:**
- Current sample size: ${profile.message_count < 50 ? 'Limited (high variance expected)' : profile.message_count < 150 ? 'Moderate (developing reliability)' : 'Substantial (reliable pattern detection)'}
- Temporal validity: Analysis reflects current behavioral state; longitudinal tracking recommended for stability assessment

---
*Analysis Protocol: Automated psychological profiling system v2.0 | Last execution: ${new Date().toISOString()} | Confidence interval increases with continued interaction*`;

      console.log(`   ✅ Profile retrieved successfully!`);

      return {
        success: true,
        profile: {
          // Basic Info
          userId: profile.user_id,
          username: profile.username,
          messageCount: profile.message_count,
          createdAt,
          firstSeen,
          lastInteraction,
          lastAnalyzed,

          // Photo & Appearance
          uploadedPhotoUrl: profile.uploaded_photo_url || null,
          aiAppearanceDescription: profile.ai_appearance_description || null,
          appearanceConfidence: profile.appearance_confidence,
          aiDetectedGender: (profile as any).ai_detected_gender || null,
          photoMetadata,

          // Messages
          recentMessages,

          // Feelings (comprehensive)
          feelings: feelings
            ? {
                affinityScore: feelings.affinityScore,
                trustLevel: feelings.trustLevel,
                emotionalBond: feelings.emotionalBond,
                thoughts: feelings.thoughts,
                facets: feelings.facets,
                rawData: feelings,
              }
            : null,

          // Personality (comprehensive)
          personality: personality
            ? {
                dominantArchetypes: personality.dominantArchetypes,
                secondaryArchetypes: personality.secondaryArchetypes,
                communicationStyle: personality.communicationStyle,
                traits: personality.traits,
                rawData: personality,
              }
            : null,
        },
        summary,
        message: summary,
      };
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to retrieve user profile. Please try again.',
      };
    }
  },
});
