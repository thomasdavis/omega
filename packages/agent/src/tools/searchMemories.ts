/**
 * Search Memories Tool
 * Searches saved memories with flexible criteria for contextual recall.
 *
 * Omega should invoke this tool automatically when:
 * - A user asks about something that may have been discussed before
 * - A similar problem to a previously solved one is encountered
 * - Context from past interactions would improve the response
 * - A user references past events or conversations
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getMongoDatabase } from '@repo/database';

const MEMORY_COLLECTION = 'omega_memories';

const MEMORY_CATEGORIES = [
  'solution',
  'milestone',
  'pattern',
  'insight',
  'user_preference',
  'error_resolution',
  'workflow',
  'reference',
] as const;

export const searchMemoriesTool = tool({
  description: `Search saved memories for contextual recall. Use this to find previously saved solutions, patterns, user preferences, milestones, and insights. Supports full-text search, category filtering, tag matching, importance filtering, and date ranges.

Use this when:
- You encounter a problem similar to one previously solved
- A user asks about past events or discussions
- You need context from previous interactions to improve your response
- You want to check if a pattern or solution was already recorded
- A user references something from the past ("remember when...", "last time we...")
- Before tackling a complex problem, to check for existing solutions`,

  inputSchema: z.object({
    query: z.string().optional().describe('Full-text search query across titles, content, and tags'),
    category: z.enum(MEMORY_CATEGORIES).optional().describe('Filter by memory category'),
    tags: z.array(z.string()).optional().describe('Filter by one or more tags (memories matching ANY tag are returned)'),
    importance: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Filter by minimum importance level'),
    userId: z.string().optional().describe('Filter by the user ID associated with the memory'),
    startDate: z.string().optional().describe('Filter memories created after this ISO date string (e.g., "2025-01-01")'),
    endDate: z.string().optional().describe('Filter memories created before this ISO date string'),
    limit: z.number().int().min(1).max(50).default(10).describe('Maximum number of memories to return (default 10)'),
    sortBy: z.enum(['relevance', 'newest', 'oldest', 'importance', 'most_accessed']).default('relevance').describe('How to sort results'),
  }),

  execute: async ({ query, category, tags, importance, userId, startDate, endDate, limit, sortBy }) => {
    console.log(`🔍 [SearchMemories] Searching: query="${query || '*'}" category=${category || 'all'} tags=${tags?.join(',') || 'any'}`);

    try {
      const db = await getMongoDatabase();
      const collection = db.collection(MEMORY_COLLECTION);

      // Build the filter
      const filter: Record<string, any> = {};

      // Full-text search
      if (query) {
        filter.$text = { $search: query };
      }

      // Category filter
      if (category) {
        filter.category = category;
      }

      // Tag filter (match any of the provided tags)
      if (tags && tags.length > 0) {
        filter.tags = { $in: tags.map(t => t.toLowerCase()) };
      }

      // Importance filter (minimum level)
      if (importance) {
        const importanceLevels = ['low', 'medium', 'high', 'critical'];
        const minIndex = importanceLevels.indexOf(importance);
        filter.importance = { $in: importanceLevels.slice(minIndex) };
      }

      // User filter
      if (userId) {
        filter['context.userId'] = userId;
      }

      // Date range filter
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) {
          filter.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          filter.createdAt.$lte = new Date(endDate);
        }
      }

      // Build sort
      let sort: Record<string, any> = {};
      switch (sortBy) {
        case 'relevance':
          if (query) {
            sort = { score: { $meta: 'textScore' }, createdAt: -1 };
          } else {
            sort = { createdAt: -1 };
          }
          break;
        case 'newest':
          sort = { createdAt: -1 };
          break;
        case 'oldest':
          sort = { createdAt: 1 };
          break;
        case 'importance': {
          // Sort by importance level (critical > high > medium > low)
          sort = { createdAt: -1 };
          break;
        }
        case 'most_accessed':
          sort = { accessCount: -1, createdAt: -1 };
          break;
      }

      // Build the query
      let cursor = collection.find(filter);

      // Add text score projection for relevance sorting (include all fields plus score)
      if (query && sortBy === 'relevance') {
        cursor = cursor.project({
          title: 1, content: 1, category: 1, tags: 1, importance: 1,
          context: 1, createdAt: 1, updatedAt: 1, accessCount: 1, lastAccessedAt: 1,
          score: { $meta: 'textScore' },
        });
      }

      cursor = cursor.sort(sort).limit(limit);

      const memories = await cursor.toArray();

      // Update access counts for retrieved memories
      if (memories.length > 0) {
        const memoryIds = memories
          .map(m => m._id)
          .filter(Boolean);

        if (memoryIds.length > 0) {
          await collection.updateMany(
            { _id: { $in: memoryIds } },
            {
              $inc: { accessCount: 1 },
              $set: { lastAccessedAt: new Date() },
            }
          );
        }
      }

      console.log(`✅ [SearchMemories] Found ${memories.length} memories`);

      // Format results
      const formattedMemories = memories.map(m => ({
        id: m._id?.toString(),
        title: m.title,
        content: m.content,
        category: m.category,
        tags: m.tags,
        importance: m.importance,
        context: m.context,
        createdAt: m.createdAt,
        accessCount: (m.accessCount || 0) + 1,
        relevanceScore: m.score || undefined,
      }));

      // Sort by importance if that was requested (MongoDB doesn't sort by enum well)
      if (sortBy === 'importance') {
        const importanceOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        formattedMemories.sort((a, b) => {
          const aOrder = importanceOrder[a.importance as string] ?? 4;
          const bOrder = importanceOrder[b.importance as string] ?? 4;
          return aOrder - bOrder;
        });
      }

      return {
        success: true,
        count: formattedMemories.length,
        query: query || null,
        filters: {
          category: category || null,
          tags: tags || null,
          importance: importance || null,
          userId: userId || null,
          dateRange: startDate || endDate ? { startDate, endDate } : null,
        },
        sortBy,
        memories: formattedMemories,
        message: formattedMemories.length > 0
          ? `Found ${formattedMemories.length} relevant memories`
          : 'No memories found matching the criteria. Try broader search terms or fewer filters.',
      };
    } catch (error) {
      console.error(`❌ [SearchMemories] Failed:`, error);

      // Handle case where text index doesn't exist yet
      if (error instanceof Error && error.message.includes('text index')) {
        // Fall back to regex search if text index doesn't exist
        try {
          const db = await getMongoDatabase();
          const col = db.collection(MEMORY_COLLECTION);

          const fallbackFilter: Record<string, any> = {};
          if (query) {
            fallbackFilter.$or = [
              { title: { $regex: query, $options: 'i' } },
              { content: { $regex: query, $options: 'i' } },
            ];
          }
          if (category) fallbackFilter.category = category;
          if (tags && tags.length > 0) fallbackFilter.tags = { $in: tags.map(t => t.toLowerCase()) };

          const memories = await col.find(fallbackFilter).sort({ createdAt: -1 }).limit(limit).toArray();

          return {
            success: true,
            count: memories.length,
            query: query || null,
            sortBy: 'newest',
            note: 'Used regex fallback search (text index not yet created). Save a memory first to initialize indexes.',
            memories: memories.map(m => ({
              id: m._id?.toString(),
              title: m.title,
              content: m.content,
              category: m.category,
              tags: m.tags,
              importance: m.importance,
              context: m.context,
              createdAt: m.createdAt,
              accessCount: m.accessCount || 0,
            })),
          };
        } catch (fallbackError) {
          return {
            success: false,
            error: 'SEARCH_FAILED',
            message: `Search failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
          };
        }
      }

      return {
        success: false,
        error: 'SEARCH_FAILED',
        message: `Failed to search memories: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
