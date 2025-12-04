/**
 * Update Script Tool
 * Updates an existing script in the script_storage table
 */

import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '../../prismaClient.js';

export const updateScriptTool = tool({
  description: `Update an existing script in storage.

Use this when:
- User wants to modify a saved script
- User asks to update script content
- User wants to change script metadata
- User needs to edit a previously stored script

Examples:
- "Update the script with id abc123"
- "Modify my backup_tool script"
- "Change the description of my Python script"
- "Update the content of the data processor"`,

  inputSchema: z.object({
    id: z.string().describe('The unique ID of the script to update'),
    scriptName: z.string().optional().describe('New name for the script'),
    scriptContent: z.string().optional().describe('New content for the script'),
    language: z.string().optional().describe('New language for the script'),
    description: z.string().optional().describe('New description'),
    tags: z.array(z.string()).optional().describe('New tags (replaces existing)'),
    metadata: z.record(z.any()).optional().describe('New metadata (replaces existing)'),
  }),

  execute: async ({ id, scriptName, scriptContent, language, description, tags, metadata }) => {
    console.log(`✏️ [ScriptStorage] Updating script: ${id}`);

    try {
      // Build update data object with only provided fields
      const updateData: any = {
        updatedAt: Math.floor(Date.now() / 1000),
      };

      if (scriptName !== undefined) updateData.scriptName = scriptName;
      if (scriptContent !== undefined) updateData.scriptContent = scriptContent;
      if (language !== undefined) updateData.language = language;
      if (description !== undefined) updateData.description = description;
      if (tags !== undefined) updateData.tags = JSON.parse(JSON.stringify(tags));
      if (metadata !== undefined) updateData.metadata = JSON.parse(JSON.stringify(metadata));

      const script = await prisma.scriptStorage.update({
        where: { id },
        data: updateData,
      });

      console.log(`✅ [ScriptStorage] Updated script: ${script.scriptName}`);

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
      console.error(`❌ [ScriptStorage] Failed to update script:`, error);

      if (error instanceof Error && error.message.includes('Record to update not found')) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: 'Script not found',
        };
      }

      return {
        success: false,
        error: 'UPDATE_FAILED',
        message: `Failed to update script: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
