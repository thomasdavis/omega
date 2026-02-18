import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    // Find the user's profile to get their userId
    const profile = await prisma.userProfile.findFirst({
      where: { username },
      orderBy: { messageCount: 'desc' },
      select: { userId: true },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Fetch analysis history ordered by timestamp desc
    const history = await prisma.userAnalysisHistory.findMany({
      where: { userId: profile.userId },
      orderBy: { analysisTimestamp: 'desc' },
      take: 50,
    });

    // Serialize BigInt fields to numbers
    const serialized = history.map((entry: Record<string, unknown>) => {
      const obj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(entry)) {
        obj[key] = typeof value === 'bigint' ? Number(value) : value;
      }
      return obj;
    });

    return NextResponse.json({ history: serialized });
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis history' },
      { status: 500 }
    );
  }
}
