/**
 * API Route: /api/shared-links
 * GET: Retrieve shared links with optional filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPostgresPool } from '@repo/database/postgres/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const userId = searchParams.get('userId') || undefined;
    const channelId = searchParams.get('channelId') || undefined;
    const channelName = searchParams.get('channelName') || undefined;
    const category = searchParams.get('category') || undefined;
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const sortBy = (searchParams.get('sortBy') as 'recent' | 'oldest') || 'recent';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build SQL query
    const pool = await getPostgresPool();
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by archived status
    if (!includeArchived) {
      conditions.push(`is_archived = false`);
    }

    // Filter by tags (OR logic using JSONB containment)
    if (tags.length > 0) {
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

    // Format results
    const links = result.rows.map(row => ({
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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Failed to fetch shared links:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch shared links',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
