/**
 * List Scripts Tool
 * Lists scripts from the script_storage table with optional filtering
 */

import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '../../prismaClient.js';

export const listScriptsTool = tool({
  description: `List stored scripts with optional filtering by user, language, or tags.

Use this when:
- User wants to see their saved scripts
- User asks what scripts are available
- User wants to browse scripts by language
- User wants to find scripts by tags

Examples:
- "Show me my scripts"
- "List all Python scripts"
- "What scripts do I have?"
- "Show scripts tagged with 'automation'"`,

  inputSchema: z.object({
    userId: z.string().optional().describe('Filter by user ID'),
    language: z.string().optional().describe('Filter by programming language'),
    scriptName: z.string().optional().describe('Search by script name (partial match)'),
    limit: z.number().int().positive().max(100).optional().describe('Maximum number of scripts to return (default: 50)'),
    offset: z.number().int().nonnegative().optional().describe('Number of scripts to skip (for pagination)'),
    orderBy: z.enum(['createdAt', 'updatedAt', 'scriptName']).optional().describe('Sort by field (default: createdAt)'),
    orderDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: desc)'),
  }),

  execute: async ({ userId, language, scriptName, limit = 50, offset = 0, orderBy = 'createdAt', orderDirection = 'desc' }) => {
    console.log(`📋 [ScriptStorage] Listing scripts (userId: ${userId ?? 'all'}, language: ${language ?? 'all'})`);

    try {
      const where: any = {};

      if (userId) {
        where.userId = userId;
      }

      if (language) {
        where.language = language;
      }

      if (scriptName) {
        where.scriptName = {
          contains: scriptName,
          mode: 'insensitive',
        };
      }

      const scripts = await prisma.scriptStorage.findMany({
        where,
        orderBy: {
          [orderBy]: orderDirection,
        },
        take: limit,
        skip: offset,
      });

      console.log(`✅ [ScriptStorage] Found ${scripts.length} script(s)`);

      return {
        success: true,
        count: scripts.length,
        scripts: scripts.map(script => ({
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
          // Don't include scriptContent in list view to keep response size manageable
        })),
      };
    } catch (error) {
      console.error(`❌ [ScriptStorage] Failed to list scripts:`, error);
      return {
        success: false,
        error: 'LIST_FAILED',
        message: `Failed to list scripts: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
