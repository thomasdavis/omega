import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';

export const dynamic = 'force-dynamic';

/**
 * POST /api/schema-requests
 * Create a new schema change request
 *
 * Request body:
 * {
 *   requester_user_id: string;
 *   schema_name: string;
 *   request_payload: {
 *     fields: Array<{ name: string; type: string; nullable?: boolean; default?: string }>;
 *     description?: string;
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.requester_user_id || typeof body.requester_user_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid requester_user_id' },
        { status: 400 }
      );
    }

    if (!body.schema_name || typeof body.schema_name !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid schema_name' },
        { status: 400 }
      );
    }

    if (!body.request_payload || typeof body.request_payload !== 'object') {
      return NextResponse.json(
        { error: 'Missing or invalid request_payload' },
        { status: 400 }
      );
    }

    // Validate schema_name format (alphanumeric and underscores only)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(body.schema_name)) {
      return NextResponse.json(
        { error: 'Invalid schema_name format. Use alphanumeric characters and underscores only.' },
        { status: 400 }
      );
    }

    // Validate request_payload has fields array
    if (!Array.isArray(body.request_payload.fields)) {
      return NextResponse.json(
        { error: 'request_payload must contain a fields array' },
        { status: 400 }
      );
    }

    // Validate each field has required properties
    for (const field of body.request_payload.fields) {
      if (!field.name || typeof field.name !== 'string') {
        return NextResponse.json(
          { error: 'Each field must have a valid name' },
          { status: 400 }
        );
      }

      if (!field.type || typeof field.type !== 'string') {
        return NextResponse.json(
          { error: 'Each field must have a valid type' },
          { status: 400 }
        );
      }

      // Validate field name format
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.name)) {
        return NextResponse.json(
          { error: `Invalid field name format: ${field.name}. Use alphanumeric characters and underscores only.` },
          { status: 400 }
        );
      }

      // Validate field type against allowed PostgreSQL types
      const allowedTypes = [
        'text', 'varchar', 'integer', 'bigint', 'boolean',
        'jsonb', 'timestamptz', 'timestamp', 'date', 'uuid',
        'real', 'double precision', 'numeric', 'serial', 'bigserial'
      ];

      const baseType = field.type.toLowerCase().split('(')[0].trim();
      if (!allowedTypes.includes(baseType)) {
        return NextResponse.json(
          { error: `Invalid field type: ${field.type}. Allowed types: ${allowedTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Create the schema request using raw SQL since Prisma schema may not include these tables yet
    const result = await prisma.$executeRaw`
      INSERT INTO schema_requests (requester_user_id, schema_name, request_payload, status, created_at)
      VALUES (${body.requester_user_id}, ${body.schema_name}, ${JSON.stringify(body.request_payload)}::jsonb, 'pending', NOW())
      RETURNING id
    `;

    // Get the created request
    const schemaRequest = await prisma.$queryRaw<Array<{
      id: number;
      requester_user_id: string;
      schema_name: string;
      request_payload: any;
      status: string;
      created_at: Date;
      processed_at: Date | null;
    }>>`
      SELECT * FROM schema_requests WHERE id = (
        SELECT id FROM schema_requests
        WHERE requester_user_id = ${body.requester_user_id}
          AND schema_name = ${body.schema_name}
        ORDER BY created_at DESC
        LIMIT 1
      )
    `;

    return NextResponse.json({
      success: true,
      request: schemaRequest[0],
      message: 'Schema request created successfully. It will be reviewed and processed according to the auto-create policy.',
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating schema request:', error);
    return NextResponse.json(
      { error: 'Failed to create schema request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/schema-requests
 * List schema requests with optional filtering
 *
 * Query params:
 * - status: filter by status (pending, approved, rejected)
 * - requester_user_id: filter by requester
 * - limit: number of results (default: 50)
 * - offset: pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const requesterUserId = searchParams.get('requester_user_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build WHERE clause dynamically
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }

    if (requesterUserId) {
      conditions.push(`requester_user_id = $${params.length + 1}`);
      params.push(requesterUserId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Execute query using raw SQL
    const requests = await prisma.$queryRawUnsafe<Array<{
      id: number;
      requester_user_id: string;
      schema_name: string;
      request_payload: any;
      status: string;
      created_at: Date;
      processed_at: Date | null;
    }>>(
      `SELECT * FROM schema_requests ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      ...params,
      limit,
      offset
    );

    const total = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM schema_requests ${whereClause}`,
      ...params
    );

    return NextResponse.json({
      requests: requests.map(r => ({
        ...r,
        created_at: r.created_at.toISOString(),
        processed_at: r.processed_at?.toISOString() || null,
      })),
      total: Number(total[0].count),
      limit,
      offset,
    });

  } catch (error) {
    console.error('Error fetching schema requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schema requests' },
      { status: 500 }
    );
  }
}
