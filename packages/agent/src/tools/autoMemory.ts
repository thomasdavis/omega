/**
 * Auto Memory Tool
 * Saves important memories (solutions, milestones, patterns, insights) to MongoDB
 * with rich metadata for future contextual recall.
 *
 * Omega should invoke this tool automatically when:
 * - A hard or repetitive problem is solved
 * - A milestone is reached
 * - A pattern or insight is recognized
 * - A user shares important information worth remembering
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getMongoDatabase } from '@repo/database';

const MEMORY_COLLECTION = 'omega_memories';

const MEMORY_CATEGORIES = [
  'solution',       // A solution to a hard or recurring problem
  'milestone',      // A significant achievement or event
  'pattern',        // A recognized behavioral or technical pattern
  'insight',        // An important realization or learning
  'user_preference', // A user's stated preference or habit
  'error_resolution', // How an error was debugged and fixed
  'workflow',       // A workflow or process that worked well
  'reference',      // Important reference information (links, configs, etc.)
] as const;

export const autoMemoryTool = tool({
  description: `Save an important memory with rich metadata for future recall. Use this to archive solutions to hard problems, milestones, recognized patterns, user preferences, and key insights. Memories are stored persistently and can be searched later with searchMemories.

Use this when:
- You solve a hard or repetitive problem (category: "solution" or "error_resolution")
- A milestone is reached in a project or conversation (category: "milestone")
- You recognize a pattern in user behavior or technical issues (category: "pattern")
- You gain an important insight worth remembering (category: "insight")
- A user shares a preference or important information (category: "user_preference")
- A workflow or process proves effective (category: "workflow")
- Important reference material is shared (category: "reference")`,

  inputSchema: z.object({
    title: z.string().min(1).max(200).describe('Short, descriptive title for the memory'),
    content: z.string().min(1).max(5000).describe('Detailed description of what happened, what was learned, or what should be remembered'),
    category: z.enum(MEMORY_CATEGORIES).describe('Category of the memory for organized retrieval'),
    tags: z.array(z.string().max(50)).min(1).max(10).describe('Relevant tags for search and filtering (e.g., ["typescript", "debugging", "discord"])'),
    importance: z.enum(['low', 'medium', 'high', 'critical']).default('medium').describe('How important this memory is for future recall'),
    context: z.object({
      userId: z.string().optional().describe('Discord user ID involved, if applicable'),
      username: z.string().optional().describe('Discord username involved, if applicable'),
      channelName: z.string().optional().describe('Channel where this occurred, if applicable'),
      guildId: z.string().optional().describe('Guild/server ID, if applicable'),
      relatedTools: z.array(z.string()).optional().describe('Tools that were used in this context'),
      problemDescription: z.string().optional().describe('The original problem that was solved, if this is a solution memory'),
      solutionSteps: z.array(z.string()).optional().describe('Step-by-step solution, if this is a solution/error_resolution memory'),
    }).optional().describe('Additional context about when and where this memory was created'),
  }),

  execute: async ({ title, content, category, tags, importance, context }) => {
    console.log(`🧠 [AutoMemory] Saving memory: "${title}" [${category}]`);

    try {
      const db = await getMongoDatabase();
      const collection = db.collection(MEMORY_COLLECTION);

      // Ensure indexes exist for efficient searching
      await collection.createIndex({ category: 1 });
      await collection.createIndex({ tags: 1 });
      await collection.createIndex({ importance: 1 });
      await collection.createIndex({ createdAt: -1 });
      await collection.createIndex({ 'context.userId': 1 });
      // Text index for full-text search on title and content
      await collection.createIndex(
        { title: 'text', content: 'text', tags: 'text' },
        { name: 'memory_text_search' }
      ).catch(() => {
        // Text index may already exist - that's fine
      });

      const memoryDocument = {
        title,
        content,
        category,
        tags: tags.map(t => t.toLowerCase()),
        importance,
        context: context || {},
        createdAt: new Date(),
        updatedAt: new Date(),
        accessCount: 0,
        lastAccessedAt: null,
      };

      const result = await collection.insertOne(memoryDocument);

      console.log(`✅ [AutoMemory] Saved memory: "${title}" (ID: ${result.insertedId})`);

      return {
        success: true,
        memoryId: result.insertedId.toString(),
        title,
        category,
        tags,
        importance,
        message: `Memory saved: "${title}" [${category}] with ${tags.length} tags. Use searchMemories to recall this later.`,
      };
    } catch (error) {
      console.error(`❌ [AutoMemory] Failed to save memory:`, error);
      return {
        success: false,
        error: 'SAVE_FAILED',
        message: `Failed to save memory: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
