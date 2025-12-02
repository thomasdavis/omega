import { NextResponse } from 'next/server';
import { getPusher } from '@/lib/pusher';

// POST /api/documents/:id/leave - Leave document and broadcast presence
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
          success: false,
          error: 'Missing userId',
          message: 'userId is required',
        },
        { status: 400 }
      );
    }

    // Broadcast presence via Pusher
    const pusher = getPusher();
    if (pusher) {
      await pusher.trigger(`document-${id}`, 'presence', {
        action: 'leave',
        userId,
        username: username || 'Anonymous',
        timestamp: Date.now(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error leaving document:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to leave document',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
