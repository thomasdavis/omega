/**
 * Create User Feeling Tool
 * Creates a new feeling/mood entry in the user_feelings table
 */

import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '../../prismaClient.js';

export const createFeelingTool = tool({
  description: `Track a user's feeling or mood at a specific moment.

Use this when:
- User wants to log how they're feeling
- User describes their emotional state
- User wants to track their mood
- User mentions feelings, emotions, or mental state

Examples:
- "I'm feeling anxious today"
- "Track that I'm happy right now"
- "Log my mood: excited about the project"
- "I feel stressed, intensity 8"`,

  inputSchema: z.object({
    userId: z.string().describe('User ID'),
    username: z.string().optional().describe('Username'),
    feelingType: z.string().describe('Type of feeling (e.g., happy, sad, anxious, excited, calm, stressed)'),
    intensity: z.number().int().min(1).max(10).optional().describe('Intensity of the feeling (1-10)'),
    valence: z.enum(['positive', 'negative', 'neutral', 'mixed']).optional().describe('Emotional valence'),
    notes: z.string().optional().describe('Additional notes or context about the feeling'),
    context: z.record(z.any()).optional().describe('Contextual information as JSON'),
    triggers: z.array(z.string()).optional().describe('What triggered this feeling'),
    physicalState: z.string().optional().describe('Physical state (e.g., tired, energized, tense)'),
    mentalState: z.string().optional().describe('Mental state (e.g., focused, scattered, clear)'),
    metadata: z.record(z.any()).optional().describe('Additional metadata'),
    timestamp: z.number().optional().describe('Unix timestamp (seconds). Defaults to now'),
  }),

  execute: async ({
    userId,
    username,
    feelingType,
    intensity,
    valence,
    notes,
    context,
    triggers,
    physicalState,
    mentalState,
    metadata,
    timestamp,
  }) => {
    console.log(`💭 [UserFeeling] Creating feeling entry: ${feelingType} for user ${userId}`);

    try {
      const feeling = await prisma.userFeeling.create({
        data: {
          userId,
          username,
          feelingType,
          intensity,
          valence,
          notes,
          context: context || null,
          triggers: triggers || null,
          physicalState,
          mentalState,
          metadata: metadata || null,
          timestamp: BigInt(timestamp || Math.floor(Date.now() / 1000)),
        },
      });

      console.log(`✅ [UserFeeling] Created feeling entry with id: ${feeling.id}`);

      return {
        success: true,
        feeling: {
          id: feeling.id,
          userId: feeling.userId,
          username: feeling.username,
          feelingType: feeling.feelingType,
          intensity: feeling.intensity,
          valence: feeling.valence,
          notes: feeling.notes,
          context: feeling.context,
          triggers: feeling.triggers,
          physicalState: feeling.physicalState,
          mentalState: feeling.mentalState,
          metadata: feeling.metadata,
          timestamp: Number(feeling.timestamp),
          createdAt: Number(feeling.createdAt),
        },
      };
    } catch (error) {
      console.error(`❌ [UserFeeling] Failed to create feeling:`, error);
      return {
        success: false,
        error: 'CREATE_FAILED',
        message: `Failed to create feeling entry: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
