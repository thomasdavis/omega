import { NextRequest, NextResponse } from 'next/server';
import { SchemaRegistryService } from '@repo/database';

export const dynamic = 'force-dynamic';

/**
 * GET /api/schema-requests/:id/migration
 * Get migration preview for a schema request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const migrationPreview = await SchemaRegistryService.generateMigrationPreview(id);

    if (!migrationPreview) {
      return NextResponse.json(
        { error: 'Schema request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      fileName: migrationPreview.fileName,
      upSql: migrationPreview.upSql,
      downSql: migrationPreview.downSql,
    });
  } catch (error) {
    console.error('Error generating migration preview:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate migration preview',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
