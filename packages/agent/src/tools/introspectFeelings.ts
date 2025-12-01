/**
 * Introspect Feelings Tool
 * Allows the AI to examine and report its internal "feelings" state
 */

import { tool } from 'ai';
import { z } from 'zod';
import { feelingsService } from '../lib/feelings/index.js';

export const introspectFeelingsTool = tool({
  description: 'Examine internal "feelings" - signals from subsystems indicating behavioral needs, concerns, or patterns. Use this for self-awareness and transparency about your internal state.',
  inputSchema: z.object({
    detailed: z.boolean().default(false).describe('Whether to include detailed interpretation and suggested adaptations'),
  }),
  execute: async ({ detailed }) => {
    console.log('🧠 Introspecting feelings...');

    const state = feelingsService.getState();

    if (!detailed) {
      // Simple summary
      const summary = feelingsService.getSummary();
      const userMessage = feelingsService.generateUserMessage();

      return {
        summary,
        userMessage,
        tone: state.tone,
        feelingsCount: state.feelings.length,
      };
    }

    // Detailed analysis with LLM interpretation
    const interpretation = await feelingsService.interpret();
    const metrics = feelingsService.getMetrics();

    return {
      state: {
        tone: state.tone,
        dominantFeeling: state.dominantFeeling ? {
          type: state.dominantFeeling.type,
          intensity: state.dominantFeeling.intensity,
          description: state.dominantFeeling.description,
        } : null,
        allFeelings: state.feelings.map(f => ({
          type: f.type,
          intensity: f.intensity,
          description: f.description,
          source: f.source,
        })),
      },
      interpretation,
      metrics: {
        performance: metrics.performance,
        resources: metrics.resources,
        interaction: metrics.interaction,
      },
      userMessage: feelingsService.generateUserMessage(),
    };
  },
});
