import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';

export const dynamic = 'force-dynamic';

// Helper to convert BigInt fields to numbers for JSON serialization
function serializeProfile(profile: any) {
  return {
    ...profile,
    firstSeenAt: profile.firstSeenAt ? Number(profile.firstSeenAt) : null,
    lastInteractionAt: profile.lastInteractionAt ? Number(profile.lastInteractionAt) : null,
    lastAnalyzedAt: profile.lastAnalyzedAt ? Number(profile.lastAnalyzedAt) : null,
    lastPhotoAnalyzedAt: profile.lastPhotoAnalyzedAt ? Number(profile.lastPhotoAnalyzedAt) : null,
    lastPredictionAt: profile.lastPredictionAt ? Number(profile.lastPredictionAt) : null,
    createdAt: profile.createdAt ? Number(profile.createdAt) : null,
    updatedAt: profile.updatedAt ? Number(profile.updatedAt) : null,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    // Find profile with most data (highest message count) to handle potential duplicates
    const profile = await prisma.userProfile.findFirst({
      where: { username },
      orderBy: { messageCount: 'desc' }, // Return profile with most messages
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
