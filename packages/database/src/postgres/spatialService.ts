/**
 * Spatial Service - PostGIS spatial query utilities
 * Provides location-based queries using PostGIS extension
 */

import { getPostgresPool } from './client.js';

export interface LocationPoint {
  id: number;
  userId: string;
  username: string;
  locationText: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
}

export interface ProximityResult extends LocationPoint {
  distanceMeters: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Save a location mention with coordinates
 * Spatial point will be automatically generated via trigger
 */
export async function saveLocationMention(
  userId: string,
  username: string,
  locationText: string,
  latitude: number,
  longitude: number
): Promise<number> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `INSERT INTO location_mentions (user_id, username, location_text, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [userId, username, locationText, latitude, longitude]
  );

  return result.rows[0].id;
}

/**
 * Find locations within a radius of a point (in meters)
 * Uses PostGIS ST_DWithin for efficient spatial queries
 *
 * @param latitude Center point latitude
 * @param longitude Center point longitude
 * @param radiusMeters Radius in meters (e.g., 10000 for 10km)
 * @param limit Maximum number of results
 */
export async function findLocationsNearby(
  latitude: number,
  longitude: number,
  radiusMeters: number = 10000,
  limit: number = 50
): Promise<ProximityResult[]> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `SELECT
       id,
       user_id,
       username,
       location_text,
       latitude,
       longitude,
       timestamp,
       ST_Distance(
         location_point::geography,
         ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
       ) as distance_meters
     FROM location_mentions
     WHERE location_point IS NOT NULL
       AND ST_DWithin(
         location_point::geography,
         ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
         $3
       )
     ORDER BY distance_meters
     LIMIT $4`,
    [latitude, longitude, radiusMeters, limit]
  );

  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    username: row.username,
    locationText: row.location_text,
    latitude: row.latitude,
    longitude: row.longitude,
    timestamp: row.timestamp,
    distanceMeters: parseFloat(row.distance_meters),
  }));
}

/**
 * Find the N nearest locations to a point
 *
 * @param latitude Center point latitude
 * @param longitude Center point longitude
 * @param limit Number of nearest locations to return
 */
export async function findNearestLocations(
  latitude: number,
  longitude: number,
  limit: number = 10
): Promise<ProximityResult[]> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `SELECT
       id,
       user_id,
       username,
       location_text,
       latitude,
       longitude,
       timestamp,
       ST_Distance(
         location_point::geography,
         ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
       ) as distance_meters
     FROM location_mentions
     WHERE location_point IS NOT NULL
     ORDER BY location_point <-> ST_SetSRID(ST_MakePoint($2, $1), 4326)
     LIMIT $3`,
    [latitude, longitude, limit]
  );

  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    username: row.username,
    locationText: row.location_text,
    latitude: row.latitude,
    longitude: row.longitude,
    timestamp: row.timestamp,
    distanceMeters: parseFloat(row.distance_meters),
  }));
}

/**
 * Find locations within a bounding box
 * Useful for map-based queries
 *
 * @param bbox Bounding box with min/max lat/lng
 * @param limit Maximum number of results
 */
export async function findLocationsInBoundingBox(
  bbox: BoundingBox,
  limit: number = 100
): Promise<LocationPoint[]> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `SELECT
       id,
       user_id,
       username,
       location_text,
       latitude,
       longitude,
       timestamp
     FROM location_mentions
     WHERE location_point IS NOT NULL
       AND ST_Within(
         location_point,
         ST_MakeEnvelope($1, $2, $3, $4, 4326)
       )
     ORDER BY timestamp DESC
     LIMIT $5`,
    [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, limit]
  );

  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    username: row.username,
    locationText: row.location_text,
    latitude: row.latitude,
    longitude: row.longitude,
    timestamp: row.timestamp,
  }));
}

/**
 * Calculate distance between two locations
 *
 * @param lat1 First location latitude
 * @param lng1 First location longitude
 * @param lat2 Second location latitude
 * @param lng2 Second location longitude
 * @returns Distance in meters
 */
export async function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): Promise<number> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `SELECT ST_Distance(
       ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
       ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography
     ) as distance_meters`,
    [lat1, lng1, lat2, lng2]
  );

  return parseFloat(result.rows[0].distance_meters);
}

/**
 * Get location mentions by user
 *
 * @param userId User ID
 * @param limit Maximum number of results
 */
export async function getUserLocationMentions(
  userId: string,
  limit: number = 50
): Promise<LocationPoint[]> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `SELECT
       id,
       user_id,
       username,
       location_text,
       latitude,
       longitude,
       timestamp
     FROM location_mentions
     WHERE user_id = $1
     ORDER BY timestamp DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    username: row.username,
    locationText: row.location_text,
    latitude: row.latitude,
    longitude: row.longitude,
    timestamp: row.timestamp,
  }));
}

/**
 * Get spatial statistics
 * Returns aggregated spatial data metrics
 */
export async function getSpatialStatistics(): Promise<{
  totalLocations: number;
  locationsWithSpatialData: number;
  uniqueUsers: number;
  coverageArea?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `SELECT
       COUNT(*) as total_locations,
       COUNT(location_point) as locations_with_spatial,
       COUNT(DISTINCT user_id) as unique_users,
       MIN(latitude) as min_lat,
       MAX(latitude) as max_lat,
       MIN(longitude) as min_lng,
       MAX(longitude) as max_lng
     FROM location_mentions`
  );

  const row = result.rows[0];
  const stats: {
    totalLocations: number;
    locationsWithSpatialData: number;
    uniqueUsers: number;
    coverageArea?: {
      minLat: number;
      maxLat: number;
      minLng: number;
      maxLng: number;
    };
  } = {
    totalLocations: parseInt(row.total_locations),
    locationsWithSpatialData: parseInt(row.locations_with_spatial),
    uniqueUsers: parseInt(row.unique_users),
  };

  if (row.min_lat && row.max_lat && row.min_lng && row.max_lng) {
    stats.coverageArea = {
      minLat: parseFloat(row.min_lat),
      maxLat: parseFloat(row.max_lat),
      minLng: parseFloat(row.min_lng),
      maxLng: parseFloat(row.max_lng),
    };
  }

  return stats;
}

/**
 * Check if PostGIS extension is available
 */
export async function isPostGISAvailable(): Promise<boolean> {
  try {
    const pool = await getPostgresPool();
    const result = await pool.query(
      `SELECT EXISTS (
         SELECT 1 FROM pg_extension WHERE extname = 'postgis'
       ) as available`
    );
    return result.rows[0].available;
  } catch {
    return false;
  }
}
