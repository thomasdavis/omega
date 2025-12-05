import { NextRequest, NextResponse } from 'next/server';
import { getUserNotifications } from '@repo/database/services/notificationService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications/:userId
 * Get notification history for a user
 * Query params:
 *   - status: filter by status (pending/sent/failed)
 *   - limit: number of notifications to return (default: 50)
 *   - offset: pagination offset (default: 0)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const searchParams = request.nextUrl.searchParams;

    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const notifications = await getUserNotifications(userId, {
      status,
      limit,
      offset,
    });

    // Serialize dates for JSON
    const serialized = notifications.map((notification) => ({
      ...notification,
      createdAt: notification.createdAt.toISOString(),
      sentAt: notification.sentAt?.toISOString() || null,
    }));

    return NextResponse.json({
      notifications: serialized,
      count: serialized.length,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
