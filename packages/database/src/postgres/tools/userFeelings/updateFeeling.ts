/**
 * Update User Feeling Tool
 * Updates an existing feeling entry
 */

import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '../../prismaClient.js';

export const updateFeelingTool = tool({
  description: `Update an existing feeling entry.

Use this when:
- User wants to modify a logged feeling
- User wants to add notes to a feeling
- User corrects intensity or details
- User adds context to a previous entry

Examples:
- "Update my last feeling to intensity 7"
- "Add notes to feeling ID abc123"
- "Change the feeling type to 'anxious'"`,

  inputSchema: z.object({
    id: z.string().describe('Feeling entry ID to update'),
    feelingType: z.string().optional().describe('Update feeling type'),
    intensity: z.number().int().min(1).max(10).optional().describe('Update intensity (1-10)'),
    valence: z.enum(['positive', 'negative', 'neutral', 'mixed']).optional().describe('Update emotional valence'),
    notes: z.string().optional().describe('Update or add notes'),
    context: z.record(z.any()).optional().describe('Update context JSON'),
    triggers: z.array(z.string()).optional().describe('Update triggers'),
    physicalState: z.string().optional().describe('Update physical state'),
    mentalState: z.string().optional().describe('Update mental state'),
    metadata: z.record(z.any()).optional().describe('Update metadata'),
  }),

  execute: async ({
    id,
    feelingType,
    intensity,
    valence,
    notes,
    context,
    triggers,
    physicalState,
    mentalState,
    metadata,
  }) => {
    console.log(`✏️ [UserFeeling] Updating feeling: ${id}`);

    try {
      // Build update data
      const updateData: any = {};

      if (feelingType !== undefined) updateData.feelingType = feelingType;
      if (intensity !== undefined) updateData.intensity = intensity;
      if (valence !== undefined) updateData.valence = valence;
      if (notes !== undefined) updateData.notes = notes;
      if (context !== undefined) updateData.context = context;
      if (triggers !== undefined) updateData.triggers = triggers;
      if (physicalState !== undefined) updateData.physicalState = physicalState;
      if (mentalState !== undefined) updateData.mentalState = mentalState;
      if (metadata !== undefined) updateData.metadata = metadata;

      const feeling = await prisma.userFeeling.update({
        where: { id },
        data: updateData,
      });

      console.log(`✅ [UserFeeling] Updated feeling: ${feeling.id}`);

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
      console.error(`❌ [UserFeeling] Failed to update feeling:`, error);
      return {
        success: false,
        error: 'UPDATE_FAILED',
        message: `Failed to update feeling: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
