import { NextRequest, NextResponse } from 'next/server';
import { SchemaRegistryService } from '@repo/database';

export const dynamic = 'force-dynamic';

/**
 * GET /api/schema-requests/:id/audit
 * Get audit history for a table by schema request ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // First get the schema request to find the table name
    const schemaRequest = await SchemaRegistryService.getSchemaRequest(id);

    if (!schemaRequest) {
      return NextResponse.json(
        { error: 'Schema request not found' },
        { status: 404 }
      );
    }

    // Get audit history for this table
    const auditHistory = await SchemaRegistryService.getAuditHistory(
      schemaRequest.tableName
    );

    return NextResponse.json({
      tableName: schemaRequest.tableName,
      auditHistory: auditHistory.map((entry) => ({
        id: entry.id,
        tableName: entry.tableName,
        action: entry.action,
        schemaJson: entry.schemaJson,
        sqlExecuted: entry.sqlExecuted,
        status: entry.status,
        errorMessage: entry.errorMessage,
        performedBy: entry.performedBy,
        requestMetadata: entry.requestMetadata,
        executedAt: entry.executedAt.toString(),
        createdAt: entry.createdAt.toString(),
      })),
    });
  } catch (error) {
    console.error('Error getting audit history:', error);
    return NextResponse.json(
      {
        error: 'Failed to get audit history',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
