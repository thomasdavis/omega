/**
 * PostgreSQL User Profile Service
 * Refactored to use Prisma ORM for type-safe database operations
 * CRUD operations for user_profiles and user_analysis_history tables
 */

import { prisma } from './prismaClient.js';
import { UserProfileRecord, UserAnalysisHistoryRecord } from './schema.js';
import { randomUUID } from 'crypto';

/**
 * Get user profile by Discord user ID
 */
export async function getUserProfile(userId: string): Promise<UserProfileRecord | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return null;
  }

  return profile as any as UserProfileRecord;
}

/**
 * Create a new user profile
 */
export async function createUserProfile(userId: string, username: string): Promise<string> {
  const id = randomUUID();
  const now = BigInt(Math.floor(Date.now() / 1000));

  await prisma.userProfile.create({
    data: {
      id,
      userId,
      username,
      firstSeenAt: now,
      lastInteractionAt: now,
      messageCount: 0,
      appearanceConfidence: 0.0,
    },
  });

  return id;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<UserProfileRecord, 'user_id' | 'created_at'>>
): Promise<void> {
  const now = BigInt(Math.floor(Date.now() / 1000));

  // Convert snake_case keys to camelCase for Prisma
  const prismaUpdates: any = {
    updatedAt: now,
  };

  // Map all update fields dynamically
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== 'id' && key !== 'userId') {
      prismaUpdates[key] = value;
    }
  }

  await prisma.userProfile.update({
    where: { userId },
    data: prismaUpdates,
  });
}

/**
 * Get or create user profile
 * Ensures a profile exists for the given user
 */
export async function getOrCreateUserProfile(
  userId: string,
  username: string
): Promise<UserProfileRecord> {
  let profile = await getUserProfile(userId);

  if (!profile) {
    await createUserProfile(userId, username);
    profile = await getUserProfile(userId);
  }

  return profile!;
}

/**
 * Get users needing analysis
 * Returns users who have new messages since last analysis
 */
export async function getUsersNeedingAnalysis(limit = 100): Promise<UserProfileRecord[]> {
  const profiles = await prisma.userProfile.findMany({
    where: {
      OR: [
        { lastAnalyzedAt: null },
        {
          lastAnalyzedAt: {
            lt: prisma.userProfile.fields.lastInteractionAt,
          },
        },
      ],
    },
    orderBy: { lastInteractionAt: 'desc' },
    take: limit,
  });

  return profiles as any as UserProfileRecord[];
}

/**
 * Save analysis history snapshot
 */
export async function saveAnalysisHistory(
  userId: string,
  feelingsSnapshot: string,
  personalitySnapshot: string,
  messageCount: number,
  changesSummary?: string
): Promise<string> {
  const id = randomUUID();
  const now = BigInt(Math.floor(Date.now() / 1000));

  // Parse snapshots to JSONB
  let feelingsJsonb = null;
  let personalityJsonb = null;

  try {
    feelingsJsonb = JSON.parse(feelingsSnapshot);
  } catch {
    feelingsJsonb = { raw: feelingsSnapshot };
  }

  try {
    personalityJsonb = JSON.parse(personalitySnapshot);
  } catch {
    personalityJsonb = { raw: personalitySnapshot };
  }

  await prisma.userAnalysisHistory.create({
    data: {
      id,
      userId,
      analysisTimestamp: now,
      feelingsSnapshot: feelingsJsonb,
      personalitySnapshot: personalityJsonb,
      messageCountAtAnalysis: messageCount,
      changesSummary: changesSummary || null,
    },
  });

  return id;
}

/**
 * Get analysis history for a user
 */
export async function getAnalysisHistory(
  userId: string,
  limit = 10
): Promise<UserAnalysisHistoryRecord[]> {
  const history = await prisma.userAnalysisHistory.findMany({
    where: { userId },
    orderBy: { analysisTimestamp: 'desc' },
    take: limit,
  });

  return history as any as UserAnalysisHistoryRecord[];
}

/**
 * Increment message count for a user
 */
export async function incrementMessageCount(userId: string): Promise<void> {
  const now = BigInt(Math.floor(Date.now() / 1000));

  await prisma.userProfile.update({
    where: { userId },
    data: {
      messageCount: { increment: 1 },
      lastInteractionAt: now,
      updatedAt: now,
    },
  });
}

/**
 * Get all user profiles (for batch analysis)
 */
export async function getAllUserProfiles(limit = 1000): Promise<UserProfileRecord[]> {
  const profiles = await prisma.userProfile.findMany({
    orderBy: { lastInteractionAt: 'desc' },
    take: limit,
  });

  return profiles as any as UserProfileRecord[];
}
