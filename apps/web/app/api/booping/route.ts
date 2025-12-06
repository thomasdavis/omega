import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/booping - Get current bot status
 *
 * This endpoint returns the ephemeral status of the Omega bot.
 * Status is maintained in-memory by the bot service and broadcast via Pusher.
 *
 * This endpoint serves as a fallback for clients that can't use Pusher WebSocket.
 */
export async function GET(request: NextRequest) {
  try {
    // Since the bot maintains status in its own memory, we'll return
    // a synthetic status based on recent activity from the database
    // Real-time updates come via Pusher subscription to 'omega-status' channel

    // For now, return a simple status indicating the API is functional
    // The /booping page will primarily use Pusher for real-time updates
    return NextResponse.json({
      phase: 'idle',
      message: 'Connect to Pusher for real-time status',
      timestamp: Date.now(),
      note: 'Subscribe to channel: omega-status, event: status-update'
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
