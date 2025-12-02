/**
 * Generate User Avatar Tool
 *
 * Creates a personalized avatar image for a user based on their message history.
 * Uses AI to analyze message content and generate a detailed prompt for avatar generation.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { getDatabase } from '@repo/database';// OLD:client.js';
import { generateImageWithGemini } from '../../services/geminiImageService.js';
import { OMEGA_MODEL } from '../../config/models.js';

export const generateUserAvatarTool = tool({
  description: `Generate a personalized avatar image for a user based on their Discord message history.

  This tool:
  1. Retrieves the user's messages from the SQLite database
  2. Analyzes the messages to understand their personality, interests, and style
  3. Generates a detailed prompt describing their likely appearance
  4. Uses Gemini AI to create a high-quality portrait avatar

  The avatar will be visually appealing and capture the essence of the user based on their language patterns and content.`,

  inputSchema: z.object({
    userId: z.string().describe('Discord user ID to generate avatar for'),
    username: z.string().describe('Discord username (for display purposes)'),
    messageLimit: z.number().optional().default(100).describe('Number of recent messages to analyze (default: 100, max: 500)'),
  }),

  execute: async ({ userId, username, messageLimit = 100 }) => {
    const startTime = Date.now();

    try {
      console.log(`🎨 Generate User Avatar for ${username} (${userId})`);
      console.log(`   📊 Analyzing ${messageLimit} recent messages...`);

      // Validate message limit
      const limit = Math.min(messageLimit, 500);

      // Query user's messages from database
      const db = await getDatabase();
      const messagesQuery = `
        SELECT message_content, timestamp, channel_name
        FROM messages
        WHERE user_id = $1
          AND sender_type = 'human'
          AND message_content IS NOT NULL
          AND message_content != ''
        ORDER BY timestamp DESC
        LIMIT $2
      `;

      const result = await db.query(messagesQuery, [userId, limit]);

      const messages = result.rows as unknown as Array<{
        message_content: string;
        timestamp: number;
        channel_name: string;
      }>;

      console.log(`   ✅ Found ${messages.length} messages`);

      if (messages.length === 0) {
        return {
          success: false,
          error: `No messages found for user ${username}. They need to have sent some messages first.`,
        };
      }

      // Prepare message content for analysis
      const messageContents = messages.map(m => m.message_content).join('\n');

      // Use AI to analyze messages and generate avatar description
      const analysisPrompt = `You are an expert at analyzing writing patterns and language to infer personality traits and characteristics.

Analyze the following messages from a Discord user named "${username}" and create a detailed, creative description of what they might look like as a person.

Messages:
${messageContents}

Based on their:
- Language style and tone
- Topics they discuss
- Personality that comes through in their writing
- Energy and vibe they convey

Create a detailed physical description for a portrait. Include:
- Age range and general appearance
- Facial features and expression
- Hair style and color
- Clothing style that matches their personality
- Overall vibe and energy
- Any distinctive characteristics

IMPORTANT: Be creative and imaginative, but keep it tasteful and positive. Focus on creating an appealing, high-quality portrait that captures their essence.

Respond with ONLY the physical description, no other text. Make it 2-3 sentences, vivid and detailed.`;

      console.log(`   🤖 Analyzing messages with AI...`);

      const analysisResult = await generateText({
        model: openai(OMEGA_MODEL),
        prompt: analysisPrompt,
      });

      const characterDescription = analysisResult.text.trim();
      console.log(`   📝 Character description: ${characterDescription}`);

      // Generate the final avatar prompt
      const avatarPrompt = `High-quality digital portrait of a person: ${characterDescription}

Style: Professional digital art, high detail, vibrant colors, photorealistic
Composition: Head and shoulders portrait, centered
Lighting: Soft, flattering lighting
Quality: 8K, highly detailed, professional photography
Mood: Confident, approachable, engaging

Create a beautiful, high-quality portrait that captures this person's essence.`;

      console.log(`   🎨 Generating avatar with Gemini...`);

      // Generate the avatar using Gemini
      const imageResult = await generateImageWithGemini({
        prompt: avatarPrompt,
      });

      if (!imageResult.success) {
        return {
          success: false,
          error: `Failed to generate avatar image: ${imageResult.error}`,
        };
      }

      const executionTime = Date.now() - startTime;
      console.log(`   ✅ Avatar generated successfully in ${executionTime}ms`);

      // Convert buffer to base64 for Discord display
      const base64Image = imageResult.imageBuffer?.toString('base64');

      return {
        success: true,
        username,
        userId,
        messagesAnalyzed: messages.length,
        characterDescription,
        avatarPrompt,
        imageBuffer: imageResult.imageBuffer,
        imageBase64: base64Image ? `data:image/png;base64,${base64Image}` : undefined,
        imagePath: imageResult.imagePath,
        executionTimeMs: executionTime,
        message: `✨ Generated a personalized avatar for ${username} based on ${messages.length} messages!`,
      };

    } catch (error) {
      console.error('❌ Error generating user avatar:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        username,
        userId,
      };
    }
  },
});
