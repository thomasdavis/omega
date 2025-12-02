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

    // Convert BigInt fields to numbers for JSON serialization
    const serializedProfiles = profiles.map(serializeProfile);

    return NextResponse.json({
      profiles: serializedProfiles,
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
