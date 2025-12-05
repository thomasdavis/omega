import { NextRequest, NextResponse } from 'next/server';
import {
  SchemaRegistryService,
  SchemaRequestSchema,
  type SchemaRequest,
} from '@repo/database';

export const dynamic = 'force-dynamic';

/**
 * POST /api/schema-requests
 * Create a new schema request
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request body
    const validationResult = SchemaRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid schema request',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const schemaRequest: SchemaRequest = validationResult.data;

    // Create the schema request
    const result = await SchemaRegistryService.createSchemaRequest(schemaRequest);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to create schema request',
          violations: result.violations,
        },
        { status: 400 }
      );
    }

    // Generate migration preview
    const migrationPreview = result.registryId
      ? await SchemaRegistryService.generateMigrationPreview(result.registryId)
      : null;

    return NextResponse.json(
      {
        success: true,
        registryId: result.registryId,
        violations: result.violations,
        migrationPreview: migrationPreview
          ? {
              fileName: migrationPreview.fileName,
              upSql: migrationPreview.upSql,
              downSql: migrationPreview.downSql,
            }
          : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating schema request:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/schema-requests
 * List all schema requests with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await SchemaRegistryService.listSchemaRequests({
      status,
      limit,
      offset,
    });

    return NextResponse.json({
      requests: result.requests.map((r) => ({
        id: r.id,
        tableName: r.tableName,
        owner: r.owner,
        schemaJson: r.schemaJson,
        status: r.status,
        requestMetadata: r.requestMetadata,
        createdAt: r.createdAt.toString(),
        updatedAt: r.updatedAt.toString(),
      })),
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error listing schema requests:', error);
    return NextResponse.json(
      {
        error: 'Failed to list schema requests',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
