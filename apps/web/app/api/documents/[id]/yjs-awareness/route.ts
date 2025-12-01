import { NextResponse } from 'next/server';

// POST /api/documents/:id/yjs-awareness - Broadcast awareness (cursor position, selection)
// TODO: Implement Yjs awareness when real-time collaboration is needed
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { awareness, clientId } = body;

    if (!awareness || !clientId) {
      return NextResponse.json(
        {
          error: 'Missing awareness or clientId',
          message: 'Both awareness and clientId are required',
        },
        { status: 400 }
      );
    }

    // TODO: Broadcast awareness to other clients via Pusher when implemented
    // await broadcastAwareness(id, {
    //   awareness,
    //   clientId,
    //   timestamp: Date.now(),
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error broadcasting awareness:', error);
    return NextResponse.json(
      {
        error: 'Failed to broadcast awareness',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
