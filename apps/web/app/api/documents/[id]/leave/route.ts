import { NextResponse } from 'next/server';

// POST /api/documents/:id/leave - Leave document (broadcast presence)
// TODO: Implement when real-time collaboration is needed
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, username } = body;

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Missing userId',
          message: 'userId is required',
        },
        { status: 400 }
      );
    }

    // TODO: Broadcast presence via Pusher when implemented
    // await broadcastPresence(id, {
    //   userId,
    //   username,
    //   action: 'leave',
    //   timestamp: Date.now(),
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error leaving document:', error);
    return NextResponse.json(
      {
        error: 'Failed to leave document',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
