import { NextResponse } from 'next/server';
import { getPostgresPool } from '@repo/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pool = await getPostgresPool();

    const [totalResult, byTypeResult, byUserResult, recentResult] = await Promise.all([
      // Total messages
      pool.query('SELECT COUNT(*) as total FROM messages'),

      // Messages by sender type
      pool.query(`
        SELECT sender_type, COUNT(*) as count
        FROM messages
        GROUP BY sender_type
        ORDER BY count DESC
      `),

      // Top users by message count
      pool.query(`
        SELECT username, user_id, COUNT(*) as count
        FROM messages
        WHERE username IS NOT NULL
        GROUP BY username, user_id
        ORDER BY count DESC
        LIMIT 10
      `),

      // Recent activity (last 24 hours)
      pool.query(`
        SELECT COUNT(*) as count
        FROM messages
        WHERE timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours')
      `),
    ]);

    return NextResponse.json({
      total: parseInt(totalResult.rows[0].total, 10),
      byType: byTypeResult.rows,
      topUsers: byUserResult.rows,
      last24Hours: parseInt(recentResult.rows[0].count, 10),
    });
  } catch (error) {
    console.error('Error fetching message stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch message stats' },
      { status: 500 }
    );
  }
}
