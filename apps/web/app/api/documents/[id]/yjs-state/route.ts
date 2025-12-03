import { NextResponse } from 'next/server';
import { getDocument } from '@repo/database';
import { getYjsDoc, getState } from '@/lib/yjsStore';

// GET /api/documents/:id/yjs-state - Get initial Yjs document state
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if document exists in database
    const document = await getDocument(id);
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get or create shared Yjs document
    // This ensures all clients start with the same Yjs state
    getYjsDoc(id, document.content);

    // Get the current Yjs state
    const state = getState(id);

    return NextResponse.json({
      state: state || '',
      content: document.content,
    });
  } catch (error) {
    console.error('Error getting Yjs state:', error);
    return NextResponse.json(
      {
        error: 'Failed to get document state',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
