import { NextRequest, NextResponse } from 'next/server';
import { prisma, deleteUserProfile } from '@repo/database';
import { serializeProfile } from '@/lib/serializeProfile';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile: serializeProfile(profile) });
  } catch (error) {
    const { userId } = await params;
    console.error(`Error fetching profile for user ${userId}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/profiles/[userId]
 * Implements "right to be forgotten" — permanently deletes a user profile
 * and all associated data.
 *
 * Requires `x-requesting-user-id` header for access control.
 * Only the profile owner can delete their own profile.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const requestingUserId = request.headers.get('x-requesting-user-id');

    if (!requestingUserId) {
      return NextResponse.json(
        { error: 'Missing x-requesting-user-id header. Only the profile owner can delete their profile.' },
        { status: 401 }
      );
    }

    if (requestingUserId !== userId) {
      return NextResponse.json(
        { error: 'Access denied. You can only delete your own profile.' },
        { status: 403 }
      );
    }

    const result = await deleteUserProfile(userId, requestingUserId);

    return NextResponse.json({
      success: true,
      message: `Profile for "${result.username}" has been permanently deleted.`,
      auditId: result.auditId,
      tablesAffected: result.tablesAffected,
      recordsDeleted: result.recordsDeleted,
    });
  } catch (error) {
    const { userId } = await params;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error deleting profile for user ${userId}:`, error);

    if (message.includes('Access denied')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to delete profile' },
      { status: 500 }
    );
  }
}
