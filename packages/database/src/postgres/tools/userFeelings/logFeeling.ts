/**
 * Log Feeling Tool
 * Logs a user's feeling/mood entry
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool } from '../../client.js';
import { randomUUID } from 'crypto';

export const logFeelingTool = tool({
  description: `Log a user's feeling or mood entry to track emotional states over time.

Use this when:
- User wants to log how they're feeling
- User wants to record their mood for the day
- User wants to track their emotional state
- User says things like "I'm feeling...", "My mood today is...", "Log my feeling"

Feeling types can include: happy, sad, anxious, excited, calm, stressed, angry, content, energetic, tired, etc.
Intensity is rated from 1 (very mild) to 10 (very intense).

Examples:
- "Log my feeling for today"
- "I'm feeling happy"
- "Record that I'm anxious"
- "Track my mood - I'm stressed"`,

  inputSchema: z.object({
    userId: z.string().describe('Discord user ID'),
    username: z.string().describe('Discord username'),
    feelingType: z.string().min(1).describe('Type of feeling (e.g., happy, sad, anxious, excited)'),
    intensity: z.number().int().min(1).max(10).describe('Intensity of the feeling (1-10 scale)'),
    notes: z.string().optional().describe('Optional notes or context about the feeling'),
    context: z.record(z.any()).optional().describe('Additional structured context (tags, triggers, etc.)'),
    recordedAt: z.number().optional().describe('Unix timestamp in seconds (defaults to now)'),
  }),

  execute: async ({ userId, username, feelingType, intensity, notes, context, recordedAt }) => {
    console.log(`💭 [Feelings] Logging feeling for ${username}: ${feelingType} (${intensity}/10)`);

    try {
      const pool = await getPostgresPool();
      const id = randomUUID();
      const timestamp = recordedAt || Math.floor(Date.now() / 1000);

      const result = await pool.query(
        `INSERT INTO user_feelings (id, user_id, username, feeling_type, intensity, notes, context, recorded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [id, userId, username, feelingType.toLowerCase(), intensity, notes || null, context ? JSON.stringify(context) : null, timestamp]
      );

      const feeling = result.rows[0];
      console.log(`✅ [Feelings] Logged feeling with id: ${feeling.id}`);

      return {
        success: true,
        feeling: {
          id: feeling.id,
          userId: feeling.user_id,
          username: feeling.username,
          feelingType: feeling.feeling_type,
          intensity: feeling.intensity,
          notes: feeling.notes,
          context: feeling.context,
          recordedAt: new Date(feeling.recorded_at * 1000).toISOString(),
          createdAt: new Date(feeling.created_at * 1000).toISOString(),
        },
        message: `Successfully logged your feeling: ${feelingType} (intensity: ${intensity}/10)`,
      };
    } catch (error) {
      console.error(`❌ [Feelings] Failed to log feeling:`, error);
      return {
        success: false,
        error: 'LOG_FAILED',
        message: `Failed to log feeling: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
