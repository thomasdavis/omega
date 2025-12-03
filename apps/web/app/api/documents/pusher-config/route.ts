import { NextResponse } from 'next/server';

// GET /api/documents/pusher-config - Get Pusher configuration
export async function GET() {
  const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2';

  // Pusher is enabled if the key is configured
  const enabled = Boolean(pusherKey);

  return NextResponse.json({
    key: pusherKey || '',
    cluster: pusherCluster,
    enabled,
  });
}
