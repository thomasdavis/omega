/**
 * Summarize User Profiles Tool
 * Uses AI to summarize and analyze user profile data based on requested datapoints
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getDatabase } from '@repo/database';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '@repo/shared';
import { generateText } from 'ai';

export const summarizeUserProfilesTool = tool({
  description: `Summarize and analyze user profiles across the database using AI.

  This tool fetches user profile data based on requested fields and uses AI to generate
  summaries, calculate averages, identify patterns, and provide insights.

  Examples:
  - "What is the average emotional intelligence across all users?"
  - "Summarize the personality traits of all users"
  - "What are the dominant archetypes in the community?"
  - "Compare trust levels and affinity scores"
  - "Analyze communication styles across users"

  The tool will automatically:
  1. Fetch the requested fields from all user profiles
  2. Use AI to analyze the data
  3. Generate a comprehensive summary with insights`,

  inputSchema: z.object({
    requestedFields: z.array(z.string()).describe('Array of field names to fetch from user profiles (e.g., ["emotional_awareness_score", "empathy_score", "dominant_archetype"])'),
    question: z.string().describe('The specific question or analysis request from the user'),
  }),

  execute: async ({ requestedFields, question }) => {
    console.log(`📊 Summarizing user profiles for fields: ${requestedFields.join(', ')}`);
    console.log(`❓ Question: ${question}`);

    try {
      // Build the SELECT query dynamically based on requested fields
      const baseFields = ['user_id', 'username', 'message_count'];
      const allFields = [...new Set([...baseFields, ...requestedFields])];

      // Validate field names to prevent SQL injection (basic whitelist approach)
      const validFields = allFields.filter(field => /^[a-z_]+$/.test(field));

      if (validFields.length === 0) {
        return {
          success: false,
          error: 'No valid fields specified. Fields must contain only lowercase letters and underscores.',
        };
      }

      const selectClause = validFields.join(', ');
      const query = `
        SELECT ${selectClause}
        FROM user_profiles
        WHERE message_count > 0
        ORDER BY message_count DESC
      `;

      // Execute query
      const db = await getDatabase();
      const result = await db.query(query);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'No user profiles found in the database.',
          message: 'There are no user profiles with messages yet.',
        };
      }

      // Convert rows to plain objects
      const profiles = result.rows.map((row: any) => {
        const obj: Record<string, any> = {};
        validFields.forEach(field => {
          obj[field] = row[field];
        });
        return obj;
      });

      console.log(`   Found ${profiles.length} user profiles`);

      // Use AI to analyze and summarize the data
      const dataJson = JSON.stringify(profiles, null, 2);

      const prompt = `You are analyzing user profile data from a Discord bot's database.

**User's Question:** ${question}

**Requested Fields:** ${requestedFields.join(', ')}

**Data from ${profiles.length} user profiles:**
${dataJson}

Please provide a comprehensive analysis that:
1. Directly answers the user's question
2. Calculates relevant statistics (averages, medians, distributions, etc.)
3. Identifies patterns and trends
4. Provides insights about the community
5. Notes any interesting outliers or observations
6. Handles null/missing values appropriately

Format your response in a clear, readable way with:
- A direct answer to the question
- Key statistics and numbers
- Bullet points for insights
- Professional but conversational tone

Note: Null values indicate data not yet collected for that user.`;

      const aiResult = await generateText({
        model: openai.chat(OMEGA_MODEL),
        prompt: prompt,
      });

      const summary = aiResult.text;

      console.log(`   ✅ AI analysis complete`);

      return {
        success: true,
        profileCount: profiles.length,
        fieldsAnalyzed: requestedFields,
        summary: summary,
        rawData: profiles.slice(0, 10), // Include first 10 profiles for reference
        message: summary,
      };
    } catch (error) {
      console.error('Failed to summarize user profiles:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to summarize user profiles. Please try again.',
      };
    }
  },
});
