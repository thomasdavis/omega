import { NextResponse } from 'next/server';
import { getDocument } from '@repo/database';

// GET /api/documents/:id/plain - Get document as plain text
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = await getDocument(id);

    if (!document) {
      return new NextResponse('Document not found', { status: 404 });
    }

    // Return plain text content with appropriate content type
    return new NextResponse(document.content || '', {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*', // Allow CORS for easy copying
      },
    });
  } catch (error) {
    console.error('Error fetching plain document:', error);
    return new NextResponse('Failed to fetch document', { status: 500 });
  }
}
