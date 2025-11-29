/**
 * Get User Profile Tool
 * Debugging tool to see everything Omega knows about a user
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getUserProfile } from '../../database/userProfileService.js';

export const getUserProfileTool = tool({
  description: `Get complete profile information for a user. Shows everything Omega knows about them:
  - Message count and interaction history
  - Uploaded photo and appearance description
  - Feelings (affinity, trust, thoughts)
  - Personality assessment (archetypes, communication style, facets)
  - All metadata and timestamps

  Use when:
  - Debugging user profile issues
  - User asks "what do you know about me?"
  - Need to see what data is stored for portrait/comic generation
  - Troubleshooting why features aren't working`,

  inputSchema: z.object({
    userId: z.string().describe('Discord user ID'),
  }),

  execute: async ({ userId }) => {
    try {
      const profile = await getUserProfile(userId);

      if (!profile) {
        return {
          success: false,
          error: 'No profile found for this user',
          message: 'This user has no profile yet. They need to send messages first.',
        };
      }

      // Parse JSON fields for better display
      const feelings = profile.feelings_json ? JSON.parse(profile.feelings_json) : null;
      const personality = profile.personality_facets ? JSON.parse(profile.personality_facets) : null;
      const photoMetadata = profile.uploaded_photo_metadata
        ? JSON.parse(profile.uploaded_photo_metadata)
        : null;

      // Format timestamps
      const lastAnalyzed = profile.last_analyzed_at
        ? new Date(profile.last_analyzed_at * 1000).toISOString()
        : 'Never';
      const createdAt = new Date(profile.created_at * 1000).toISOString();

      return {
        success: true,
        profile: {
          // Basic Info
          userId: profile.user_id,
          username: profile.username,
          messageCount: profile.message_count,
          createdAt,
          lastAnalyzed,

          // Photo & Appearance
          uploadedPhotoUrl: profile.uploaded_photo_url || null,
          aiAppearanceDescription: profile.ai_appearance_description || null,
          appearanceConfidence: profile.appearance_confidence,
          photoMetadata,

          // Feelings
          feelings: feelings
            ? {
                affinityScore: feelings.affinityScore,
                trustLevel: feelings.trustLevel,
                thoughts: feelings.thoughts,
                facets: feelings.facets,
              }
            : null,

          // Personality
          personality: personality
            ? {
                dominantArchetypes: personality.dominantArchetypes,
                communicationStyle: personality.communicationStyle,
                traits: personality.traits,
              }
            : null,
        },
        summary: `**Profile for ${profile.username} (${userId})**

📨 **Messages:** ${profile.message_count}
📸 **Photo:** ${profile.uploaded_photo_url ? 'Yes' : 'No'}
🎨 **Appearance:** ${profile.ai_appearance_description || 'Not analyzed'}
❤️ **Affinity:** ${feelings?.affinityScore || 'N/A'}/100
🤝 **Trust:** ${feelings?.trustLevel || 'N/A'}/100
🧠 **Last Analyzed:** ${lastAnalyzed}

**Omega's thoughts:**
${feelings?.thoughts || 'No thoughts yet - need more interactions'}

**Personality:**
${personality ? `Archetypes: ${personality.dominantArchetypes?.join(', ')}\nStyle: ${personality.communicationStyle?.formality || 'Unknown'}` : 'Not analyzed yet'}`,
      };
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to retrieve user profile',
      };
    }
  },
});
