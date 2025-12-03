import { NextResponse } from 'next/server';
import { getDocument, updateDocumentContent } from '@repo/database';

// PUT /api/documents/:id/content - Update document content
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        {
          error: 'Missing content',
          message: 'content is required',
        },
        { status: 400 }
      );
    }

    // Check if document exists
    const document = await getDocument(id);
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Update content
    await updateDocumentContent(id, content);

    // TODO: Broadcast update via Pusher when real-time collaboration is needed
    // await broadcastDocumentUpdate(id, {
    //   content,
    //   userId: userId || 'anonymous',
    //   username,
    //   timestamp: Date.now(),
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      {
        error: 'Failed to update document',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
