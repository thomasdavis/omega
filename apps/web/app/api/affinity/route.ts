import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';

export const dynamic = 'force-dynamic';

// Helper to convert BigInt fields to numbers for JSON serialization
function serializeAffinity(affinity: any) {
  return {
    ...affinity,
    calculatedAt: affinity.calculatedAt ? Number(affinity.calculatedAt) : null,
    createdAt: affinity.createdAt ? Number(affinity.createdAt) : null,
    updatedAt: affinity.updatedAt ? Number(affinity.updatedAt) : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const minScore = parseFloat(searchParams.get('minScore') || '0');

    if (userId) {
      // Get affinities for a specific user
      const affinities = await prisma.userAffinity.findMany({
        where: {
          OR: [
            { userId1: userId },
            { userId2: userId },
          ],
          affinityScore: {
            gte: minScore,
          },
        },
        orderBy: { affinityScore: 'desc' },
        take: limit,
        skip: offset,
      });

      return NextResponse.json({
        affinities: affinities.map(serializeAffinity),
        count: affinities.length,
      });
    }

    // Get all affinities
    const [affinities, total] = await Promise.all([
      prisma.userAffinity.findMany({
        where: {
          affinityScore: {
            gte: minScore,
          },
        },
        orderBy: { affinityScore: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.userAffinity.count({
        where: {
          affinityScore: {
            gte: minScore,
          },
        },
      }),
    ]);

    return NextResponse.json({
      affinities: affinities.map(serializeAffinity),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching affinities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch affinities' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      userId1,
      userId2,
      username1,
      username2,
      affinityScore,
      personalityCompatibility,
      interestAlignment,
      communicationCompatibility,
      compatibilityFactors,
    } = body;

    if (!id || !userId1 || !userId2 || !username1 || !username2 || affinityScore === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: id, userId1, userId2, username1, username2, affinityScore' },
        { status: 400 }
      );
    }

    if (affinityScore < 0 || affinityScore > 1) {
      return NextResponse.json(
        { error: 'affinityScore must be between 0 and 1' },
        { status: 400 }
      );
    }

    const calculatedAt = Math.floor(Date.now() / 1000);

    const affinity = await prisma.userAffinity.upsert({
      where: {
        userId1_userId2: {
          userId1,
          userId2,
        },
      },
      update: {
        affinityScore,
        personalityCompatibility,
        interestAlignment,
        communicationCompatibility,
        compatibilityFactors,
        calculatedAt,
        updatedAt: calculatedAt,
      },
      create: {
        id,
        userId1,
        userId2,
        username1,
        username2,
        affinityScore,
        personalityCompatibility,
        interestAlignment,
        communicationCompatibility,
        compatibilityFactors,
        calculatedAt,
      },
    });

    return NextResponse.json({ affinity: serializeAffinity(affinity) }, { status: 201 });
  } catch (error) {
    console.error('Error creating affinity:', error);
    return NextResponse.json(
      { error: 'Failed to create affinity' },
      { status: 500 }
    );
  }
}
