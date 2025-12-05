import { NextRequest, NextResponse } from 'next/server';
import { SchemaRegistryService } from '@repo/database';

export const dynamic = 'force-dynamic';

/**
 * GET /api/schema-requests/:id
 * Get a specific schema request by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const schemaRequest = await SchemaRegistryService.getSchemaRequest(id);

    if (!schemaRequest) {
      return NextResponse.json(
        { error: 'Schema request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: schemaRequest.id,
      tableName: schemaRequest.tableName,
      owner: schemaRequest.owner,
      schemaJson: schemaRequest.schemaJson,
      status: schemaRequest.status,
      requestMetadata: schemaRequest.requestMetadata,
      createdAt: schemaRequest.createdAt.toString(),
      updatedAt: schemaRequest.updatedAt.toString(),
    });
  } catch (error) {
    console.error('Error getting schema request:', error);
    return NextResponse.json(
      {
        error: 'Failed to get schema request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/schema-requests/:id
 * Update schema request status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    const validStatuses = ['draft', 'requested', 'approved', 'migrated', 'rejected'];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        {
          error: 'Invalid status',
          validStatuses,
        },
        { status: 400 }
      );
    }

    const success = await SchemaRegistryService.updateSchemaRequestStatus(
      id,
      body.status,
      body.performedBy
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update schema request status' },
        { status: 500 }
      );
    }

    const updatedRequest = await SchemaRegistryService.getSchemaRequest(id);

    return NextResponse.json({
      success: true,
      request: updatedRequest
        ? {
            id: updatedRequest.id,
            tableName: updatedRequest.tableName,
            status: updatedRequest.status,
            updatedAt: updatedRequest.updatedAt.toString(),
          }
        : null,
    });
  } catch (error) {
    console.error('Error updating schema request:', error);
    return NextResponse.json(
      {
        error: 'Failed to update schema request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
