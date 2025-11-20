/**
 * Recipe Generator Tool
 * Generates detailed cooking recipes with ingredients, instructions, and tips
 */

import { tool } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { OMEGA_MODEL } from '../../config/models.js';

export const recipeGeneratorTool = tool({
  description: 'Generate detailed cooking recipes based on ingredients, cuisine type, dietary restrictions, or specific dishes. Provides ingredients list, step-by-step instructions, cooking time, servings, and helpful tips.',
  inputSchema: z.object({
    query: z.string().describe('What to cook - can be ingredients you have, a specific dish name, or a general description (e.g., "chicken and rice", "vegetarian pasta", "chocolate dessert")'),
    cuisineType: z.enum(['any', 'italian', 'mexican', 'chinese', 'indian', 'japanese', 'french', 'thai', 'mediterranean', 'american']).optional().describe('Preferred cuisine type (default: any)'),
    dietaryRestrictions: z.array(z.enum(['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'low-carb', 'keto', 'paleo'])).optional().describe('Dietary restrictions to follow'),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional().describe('Cooking difficulty level (default: medium)'),
    servings: z.number().optional().describe('Number of servings (default: 4)'),
  }),
  execute: async ({ query, cuisineType = 'any', dietaryRestrictions = [], difficulty = 'medium', servings = 4 }) => {
    try {
      console.log(`🍳 Generating recipe for: ${query}`);

      // Build the prompt for recipe generation
      const dietaryText = dietaryRestrictions.length > 0
        ? `\n- Dietary restrictions: ${dietaryRestrictions.join(', ')}`
        : '';

      const prompt = `Generate a detailed cooking recipe with the following requirements:

Query: ${query}
Cuisine type: ${cuisineType}
Difficulty: ${difficulty}
Servings: ${servings}${dietaryText}

Please provide a complete recipe in the following format:

**Recipe Name**

**Description:** A brief 1-2 sentence description of the dish.

**Prep Time:** X minutes
**Cook Time:** X minutes
**Total Time:** X minutes
**Servings:** ${servings}
**Difficulty:** ${difficulty}

**Ingredients:**
- List all ingredients with precise measurements
- Organize by component if recipe has multiple parts

**Instructions:**
1. Clear step-by-step instructions
2. Include cooking techniques and temperatures
3. Explain timing for each step
4. Be specific about what to look for (color, texture, etc.)

**Chef's Tips:**
- Include 2-3 helpful tips for success
- Suggest variations or substitutions
- Share any make-ahead or storage advice

**Nutritional Info (approximate per serving):**
- Calories, protein, carbs, fat

Make sure the recipe is practical, achievable, and delicious. Focus on clear instructions that a home cook can follow.`;

      const result = await generateText({
        model: openai(OMEGA_MODEL),
        prompt,
      });

      const recipe = result.text;

      console.log(`✅ Recipe generated successfully`);

      return {
        success: true,
        recipe,
        metadata: {
          query,
          cuisineType,
          dietaryRestrictions,
          difficulty,
          servings,
        },
      };
    } catch (error: any) {
      console.error('❌ Error generating recipe:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate recipe',
      };
    }
  },
});
