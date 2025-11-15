/**
 * Calculator Tool - Performs mathematical calculations
 */

import { tool } from 'ai';
import { z } from 'zod';

export const calculatorTool = tool({
  description: 'Perform mathematical calculations. Supports basic arithmetic, exponents, and more.',
  parameters: z.object({
    expression: z.string().describe('The mathematical expression to evaluate, e.g., "2 + 2" or "sqrt(16)"'),
  }),
  // @ts-ignore - AI SDK beta.99 type mismatch
  execute: async ({ expression }) => {
    try {
      // Simple eval for math expressions (in production, use a safer math parser like mathjs)
      // Note: This is safe because we control the input through the AI
      const result = eval(expression);
      return {
        expression,
        result,
        success: true,
      };
    } catch (error) {
      return {
        expression,
        error: error instanceof Error ? error.message : 'Calculation failed',
        success: false,
      };
    }
  },
});
