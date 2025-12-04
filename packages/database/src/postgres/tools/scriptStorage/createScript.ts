/**
 * Create Script Tool
 * Creates a new script in the script_storage table
 */

import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '../../prismaClient.js';
import { randomUUID } from 'crypto';

export const createScriptTool = tool({
  description: `Create and store a new script in the database.

Use this when:
- User wants to save a script
- User asks to store code
- User wants to persist a script for later use
- User uploads or shares a script to be saved

Examples:
- "Save this Python script as 'data_processor'"
- "Store this JavaScript code"
- "Create a new script called 'backup_tool'"`,

  inputSchema: z.object({
    userId: z.string().describe('The ID of the user creating the script'),
    username: z.string().optional().describe('The username of the user'),
    scriptName: z.string().min(1).describe('A descriptive name for the script'),
    scriptContent: z.string().min(1).describe('The actual script content/code'),
    language: z.string().optional().describe('Programming language (e.g., javascript, python, bash, etc.)'),
    description: z.string().optional().describe('Optional description of what the script does'),
    tags: z.array(z.string()).optional().describe('Optional tags for categorizing the script'),
    metadata: z.record(z.any()).optional().describe('Optional additional metadata'),
  }),

  execute: async ({ userId, username, scriptName, scriptContent, language, description, tags, metadata }) => {
    console.log(`📜 [ScriptStorage] Creating script: ${scriptName} for user ${userId}`);

    try {
      const script = await prisma.scriptStorage.create({
        data: {
          id: randomUUID(),
          userId,
          username: username ?? null,
          scriptName,
          scriptContent,
          language: language ?? 'javascript',
          description: description ?? null,
          tags: tags ? JSON.parse(JSON.stringify(tags)) : null,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        },
      });

      console.log(`✅ [ScriptStorage] Created script with id: ${script.id}`);

      return {
        success: true,
        script: {
          id: script.id,
          userId: script.userId,
          username: script.username,
          scriptName: script.scriptName,
          language: script.language,
          description: script.description,
          tags: script.tags,
          metadata: script.metadata,
          createdAt: Number(script.createdAt),
          updatedAt: Number(script.updatedAt),
        },
      };
    } catch (error) {
      console.error(`❌ [ScriptStorage] Failed to create script:`, error);
      return {
        success: false,
        error: 'CREATE_FAILED',
        message: `Failed to create script: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
