/**
 * GeoGuessr Service - Handles geographic location guesses from user photos
 */

import { getPostgresPool } from './client.js';

export interface GeoGuessRecord {
  id: number;
  userId: string;
  photoUrl: string | null;
  guessedLocation: string | null;
  confidenceScore: number | null;
  analyzedAt: Date;
}

export interface CreateGeoGuessInput {
  userId: string;
  photoUrl: string | null;
  guessedLocation: string | null;
  confidenceScore: number | null;
}

/**
 * Save a geographic location guess to the database
 */
export async function saveGeoGuess(
  input: CreateGeoGuessInput
): Promise<GeoGuessRecord> {
  const pool = await getPostgresPool();
  
  const result = await pool.query(
    `INSERT INTO geo_guess (user_id, photo_url, guessed_location, confidence_score)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id as "userId", photo_url as "photoUrl", 
               guessed_location as "guessedLocation", confidence_score as "confidenceScore", 
               analyzed_at as "analyzedAt"`,
    [
      input.userId,
      input.photoUrl,
      input.guessedLocation,
      input.confidenceScore,
    ]
  );

  return result.rows[0];
}

/**
 * Get geographic guesses for a specific user
 */
export async function getGeoGuessesByUser(
  userId: string,
  limit: number = 10
): Promise<GeoGuessRecord[]> {
  const pool = await getPostgresPool();
  
  const result = await pool.query(
    `SELECT id, user_id as "userId", photo_url as "photoUrl", 
            guessed_location as "guessedLocation", confidence_score as "confidenceScore", 
            analyzed_at as "analyzedAt"
     FROM geo_guess
     WHERE user_id = $1
     ORDER BY analyzed_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
}

/**
 * Get the most recent geographic guess for a user
 */
export async function getLatestGeoGuess(
  userId: string
): Promise<GeoGuessRecord | null> {
  const pool = await getPostgresPool();
  
  const result = await pool.query(
    `SELECT id, user_id as "userId", photo_url as "photoUrl", 
            guessed_location as "guessedLocation", confidence_score as "confidenceScore", 
            analyzed_at as "analyzedAt"
     FROM geo_guess
     WHERE user_id = $1
     ORDER BY analyzed_at DESC
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
}

/**
 * Get all geographic guesses
 */
export async function getAllGeoGuesses(
  limit: number = 100
): Promise<GeoGuessRecord[]> {
  const pool = await getPostgresPool();
  
  const result = await pool.query(
    `SELECT id, user_id as "userId", photo_url as "photoUrl", 
            guessed_location as "guessedLocation", confidence_score as "confidenceScore", 
            analyzed_at as "analyzedAt"
     FROM geo_guess
     ORDER BY analyzed_at DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}

/**
 * Get count of geographic guesses for a user
 */
export async function getGeoGuessCount(userId: string): Promise<number> {
  const pool = await getPostgresPool();
  
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM geo_guess WHERE user_id = $1`,
    [userId]
  );

  if (!result.rows[0]) {
    return 0;
  }

  return parseInt(result.rows[0].count, 10);
}
