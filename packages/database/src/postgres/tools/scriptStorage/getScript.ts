/**
 * Get Script Tool
 * Retrieves a specific script by ID or name
 */

import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '../../prismaClient.js';

export const getScriptTool = tool({
  description: `Retrieve a specific script by ID or name from storage.

Use this when:
- User wants to view a specific script
- User asks to retrieve a script by name
- User wants to see the content of a saved script
- User needs to access a previously stored script

Examples:
- "Show me the script with id abc123"
- "Get the script called 'backup_tool'"
- "Retrieve my data processor script"
- "Load the Python script I saved earlier"`,

  inputSchema: z.object({
    id: z.string().optional().describe('The unique ID of the script'),
    scriptName: z.string().optional().describe('The name of the script to retrieve'),
    userId: z.string().optional().describe('Filter by user ID (required when searching by name)'),
  }),

  execute: async ({ id, scriptName, userId }) => {
    if (!id && !scriptName) {
      return {
        success: false,
        error: 'INVALID_INPUT',
        message: 'Either id or scriptName must be provided',
      };
    }

    if (scriptName && !userId) {
      return {
        success: false,
        error: 'INVALID_INPUT',
        message: 'userId is required when searching by scriptName',
      };
    }

    console.log(`🔍 [ScriptStorage] Retrieving script (id: ${id ?? 'none'}, name: ${scriptName ?? 'none'})`);

    try {
      const where: any = {};

      if (id) {
        where.id = id;
      } else if (scriptName && userId) {
        where.scriptName = scriptName;
        where.userId = userId;
      }

      const script = await prisma.scriptStorage.findFirst({
        where,
      });

      if (!script) {
        console.log(`⚠️ [ScriptStorage] Script not found`);
        return {
          success: false,
          error: 'NOT_FOUND',
          message: 'Script not found',
        };
      }

      console.log(`✅ [ScriptStorage] Retrieved script: ${script.scriptName}`);

      return {
        success: true,
        script: {
          id: script.id,
          userId: script.userId,
          username: script.username,
          scriptName: script.scriptName,
          scriptContent: script.scriptContent,
          language: script.language,
          description: script.description,
          tags: script.tags,
          metadata: script.metadata,
          createdAt: Number(script.createdAt),
          updatedAt: Number(script.updatedAt),
        },
      };
    } catch (error) {
      console.error(`❌ [ScriptStorage] Failed to retrieve script:`, error);
      return {
        success: false,
        error: 'RETRIEVE_FAILED',
        message: `Failed to retrieve script: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
