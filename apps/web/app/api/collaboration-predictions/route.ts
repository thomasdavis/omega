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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const minScore = parseFloat(searchParams.get('minScore') || '0');

    if (userId) {
      // Get predictions for a specific user
      const predictions = await prisma.collaborationPrediction.findMany({
        where: {
          OR: [
            { userId1: userId },
            { userId2: userId },
          ],
          predictedSuccessScore: {
            gte: minScore,
          },
        },
        orderBy: { predictedSuccessScore: 'desc' },
        take: limit,
        skip: offset,
      });

      return NextResponse.json({
        predictions: predictions.map(serializePrediction),
        count: predictions.length,
      });
    }

    // Get all predictions
    const [predictions, total] = await Promise.all([
      prisma.collaborationPrediction.findMany({
        where: {
          predictedSuccessScore: {
            gte: minScore,
          },
        },
        orderBy: { predictedSuccessScore: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.collaborationPrediction.count({
        where: {
          predictedSuccessScore: {
            gte: minScore,
          },
        },
      }),
    ]);

    return NextResponse.json({
      predictions: predictions.map(serializePrediction),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching collaboration predictions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaboration predictions' },
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
      predictedSuccessScore,
      confidenceLevel,
      recommendedCollaborationTypes,
      potentialChallenges,
      synergyFactors,
      predictionReasoning,
      predictionModelVersion,
    } = body;

    if (!id || !userId1 || !userId2 || !username1 || !username2 || predictedSuccessScore === undefined || confidenceLevel === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: id, userId1, userId2, username1, username2, predictedSuccessScore, confidenceLevel' },
        { status: 400 }
      );
    }

    if (predictedSuccessScore < 0 || predictedSuccessScore > 1) {
      return NextResponse.json(
        { error: 'predictedSuccessScore must be between 0 and 1' },
        { status: 400 }
      );
    }

    if (confidenceLevel < 0 || confidenceLevel > 1) {
      return NextResponse.json(
        { error: 'confidenceLevel must be between 0 and 1' },
        { status: 400 }
      );
    }

    const predictedAt = Math.floor(Date.now() / 1000);

    const prediction = await prisma.collaborationPrediction.upsert({
      where: {
        userId1_userId2: {
          userId1,
          userId2,
        },
      },
      update: {
        predictedSuccessScore,
        confidenceLevel,
        recommendedCollaborationTypes,
        potentialChallenges,
        synergyFactors,
        predictionReasoning,
        predictionModelVersion,
        predictedAt,
        updatedAt: predictedAt,
      },
      create: {
        id,
        userId1,
        userId2,
        username1,
        username2,
        predictedSuccessScore,
        confidenceLevel,
        recommendedCollaborationTypes,
        potentialChallenges,
        synergyFactors,
        predictionReasoning,
        predictionModelVersion,
        predictedAt,
      },
    });

    return NextResponse.json({ prediction: serializePrediction(prediction) }, { status: 201 });
  } catch (error) {
    console.error('Error creating collaboration prediction:', error);
    return NextResponse.json(
      { error: 'Failed to create collaboration prediction' },
      { status: 500 }
    );
  }
}
