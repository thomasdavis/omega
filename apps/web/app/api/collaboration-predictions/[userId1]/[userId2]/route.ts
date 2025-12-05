import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';

export const dynamic = 'force-dynamic';

// Helper to convert BigInt fields to numbers for JSON serialization
function serializePrediction(prediction: any) {
  return {
    ...prediction,
    predictedAt: prediction.predictedAt ? Number(prediction.predictedAt) : null,
    createdAt: prediction.createdAt ? Number(prediction.createdAt) : null,
    updatedAt: prediction.updatedAt ? Number(prediction.updatedAt) : null,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId1: string; userId2: string }> }
) {
  try {
    const { userId1, userId2 } = await params;

    // Try both orderings since the pair could be stored either way
    const prediction = await prisma.collaborationPrediction.findFirst({
      where: {
        OR: [
          { userId1, userId2 },
          { userId1: userId2, userId2: userId1 },
        ],
      },
    });

    if (!prediction) {
      return NextResponse.json(
        { error: 'Prediction not found for this user pair' },
        { status: 404 }
      );
    }

    return NextResponse.json({ prediction: serializePrediction(prediction) });
  } catch (error) {
    const { userId1, userId2 } = await params;
    console.error(`Error fetching prediction for users ${userId1} and ${userId2}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch prediction' },
      { status: 500 }
    );
  }
}
