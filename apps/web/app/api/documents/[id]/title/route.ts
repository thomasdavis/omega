import { NextResponse } from 'next/server';
import { updateDocumentTitle } from '@repo/database';

// PUT /api/documents/:id/title - Update document title
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title } = body;

    if (!title) {
      return NextResponse.json(
        {
          error: 'Missing title',
          message: 'title is required',
        },
        { status: 400 }
      );
    }

    await updateDocumentTitle(id, title);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating document title:', error);
    return NextResponse.json(
      {
        error: 'Failed to update title',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
