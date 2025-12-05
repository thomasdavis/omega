/**
 * List User Feelings Tool
 * Lists feelings for a user with optional filtering
 */

import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '../../prismaClient.js';

export const listFeelingsTool = tool({
  description: `List a user's feeling history with optional filtering.

Use this when:
- User wants to see their mood history
- User asks about past feelings
- User wants to track emotional trends
- User asks "how have I been feeling"

Examples:
- "Show me my feelings from the past week"
- "What moods have I logged?"
- "Show my anxiety entries"
- "List my feelings from today"`,

  inputSchema: z.object({
    userId: z.string().describe('User ID to get feelings for'),
    feelingType: z.string().optional().describe('Filter by specific feeling type'),
    valence: z.enum(['positive', 'negative', 'neutral', 'mixed']).optional().describe('Filter by emotional valence'),
    startTimestamp: z.number().optional().describe('Start timestamp (unix seconds)'),
    endTimestamp: z.number().optional().describe('End timestamp (unix seconds)'),
    minIntensity: z.number().int().min(1).max(10).optional().describe('Minimum intensity level'),
    maxIntensity: z.number().int().min(1).max(10).optional().describe('Maximum intensity level'),
    limit: z.number().int().positive().max(500).optional().describe('Maximum number of entries to return (default: 100)'),
    orderBy: z.enum(['timestamp', 'createdAt', 'intensity']).optional().describe('Sort by field (default: timestamp)'),
    orderDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: desc)'),
  }),

  execute: async ({
    userId,
    feelingType,
    valence,
    startTimestamp,
    endTimestamp,
    minIntensity,
    maxIntensity,
    limit = 100,
    orderBy = 'timestamp',
    orderDirection = 'desc',
  }) => {
    console.log(`📋 [UserFeeling] Listing feelings for user ${userId}`);

    try {
      // Build where clause
      const where: any = { userId };

      if (feelingType) {
        where.feelingType = feelingType;
      }

      if (valence) {
        where.valence = valence;
      }

      if (startTimestamp || endTimestamp) {
        where.timestamp = {};
        if (startTimestamp) {
          where.timestamp.gte = BigInt(startTimestamp);
        }
        if (endTimestamp) {
          where.timestamp.lte = BigInt(endTimestamp);
        }
      }

      if (minIntensity !== undefined || maxIntensity !== undefined) {
        where.intensity = {};
        if (minIntensity !== undefined) {
          where.intensity.gte = minIntensity;
        }
        if (maxIntensity !== undefined) {
          where.intensity.lte = maxIntensity;
        }
      }

      const feelings = await prisma.userFeeling.findMany({
        where,
        orderBy: {
          [orderBy]: orderDirection,
        },
        take: limit,
      });

      console.log(`✅ [UserFeeling] Found ${feelings.length} feeling(s)`);

      return {
        success: true,
        count: feelings.length,
        feelings: feelings.map(feeling => ({
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
        })),
      };
    } catch (error) {
      console.error(`❌ [UserFeeling] Failed to list feelings:`, error);
      return {
        success: false,
        error: 'LIST_FAILED',
        message: `Failed to list feelings: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
