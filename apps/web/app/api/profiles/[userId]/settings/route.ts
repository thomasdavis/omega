import { NextRequest, NextResponse } from 'next/server';
import { updateUserNotificationPreference } from '@repo/database/services/notificationService';
import { prisma } from '@repo/database';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/profiles/:userId/settings
 * Update user notification settings
 * Body: { notify_on_feature_complete: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json();

    // Validate body
    if (typeof body.notify_on_feature_complete !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request body. Expected: { notify_on_feature_complete: boolean }' },
        { status: 400 }
      );
    }

    // Check if profile exists
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Update the preference
    await updateUserNotificationPreference(
      userId,
      body.notify_on_feature_complete
    );

    return NextResponse.json({
      success: true,
      notify_on_feature_complete: body.notify_on_feature_complete,
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/profiles/:userId/settings
 * Get user notification settings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { notifyOnFeatureComplete: true },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      notify_on_feature_complete: profile.notifyOnFeatureComplete,
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification settings' },
      { status: 500 }
    );
  }
}
