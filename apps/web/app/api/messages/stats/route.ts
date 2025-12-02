import { NextResponse } from 'next/server';
import { prisma } from '@repo/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const twentyFourHoursAgo = BigInt(Math.floor(Date.now() / 1000) - 24 * 60 * 60);

    const [total, byType, topUsers, last24Hours] = await Promise.all([
      // Total messages
      prisma.message.count(),

      // Messages by sender type
      prisma.message.groupBy({
        by: ['senderType'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      // Top users by message count
      prisma.message.groupBy({
        by: ['username', 'userId'],
        where: { username: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      // Recent activity (last 24 hours)
      prisma.message.count({
        where: { timestamp: { gt: twentyFourHoursAgo } },
      }),
    ]);

    return NextResponse.json({
      total,
      byType: byType.map((item) => ({
        sender_type: item.senderType,
        count: String(item._count.id),
      })),
      topUsers: topUsers.map((item) => ({
        username: item.username,
        user_id: item.userId,
        count: String(item._count.id),
      })),
      last24Hours,
    });
  } catch (error) {
    console.error('Error fetching message stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch message stats' },
      { status: 500 }
    );
  }
}
