/**
 * Get User Feeling Tool
 * Retrieves a specific feeling entry by ID
 */

import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '../../prismaClient.js';

export const getFeelingTool = tool({
  description: `Get a specific feeling entry by ID.

Use this when:
- User wants details about a specific feeling entry
- User references a specific mood log
- Need to retrieve a particular feeling record

Examples:
- "Show me details for feeling ID abc123"
- "Get that feeling entry I logged earlier"`,

  inputSchema: z.object({
    id: z.string().describe('Feeling entry ID'),
  }),

  execute: async ({ id }) => {
    console.log(`🔍 [UserFeeling] Getting feeling: ${id}`);

    try {
      const feeling = await prisma.userFeeling.findUnique({
        where: { id },
      });

      if (!feeling) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: `Feeling entry with id ${id} not found`,
        };
      }

      console.log(`✅ [UserFeeling] Found feeling: ${feeling.feelingType}`);

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
      console.error(`❌ [UserFeeling] Failed to get feeling:`, error);
      return {
        success: false,
        error: 'GET_FAILED',
        message: `Failed to get feeling: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
