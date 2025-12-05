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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId1: string; userId2: string }> }
) {
  try {
    const { userId1, userId2 } = await params;

    // Try both orderings since the pair could be stored either way
    const affinity = await prisma.userAffinity.findFirst({
      where: {
        OR: [
          { userId1, userId2 },
          { userId1: userId2, userId2: userId1 },
        ],
      },
    });

    if (!affinity) {
      return NextResponse.json(
        { error: 'Affinity not found for this user pair' },
        { status: 404 }
      );
    }

    return NextResponse.json({ affinity: serializeAffinity(affinity) });
  } catch (error) {
    const { userId1, userId2 } = await params;
    console.error(`Error fetching affinity for users ${userId1} and ${userId2}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch affinity' },
      { status: 500 }
    );
  }
}
