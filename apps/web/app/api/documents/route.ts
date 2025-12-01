import { NextResponse } from 'next/server';
import {
  createDocument,
  listDocuments,
  getDocumentCount,
} from '@repo/database';

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

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error listing documents:', error);
    return NextResponse.json(
      {
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

    return NextResponse.json(document, { status: 201 });
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
