/**
 * API Route: /api/shared-links/tags
 * GET: Retrieve popular tags from shared links
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPostgresPool } from '@repo/database/postgres/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

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

    const tags = result.rows.map(row => ({
      tag: row.tag,
      count: parseInt(row.count, 10),
    }));

    return NextResponse.json({
      success: true,
      tags,
      total: result.rowCount || 0,
    });
  } catch (error) {
    console.error('Failed to fetch popular tags:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tags',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
