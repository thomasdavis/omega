import { NextResponse } from 'next/server';
import {
  createDocument,
  listDocuments,
  getDocumentCount,
} from '@repo/database';

// Helper to convert BigInt fields to numbers for JSON serialization
function serializeDocument(doc: Record<string, unknown>) {
  const serialized: Record<string, unknown> = { ...doc };

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

// GET /api/documents - List all documents with pagination
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const createdBy = searchParams.get('createdBy') || undefined;

    const documents = await listDocuments({ createdBy, limit, offset });
    const totalCount = await getDocumentCount({ createdBy });

    // Convert BigInt fields to numbers for JSON serialization
    const serializedDocuments = documents.map(serializeDocument);

    // Ensure totalCount is a number (in case Prisma returns BigInt)
    const total = typeof totalCount === 'bigint' ? Number(totalCount) : totalCount;

    return NextResponse.json({
      success: true,
      documents: serializedDocuments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listing documents:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list documents',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/documents - Create a new document
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, userId, username } = body;

    if (!title || !userId) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          message: 'title and userId are required',
        },
        { status: 400 }
      );
    }

    const document = await createDocument({
      title,
      content: content || '',
      createdBy: userId,
      createdByUsername: username,
      isPublic: true, // Default to public for now
    });

    // Convert BigInt fields to numbers for JSON serialization
    const serializedDocument = serializeDocument(document);

    return NextResponse.json(serializedDocument, { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      {
        error: 'Failed to create document',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
