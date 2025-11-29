/**
 * Run Batch Analysis Tool
 * Triggers batch analysis of user profiles to update Omega's feelings and personality assessments
 */

import { tool } from 'ai';
import { z } from 'zod';
import { runBatchAnalysis } from '../../services/userProfileAnalysis.js';

export const runBatchAnalysisTool = tool({
  description: `Trigger batch analysis to update Omega's feelings and personality assessments for all users with new messages.

  This analyzes conversation history to:
  - Form honest opinions about each user (trust level, affinity score, thoughts)
  - Identify personality traits and behavioral patterns
  - Track how relationships evolve over time

  Use when:
  - Explicitly asked to "analyze users" or "update feelings"
  - Before generating portraits (to ensure fresh analysis)
  - Periodically to keep profiles current

  Note: Only analyzes users with 10+ messages and skips recently analyzed users.`,

  inputSchema: z.object({
    limit: z
      .number()
      .optional()
      .default(100)
      .describe('Maximum number of users to analyze in this batch'),
  }),

  execute: async ({ limit }) => {
    console.log(`🔄 Running batch analysis for up to ${limit} users...`);

    try {
      const startTime = Date.now();
      await runBatchAnalysis(limit);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      return {
        success: true,
        duration: `${duration}s`,
        message: `Batch analysis complete. Updated feelings and personality assessments for users with new messages.`,
      };
    } catch (error) {
      console.error('Batch analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to complete batch analysis. Check logs for details.',
      };
    }
  },
});
