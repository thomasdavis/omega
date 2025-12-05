import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';

export const dynamic = 'force-dynamic';

// Helper to convert BigInt fields to numbers for JSON serialization
function serializeHistory(history: any) {
  return {
    ...history,
    startDate: history.startDate ? Number(history.startDate) : null,
    endDate: history.endDate ? Number(history.endDate) : null,
    createdAt: history.createdAt ? Number(history.createdAt) : null,
    updatedAt: history.updatedAt ? Number(history.updatedAt) : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const collaborationType = searchParams.get('collaborationType');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};

    if (userId) {
      where.OR = [
        { userId1: userId },
        { userId2: userId },
      ];
    }

    if (collaborationType) {
      where.collaborationType = collaborationType;
    }

    const [collaborations, total] = await Promise.all([
      prisma.collaborationHistory.findMany({
        where,
        orderBy: { startDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.collaborationHistory.count({ where }),
    ]);

    return NextResponse.json({
      collaborations: collaborations.map(serializeHistory),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching collaboration history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaboration history' },
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
      collaborationType,
      projectName,
      projectDescription,
      startDate,
      endDate,
      successRating,
      user1Satisfaction,
      user2Satisfaction,
      collaborationNotes,
      metadata,
    } = body;

    if (!id || !userId1 || !userId2 || !username1 || !username2 || !collaborationType || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields: id, userId1, userId2, username1, username2, collaborationType, startDate' },
        { status: 400 }
      );
    }

    const collaboration = await prisma.collaborationHistory.create({
      data: {
        id,
        userId1,
        userId2,
        username1,
        username2,
        collaborationType,
        projectName,
        projectDescription,
        startDate: BigInt(startDate),
        endDate: endDate ? BigInt(endDate) : null,
        successRating,
        user1Satisfaction,
        user2Satisfaction,
        collaborationNotes,
        metadata,
      },
    });

    return NextResponse.json({ collaboration: serializeHistory(collaboration) }, { status: 201 });
  } catch (error) {
    console.error('Error creating collaboration history:', error);
    return NextResponse.json(
      { error: 'Failed to create collaboration history' },
      { status: 500 }
    );
  }
}
