/**
 * PostgreSQL User Profile Service
 * Port of libsql/userProfileService.ts for PostgreSQL
 * CRUD operations for user_profiles and user_analysis_history tables
 */

import { getPostgresPool } from './client.js';
import { UserProfileRecord, UserAnalysisHistoryRecord } from './schema.js';
import { randomUUID } from 'crypto';

/**
 * Get user profile by Discord user ID
 */
export async function getUserProfile(userId: string): Promise<UserProfileRecord | null> {
  const pool = await getPostgresPool();

  const result = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1 LIMIT 1', [
    userId,
  ]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as UserProfileRecord;
}

/**
 * Create a new user profile
 */
export async function createUserProfile(userId: string, username: string): Promise<string> {
  const pool = await getPostgresPool();
  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await pool.query(
    `INSERT INTO user_profiles (
      id, user_id, username,
      first_seen_at, last_interaction_at,
      message_count, created_at, updated_at,
      appearance_confidence
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, userId, username, now, now, 0, now, now, 0.0]
  );

  return id;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<UserProfileRecord, 'id' | 'user_id' | 'created_at'>>
): Promise<void> {
  const pool = await getPostgresPool();
  const now = Math.floor(Date.now() / 1000);

  // Build dynamic UPDATE query from all provided fields
  const updateFields: string[] = [];
  const args: any[] = [];
  let paramIndex = 1;

  // Iterate through all update fields dynamically
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      updateFields.push(`${key} = $${paramIndex++}`);
      args.push(value);
    }
  }

  // Always update updated_at timestamp
  updateFields.push(`updated_at = $${paramIndex++}`);
  args.push(now);

  // Add user_id to args for WHERE clause
  args.push(userId);

  if (updateFields.length === 1) {
    // Only updated_at, nothing to update
    return;
  }

  await pool.query(
    `UPDATE user_profiles SET ${updateFields.join(', ')} WHERE user_id = $${paramIndex}`,
    args
  );
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
  const pool = await getPostgresPool();

  const result = await pool.query(
    `SELECT * FROM user_profiles
     WHERE last_analyzed_at IS NULL
        OR last_analyzed_at < last_interaction_at
     ORDER BY last_interaction_at DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows as UserProfileRecord[];
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
  const pool = await getPostgresPool();
  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);

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

  await pool.query(
    `INSERT INTO user_analysis_history (
      id, user_id, analysis_timestamp,
      feelings_snapshot, personality_snapshot,
      message_count_at_analysis, changes_summary,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      userId,
      now,
      feelingsJsonb,
      personalityJsonb,
      messageCount,
      changesSummary || null,
      now,
    ]
  );

  return id;
}

/**
 * Get analysis history for a user
 */
export async function getAnalysisHistory(
  userId: string,
  limit = 10
): Promise<UserAnalysisHistoryRecord[]> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `SELECT * FROM user_analysis_history
     WHERE user_id = $1
     ORDER BY analysis_timestamp DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows as UserAnalysisHistoryRecord[];
}

/**
 * Increment message count for a user
 */
export async function incrementMessageCount(userId: string): Promise<void> {
  const pool = await getPostgresPool();
  const now = Math.floor(Date.now() / 1000);

  await pool.query(
    `UPDATE user_profiles
     SET message_count = message_count + 1,
         last_interaction_at = $1,
         updated_at = $2
     WHERE user_id = $3`,
    [now, now, userId]
  );
}

/**
 * Get all user profiles (for batch analysis)
 */
export async function getAllUserProfiles(limit = 1000): Promise<UserProfileRecord[]> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `SELECT * FROM user_profiles
     ORDER BY last_interaction_at DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows as UserProfileRecord[];
}
