import { NextResponse } from 'next/server';
import { getDocument } from '@repo/database';

// GET /api/documents/:id/yjs-state - Get initial Yjs document state
// TODO: Implement Yjs sync when real-time collaboration is needed
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if document exists
    const document = await getDocument(id);
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // TODO: Initialize Yjs document with database content when implemented
    // initializeYjsDocument(id, document.content);
    // const state = getYjsState(id);
    // const stateBase64 = Buffer.from(state).toString('base64');

    // For now, return a simple response with the content
    return NextResponse.json({
      state: '', // Empty state for now
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
