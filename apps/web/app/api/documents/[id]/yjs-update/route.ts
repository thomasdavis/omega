import { NextResponse } from 'next/server';
import { getPusher } from '@/lib/pusher';

// POST /api/documents/:id/yjs-update - Receive Yjs update from client and broadcast to others
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { update, clientId } = body;

    if (!update || !clientId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing update or clientId',
          message: 'Both update and clientId are required',
        },
        { status: 400 }
      );
    }

    // Broadcast to other clients via Pusher
    const pusher = getPusher();
    if (pusher) {
      await pusher.trigger(`document-${id}`, 'yjs-update', {
        update,
        clientId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling Yjs update:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process update',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
