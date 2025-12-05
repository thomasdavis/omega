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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const collaboration = await prisma.collaborationHistory.findUnique({
      where: { id },
    });

    if (!collaboration) {
      return NextResponse.json(
        { error: 'Collaboration history not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ collaboration: serializeHistory(collaboration) });
  } catch (error) {
    const { id } = await params;
    console.error(`Error fetching collaboration history ${id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch collaboration history' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      endDate,
      successRating,
      user1Satisfaction,
      user2Satisfaction,
      collaborationNotes,
      metadata,
    } = body;

    const updatedAt = Math.floor(Date.now() / 1000);

    const collaboration = await prisma.collaborationHistory.update({
      where: { id },
      data: {
        endDate: endDate ? BigInt(endDate) : undefined,
        successRating,
        user1Satisfaction,
        user2Satisfaction,
        collaborationNotes,
        metadata,
        updatedAt: BigInt(updatedAt),
      },
    });

    return NextResponse.json({ collaboration: serializeHistory(collaboration) });
  } catch (error) {
    const { id } = await params;
    console.error(`Error updating collaboration history ${id}:`, error);
    return NextResponse.json(
      { error: 'Failed to update collaboration history' },
      { status: 500 }
    );
  }
}
