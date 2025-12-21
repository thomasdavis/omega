/**
 * Spatial Query Tool - PostGIS-powered location queries
 * Provides proximity searches, distance calculations, and bounding box queries
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  saveLocationMention,
  findLocationsNearby,
  findNearestLocations,
  findLocationsInBoundingBox,
  calculateDistance,
  getUserLocationMentions,
  getSpatialStatistics,
  isPostGISAvailable,
} from '@repo/database';

export const spatialQueryTool = tool({
  description: 'Query location data using PostGIS spatial capabilities. Find nearby locations, calculate distances, search within areas, and track location mentions.',
  inputSchema: z.object({
    operation: z.enum([
      'save_location',
      'find_nearby',
      'find_nearest',
      'bounding_box',
      'calculate_distance',
      'user_locations',
      'statistics',
      'check_availability',
    ]).describe('Spatial operation to perform'),

    // Save location parameters
    userId: z.string().optional().describe('User ID (for save_location, user_locations)'),
    username: z.string().optional().describe('Username (for save_location)'),
    locationText: z.string().optional().describe('Location description (for save_location)'),

    // Proximity search parameters
    latitude: z.number().min(-90).max(90).optional().describe('Latitude for proximity searches'),
    longitude: z.number().min(-180).max(180).optional().describe('Longitude for proximity searches'),
    radiusMeters: z.number().min(1).optional().describe('Search radius in meters (default: 10000 for 10km)'),

    // Distance calculation parameters
    latitude2: z.number().min(-90).max(90).optional().describe('Second point latitude (for calculate_distance)'),
    longitude2: z.number().min(-180).max(180).optional().describe('Second point longitude (for calculate_distance)'),

    // Bounding box parameters
    minLat: z.number().min(-90).max(90).optional().describe('Minimum latitude for bounding box'),
    maxLat: z.number().min(-90).max(90).optional().describe('Maximum latitude for bounding box'),
    minLng: z.number().min(-180).max(180).optional().describe('Minimum longitude for bounding box'),
    maxLng: z.number().min(-180).max(180).optional().describe('Maximum longitude for bounding box'),

    // General parameters
    limit: z.number().int().min(1).max(500).optional().describe('Maximum number of results to return'),
  }),

  execute: async ({
    operation,
    userId,
    username,
    locationText,
    latitude,
    longitude,
    radiusMeters = 10000,
    latitude2,
    longitude2,
    minLat,
    maxLat,
    minLng,
    maxLng,
    limit = 50,
  }) => {
    console.log(`🌍 Spatial Query: ${operation}`);

    try {
      // Check if PostGIS is available
      if (operation !== 'check_availability') {
        const available = await isPostGISAvailable();
        if (!available) {
          return {
            success: false,
            error: 'PostGIS extension is not available. Please run the migration script to enable it.',
            operation,
          };
        }
      }

      switch (operation) {
        case 'check_availability': {
          const available = await isPostGISAvailable();
          return {
            success: true,
            operation,
            available,
            message: available
              ? 'PostGIS extension is enabled and ready'
              : 'PostGIS extension is not available',
          };
        }

        case 'save_location': {
          if (!userId || !username || !locationText || latitude === undefined || longitude === undefined) {
            return {
              success: false,
              error: 'save_location requires: userId, username, locationText, latitude, longitude',
              operation,
            };
          }

          const id = await saveLocationMention(userId, username, locationText, latitude, longitude);
          console.log(`✅ Location saved with ID: ${id}`);

          return {
            success: true,
            operation,
            locationId: id,
            message: `Location "${locationText}" saved successfully`,
            coordinates: { latitude, longitude },
          };
        }

        case 'find_nearby': {
          if (latitude === undefined || longitude === undefined) {
            return {
              success: false,
              error: 'find_nearby requires: latitude, longitude',
              operation,
            };
          }

          const locations = await findLocationsNearby(latitude, longitude, radiusMeters, limit);
          console.log(`✅ Found ${locations.length} nearby locations`);

          return {
            success: true,
            operation,
            center: { latitude, longitude },
            radiusMeters,
            count: locations.length,
            locations: locations.map(loc => ({
              id: loc.id,
              userId: loc.userId,
              username: loc.username,
              location: loc.locationText,
              coordinates: {
                latitude: loc.latitude,
                longitude: loc.longitude,
              },
              distanceMeters: loc.distanceMeters,
              distanceKm: (loc.distanceMeters / 1000).toFixed(2),
              timestamp: loc.timestamp,
            })),
          };
        }

        case 'find_nearest': {
          if (latitude === undefined || longitude === undefined) {
            return {
              success: false,
              error: 'find_nearest requires: latitude, longitude',
              operation,
            };
          }

          const locations = await findNearestLocations(latitude, longitude, limit);
          console.log(`✅ Found ${locations.length} nearest locations`);

          return {
            success: true,
            operation,
            center: { latitude, longitude },
            count: locations.length,
            locations: locations.map(loc => ({
              id: loc.id,
              userId: loc.userId,
              username: loc.username,
              location: loc.locationText,
              coordinates: {
                latitude: loc.latitude,
                longitude: loc.longitude,
              },
              distanceMeters: loc.distanceMeters,
              distanceKm: (loc.distanceMeters / 1000).toFixed(2),
              timestamp: loc.timestamp,
            })),
          };
        }

        case 'bounding_box': {
          if (minLat === undefined || maxLat === undefined || minLng === undefined || maxLng === undefined) {
            return {
              success: false,
              error: 'bounding_box requires: minLat, maxLat, minLng, maxLng',
              operation,
            };
          }

          const locations = await findLocationsInBoundingBox(
            { minLat, maxLat, minLng, maxLng },
            limit
          );
          console.log(`✅ Found ${locations.length} locations in bounding box`);

          return {
            success: true,
            operation,
            boundingBox: { minLat, maxLat, minLng, maxLng },
            count: locations.length,
            locations: locations.map(loc => ({
              id: loc.id,
              userId: loc.userId,
              username: loc.username,
              location: loc.locationText,
              coordinates: {
                latitude: loc.latitude,
                longitude: loc.longitude,
              },
              timestamp: loc.timestamp,
            })),
          };
        }

        case 'calculate_distance': {
          if (latitude === undefined || longitude === undefined || latitude2 === undefined || longitude2 === undefined) {
            return {
              success: false,
              error: 'calculate_distance requires: latitude, longitude, latitude2, longitude2',
              operation,
            };
          }

          const distanceMeters = await calculateDistance(latitude, longitude, latitude2, longitude2);
          console.log(`✅ Distance calculated: ${distanceMeters.toFixed(2)}m`);

          return {
            success: true,
            operation,
            point1: { latitude, longitude },
            point2: { latitude: latitude2, longitude: longitude2 },
            distanceMeters: parseFloat(distanceMeters.toFixed(2)),
            distanceKm: parseFloat((distanceMeters / 1000).toFixed(2)),
            distanceMiles: parseFloat((distanceMeters / 1609.34).toFixed(2)),
          };
        }

        case 'user_locations': {
          if (!userId) {
            return {
              success: false,
              error: 'user_locations requires: userId',
              operation,
            };
          }

          const locations = await getUserLocationMentions(userId, limit);
          console.log(`✅ Found ${locations.length} locations for user ${userId}`);

          return {
            success: true,
            operation,
            userId,
            count: locations.length,
            locations: locations.map(loc => ({
              id: loc.id,
              location: loc.locationText,
              coordinates: {
                latitude: loc.latitude,
                longitude: loc.longitude,
              },
              timestamp: loc.timestamp,
            })),
          };
        }

        case 'statistics': {
          const stats = await getSpatialStatistics();
          console.log(`✅ Retrieved spatial statistics`);

          return {
            success: true,
            operation,
            statistics: {
              totalLocations: stats.totalLocations,
              locationsWithSpatialData: stats.locationsWithSpatialData,
              uniqueUsers: stats.uniqueUsers,
              coverageArea: stats.coverageArea,
            },
          };
        }

        default:
          return {
            success: false,
            error: `Unknown operation: ${operation}`,
            operation,
          };
      }
    } catch (error) {
      console.error(`❌ Spatial query error (${operation}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Spatial query failed',
        operation,
      };
    }
  },
});
