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

      const summary = `# 📊 Complete Profile for ${profile.username}

## 👤 Identity
**User ID:** ${userId}
**Username:** ${profile.username}
**First Seen:** ${firstSeen}
**Last Interaction:** ${lastInteraction}
**Last Analysis:** ${lastAnalyzed}

## 📨 Activity
**Total Messages:** ${profile.message_count}
${messagesSample}

## 🎭 Appearance
${photoInfo}

## 💖 Omega's Feelings
${feelingsDetails}

## 🧠 Personality Assessment
${personalityDetails}

---
*This profile was freshly analyzed just now to give you the most up-to-date assessment.*`;

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
