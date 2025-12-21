/**
 * Browse Shared Links Tool - Query and retrieve saved links by tags, user, channel, or time
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool } from '@repo/database';

export const browseSharedLinksTool = tool({
  description: `Browse and search the shared links collection with flexible filtering.

Use this when:
- User wants to see saved links
- User searches for links by topic/tag
- User wants links from specific channel or user
- User asks "what links have been shared?"
- User wants to browse by category or time period

Supports:
- Tag-based search (finds links with ANY of the specified tags)
- Filter by user, channel, or time range
- Sort by date or relevance
- Pagination for large result sets
- Exclude archived links by default

Examples:
- "Show me links about AI"
- "Find all links shared by user123"
- "What links were posted in #general?"
- "Show recent links about TypeScript and React"
- "Browse all tutorial links from this week"`,

  inputSchema: z.object({
    tags: z.array(z.string()).optional().describe('Filter by topic tags (OR logic - returns links with ANY tag)'),
    userId: z.string().optional().describe('Filter by user who shared the link'),
    channelId: z.string().optional().describe('Filter by channel where link was shared'),
    channelName: z.string().optional().describe('Filter by channel name (partial match)'),
    category: z.enum(['article', 'video', 'documentation', 'tool', 'tutorial', 'research', 'social', 'other']).optional().describe('Filter by content category'),
    includeArchived: z.boolean().default(false).describe('Include archived links (default: false)'),
    sortBy: z.enum(['recent', 'oldest']).default('recent').describe('Sort order'),
    limit: z.number().int().positive().max(100).default(20).describe('Maximum results to return'),
    offset: z.number().int().min(0).default(0).describe('Pagination offset'),
  }),

  execute: async ({
    tags,
    userId,
    channelId,
    channelName,
    category,
    includeArchived,
    sortBy,
    limit,
    offset,
  }) => {
    console.log(`🔍 [Browse Shared Links] Querying with filters:`, {
      tags,
      userId,
      channelId,
      category,
      limit,
    });

    try {
      const pool = await getPostgresPool();
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Filter by archived status
      if (!includeArchived) {
        conditions.push(`is_archived = false`);
      }

      // Filter by tags (OR logic using JSONB containment)
      if (tags && tags.length > 0) {
        // Use JSONB operator ?| for "contains any of these elements"
        conditions.push(`tags ?| $${paramIndex++}`);
        params.push(tags);
      }

      // Filter by user
      if (userId) {
        conditions.push(`user_id = $${paramIndex++}`);
        params.push(userId);
      }

      // Filter by channel ID
      if (channelId) {
        conditions.push(`channel_id = $${paramIndex++}`);
        params.push(channelId);
      }

      // Filter by channel name (partial match)
      if (channelName) {
        conditions.push(`channel_name ILIKE $${paramIndex++}`);
        params.push(`%${channelName}%`);
      }

      // Filter by category (from metadata JSONB)
      if (category) {
        conditions.push(`metadata->>'category' = $${paramIndex++}`);
        params.push(category);
      }

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      // Sort order
      const orderClause = sortBy === 'recent'
        ? 'ORDER BY created_at DESC'
        : 'ORDER BY created_at ASC';

      // Build query
      const sql = `
        SELECT
          id,
          url,
          title,
          description,
          tags,
          user_id,
          username,
          channel_id,
          channel_name,
          message_id,
          metadata,
          created_at,
          updated_at
        FROM shared_links
        ${whereClause}
        ${orderClause}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      params.push(limit, offset);

      const result = await pool.query(sql, params);

      // Also get total count for pagination
      const countSql = `
        SELECT COUNT(*) as total
        FROM shared_links
        ${whereClause}
      `;

      const countResult = await pool.query(countSql, params.slice(0, -2)); // Exclude limit/offset
      const total = parseInt(countResult.rows[0]?.total || '0', 10);

      console.log(`✅ [Browse Shared Links] Found ${result.rowCount} links (total: ${total})`);

      // Format results
      const links = result.rows.map((row: any) => ({
        id: row.id,
        url: row.url,
        title: row.title,
        description: row.description,
        tags: row.tags,
        sharedBy: {
          userId: row.user_id,
          username: row.username,
        },
        channel: {
          id: row.channel_id,
          name: row.channel_name,
        },
        messageId: row.message_id,
        category: row.metadata?.category,
        createdAt: new Date(Number(row.created_at)).toISOString(),
      }));

      return {
        success: true,
        links,
        count: result.rowCount || 0,
        total,
        hasMore: offset + (result.rowCount || 0) < total,
        pagination: {
          limit,
          offset,
          nextOffset: offset + limit,
        },
        filters: {
          tags,
          userId,
          channelId,
          channelName,
          category,
        },
      };
    } catch (error) {
      console.error(`❌ [Browse Shared Links] Failed:`, error);
      return {
        success: false,
        error: 'QUERY_FAILED',
        message: `Failed to query links: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

/**
 * Get all unique tags from saved links (for autocomplete/suggestion)
 */
export const getPopularTagsTool = tool({
  description: `Get a list of all unique tags used in saved links, sorted by frequency.

Use this when:
- User asks "what topics are available?"
- Building tag autocomplete
- User wants to see popular categories
- Generating tag suggestions

Returns tags with usage counts, sorted by popularity.`,

  inputSchema: z.object({
    limit: z.number().int().positive().max(100).default(50).describe('Maximum number of tags to return'),
  }),

  execute: async ({ limit }) => {
    console.log(`🏷️ [Get Popular Tags] Fetching top ${limit} tags`);

    try {
      const pool = await getPostgresPool();

      // JSONB array expansion and aggregation
      const sql = `
        SELECT
          tag,
          COUNT(*) as count
        FROM shared_links,
        jsonb_array_elements_text(tags) as tag
        WHERE is_archived = false
        GROUP BY tag
        ORDER BY count DESC, tag ASC
        LIMIT $1
      `;

      const result = await pool.query(sql, [limit]);

      console.log(`✅ [Get Popular Tags] Found ${result.rowCount} unique tags`);

      const tags = result.rows.map((row: any) => ({
        tag: row.tag,
        count: parseInt(row.count, 10),
      }));

      return {
        success: true,
        tags,
        total: result.rowCount || 0,
      };
    } catch (error) {
      console.error(`❌ [Get Popular Tags] Failed:`, error);
      return {
        success: false,
        error: 'QUERY_FAILED',
        message: `Failed to get tags: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
