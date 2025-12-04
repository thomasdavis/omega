/**
 * Delete Script Tool
 * Deletes a script from the script_storage table
 */

import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '../../prismaClient.js';

export const deleteScriptTool = tool({
  description: `Delete a script from storage.

Use this when:
- User wants to remove a saved script
- User asks to delete a script
- User wants to clean up old scripts
- User needs to remove an unwanted script

Examples:
- "Delete the script with id abc123"
- "Remove my old backup_tool script"
- "Delete the Python script I saved yesterday"
- "Remove the script called 'test_script'"`,

  inputSchema: z.object({
    id: z.string().describe('The unique ID of the script to delete'),
  }),

  execute: async ({ id }) => {
    console.log(`🗑️ [ScriptStorage] Deleting script: ${id}`);

    try {
      const script = await prisma.scriptStorage.delete({
        where: { id },
      });

      console.log(`✅ [ScriptStorage] Deleted script: ${script.scriptName}`);

      return {
        success: true,
        message: `Successfully deleted script: ${script.scriptName}`,
        deletedScript: {
          id: script.id,
          scriptName: script.scriptName,
        },
      };
    } catch (error) {
      console.error(`❌ [ScriptStorage] Failed to delete script:`, error);

      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: 'Script not found',
        };
      }

      return {
        success: false,
        error: 'DELETE_FAILED',
        message: `Failed to delete script: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
