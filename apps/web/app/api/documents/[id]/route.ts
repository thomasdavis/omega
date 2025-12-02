import { NextResponse } from 'next/server';
import {
  getDocument,
  updateDocumentContent,
  updateDocumentTitle,
  deleteDocument,
} from '@repo/database';

// Helper to convert BigInt fields to numbers for JSON serialization
function serializeDocument(doc: any) {
  return {
    ...doc,
    created_at: typeof doc.created_at === 'bigint' ? Number(doc.created_at) : doc.created_at,
    updated_at: typeof doc.updated_at === 'bigint' ? Number(doc.updated_at) : doc.updated_at,
  };
}

// GET /api/documents/:id - Get a document by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = await getDocument(id);

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Convert BigInt fields to numbers for JSON serialization
    const serializedDocument = serializeDocument(document);

    return NextResponse.json(serializedDocument);
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch document',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/:id - Delete a document
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteDocument(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete document',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
