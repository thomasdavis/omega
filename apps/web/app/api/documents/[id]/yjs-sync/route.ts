import { NextResponse } from 'next/server';
import { updateDocumentContent } from '@repo/database';

// POST /api/documents/:id/yjs-sync - Save document content to database
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if content is provided in the request body
    const body = await request.json().catch(() => ({}));

    if (body.content !== undefined) {
      // Save the content to database
      await updateDocumentContent(id, body.content);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error syncing document:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync document',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
