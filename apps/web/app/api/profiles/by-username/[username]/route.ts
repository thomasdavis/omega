import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { serializeProfile } from '@/lib/serializeProfile';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    // Find profile with most data (highest message count) to handle potential duplicates
    const profile = await prisma.userProfile.findFirst({
      where: { username },
      orderBy: { messageCount: 'desc' },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile: serializeProfile(profile) });
  } catch (error) {
    const { username } = await params;
    console.error(`Error fetching profile for username ${username}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
