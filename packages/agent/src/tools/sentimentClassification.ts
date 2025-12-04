/**
 * Sentiment Classification Tool
 * Uses Ax LLM SDK to classify text sentiment
 * DSL: review:string -> sentiment:class "positive, negative, neutral"
 */

import { tool } from 'ai';
import { z } from 'zod';
import { ai, ax } from '@ax-llm/ax';
import { OMEGA_MODEL } from '@repo/shared';

export const sentimentClassificationTool = tool({
  description: `Classify the sentiment of text as positive, negative, or neutral using AI.

  This tool analyzes the emotional tone and sentiment expressed in text and categorizes it into one of three classes:
  - positive: Text expressing favorable, optimistic, or happy sentiment
  - negative: Text expressing unfavorable, pessimistic, or unhappy sentiment
  - neutral: Text expressing balanced, factual, or objective sentiment without strong emotions

  Examples:
  - "I love this product! It works amazingly well." -> positive
  - "This is the worst experience I've ever had." -> negative
  - "The package arrived on Tuesday." -> neutral
  - "The food was okay, nothing special." -> neutral`,

  inputSchema: z.object({
    review: z.string().describe('The text to classify for sentiment (e.g., product review, customer feedback, social media post)'),
  }),

  execute: async ({ review }) => {
    try {
      console.log(`🎭 Classifying sentiment for: "${review.substring(0, 50)}..."`);

      // Configure Ax with OpenAI
      const program = new ax.Agent({
        name: 'sentiment-classifier',
        description: 'Analyze the given text and determine its sentiment. Consider the overall emotional tone, word choice, and context to classify the sentiment as positive, negative, or neutral.',
        signature: 'review:string -> sentiment:"positive" | "negative" | "neutral"',
        ai: ai({
          apiKey: process.env.OPENAI_API_KEY,
          model: OMEGA_MODEL,
        }),
      });

      const result = await program.forward({ review });

      console.log(`   Sentiment classified as: ${result.sentiment}`);

      return {
        success: true,
        review,
        sentiment: result.sentiment,
        note: 'Sentiment has been classified using the Ax LLM framework',
      };

    } catch (error) {
      console.error('Error classifying sentiment:', error);

      return {
        success: false,
        review,
        error: error instanceof Error ? error.message : 'Failed to classify sentiment',
      };
    }
  },
});
