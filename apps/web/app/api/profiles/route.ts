import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const [profiles, total] = await Promise.all([
      prisma.userProfile.findMany({
        orderBy: { lastInteractionAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.userProfile.count(),
    ]);

    return NextResponse.json({
      profiles,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profiles' },
      { status: 500 }
    );
  }
}
