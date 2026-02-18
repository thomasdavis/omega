import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { serializeProfile } from '@/lib/serializeProfile';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile: serializeProfile(profile) });
  } catch (error) {
    const { userId } = await params;
    console.error(`Error fetching profile for user ${userId}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
