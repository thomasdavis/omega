import { NextResponse } from 'next/server';
import {
  getDocumentCollaborators,
  addCollaborator,
} from '@repo/database';

// GET /api/documents/:id/collaborators - Get document collaborators
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const collaborators = await getDocumentCollaborators(id);
    return NextResponse.json(collaborators);
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch collaborators',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/documents/:id/collaborators - Add a collaborator
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, username, role } = body;

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Missing userId',
          message: 'userId is required',
        },
        { status: 400 }
      );
    }

    await addCollaborator({
      documentId: id,
      userId,
      username,
      role: role || 'editor',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding collaborator:', error);
    return NextResponse.json(
      {
        error: 'Failed to add collaborator',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
