import { NextRequest, NextResponse } from 'next/server';
import { getPostgresPool } from '@repo/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const senderType = searchParams.get('sender_type');
    const userId = searchParams.get('user_id');
    const channelId = searchParams.get('channel_id');
    const search = searchParams.get('search');

    const pool = await getPostgresPool();

    // Build dynamic query
    let query = 'SELECT * FROM messages WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (senderType) {
      query += ` AND sender_type = $${paramIndex++}`;
      params.push(senderType);
    }

    if (userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(userId);
    }

    if (channelId) {
      query += ` AND channel_id = $${paramIndex++}`;
      params.push(channelId);
    }

    if (search) {
      query += ` AND (message_content ILIKE $${paramIndex++} OR username ILIKE $${paramIndex++})`;
      params.push(`%${search}%`, `%${search}%`);
      paramIndex++; // Account for second parameter
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM messages WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (senderType) {
      countQuery += ` AND sender_type = $${countParamIndex++}`;
      countParams.push(senderType);
    }

    if (userId) {
      countQuery += ` AND user_id = $${countParamIndex++}`;
      countParams.push(userId);
    }

    if (channelId) {
      countQuery += ` AND channel_id = $${countParamIndex++}`;
      countParams.push(channelId);
    }

    if (search) {
      countQuery += ` AND (message_content ILIKE $${countParamIndex++} OR username ILIKE $${countParamIndex++})`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const [messagesResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    return NextResponse.json({
      messages: messagesResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
