import { NextResponse } from 'next/server';
import {
  getDocument,
  updateDocumentContent,
  updateDocumentTitle,
  deleteDocument,
} from '@repo/database';

// Helper to convert BigInt fields to numbers for JSON serialization
function serializeDocument(doc: any) {
  const serialized: any = { ...doc };

  // Handle both camelCase (Prisma) and snake_case (mapped) field names
  if (typeof serialized.createdAt === 'bigint') {
    serialized.createdAt = Number(serialized.createdAt);
  }
  if (typeof serialized.updatedAt === 'bigint') {
    serialized.updatedAt = Number(serialized.updatedAt);
  }
  if (typeof serialized.created_at === 'bigint') {
    serialized.created_at = Number(serialized.created_at);
  }
  if (typeof serialized.updated_at === 'bigint') {
    serialized.updated_at = Number(serialized.updated_at);
  }

  return serialized;
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
