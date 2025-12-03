import { NextResponse } from 'next/server';
import { updateDocumentContent } from '@repo/database';
import { getTextContent } from '@/lib/yjsStore';

// POST /api/documents/:id/yjs-sync - Save document content to database
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get content from the server's shared Yjs document
    // This is the authoritative state
    const content = getTextContent(id);

    if (content !== undefined && content !== null) {
      // Save the authoritative content to database
      await updateDocumentContent(id, content);
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
