import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/booping/pusher-config - Get Pusher configuration for real-time status updates
 */
export async function GET() {
  const config = {
    enabled: Boolean(
      process.env.NEXT_PUBLIC_PUSHER_KEY &&
      process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    ),
    key: process.env.NEXT_PUBLIC_PUSHER_KEY,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
    channel: 'omega-status',
    event: 'status-update',
  };

  return NextResponse.json(config);
}
