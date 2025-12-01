import { NextResponse } from 'next/server';

// GET /api/documents/pusher-config - Get Pusher configuration
// TODO: Implement when real-time collaboration is needed
export async function GET() {
  // For now, return a placeholder response
  // In the future, this will return Pusher credentials from environment variables
  return NextResponse.json({
    appKey: process.env.PUSHER_APP_KEY || '',
    cluster: process.env.PUSHER_CLUSTER || 'us2',
    enabled: false, // Disabled until Pusher is configured
  });
}
