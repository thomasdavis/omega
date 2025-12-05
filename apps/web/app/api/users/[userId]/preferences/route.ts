import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/:userId/preferences
 * Get user notification preferences
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: {
        userId: true,
        username: true,
        notifyOnFeatureComplete: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      userId: profile.userId,
      username: profile.username,
      notifyOnFeatureComplete: profile.notifyOnFeatureComplete ?? true,
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/:userId/preferences
 * Update user notification preferences
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json();

    const { notifyOnFeatureComplete } = body;

    if (typeof notifyOnFeatureComplete !== 'boolean') {
      return NextResponse.json(
        { error: 'notifyOnFeatureComplete must be a boolean' },
        { status: 400 }
      );
    }

    // Check if profile exists
    const existingProfile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Update preference
    const updatedProfile = await prisma.userProfile.update({
      where: { userId },
      data: {
        notifyOnFeatureComplete,
        updatedAt: BigInt(Math.floor(Date.now() / 1000)),
      },
      select: {
        userId: true,
        username: true,
        notifyOnFeatureComplete: true,
      },
    });

    return NextResponse.json({
      success: true,
      userId: updatedProfile.userId,
      username: updatedProfile.username,
      notifyOnFeatureComplete: updatedProfile.notifyOnFeatureComplete,
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
