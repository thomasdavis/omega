/**
 * Location Map Tool - Detects locations and generates Google Maps snapshots and links
 * Supports: GPS coordinates, addresses, zip codes, postal codes, place names
 */

import { tool } from 'ai';
import { z } from 'zod';

// Helper function to detect and parse location from text
function detectLocation(text: string): {
  type: 'coordinates' | 'address' | 'place' | null;
  location: string | null;
  latitude?: number;
  longitude?: number;
} {
  // GPS coordinates pattern: 47.6205, -122.3493 or 47.6205° N, 122.3493° W
  const coordsPattern = /(-?\d+\.?\d*)[°\s]*([NS])?,?\s*(-?\d+\.?\d*)[°\s]*([EW])?/i;
  const match = text.match(coordsPattern);

  if (match) {
    let lat = parseFloat(match[1]);
    let lng = parseFloat(match[3]);

    // Handle N/S/E/W indicators
    if (match[2]?.toUpperCase() === 'S') lat = -Math.abs(lat);
    if (match[4]?.toUpperCase() === 'W') lng = -Math.abs(lng);

    // Validate coordinate ranges
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return {
        type: 'coordinates',
        location: `${lat}, ${lng}`,
        latitude: lat,
        longitude: lng,
      };
    }
  }

  // US Zip code pattern: 5 digits or 5+4 format
  const zipPattern = /\b\d{5}(?:-\d{4})?\b/;
  const zipMatch = text.match(zipPattern);
  if (zipMatch) {
    return {
      type: 'address',
      location: zipMatch[0],
    };
  }

  // UK/Canada postal code pattern
  const postalPattern = /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i;
  const postalMatch = text.match(postalPattern);
  if (postalMatch) {
    return {
      type: 'address',
      location: postalMatch[0],
    };
  }

  // Common place name patterns (cities, landmarks, addresses)
  // This is a simple heuristic - in production you'd use a geocoding API
  const placeKeywords = ['street', 'st', 'avenue', 'ave', 'road', 'rd', 'boulevard', 'blvd', 'city', 'town'];
  const lowerText = text.toLowerCase();
  for (const keyword of placeKeywords) {
    if (lowerText.includes(keyword)) {
      // Extract potential address/place name
      const sentences = text.split(/[.!?]/);
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes(keyword)) {
          return {
            type: 'place',
            location: sentence.trim(),
          };
        }
      }
    }
  }

  return { type: null, location: null };
}

// Generate Google Maps Static API URL
function generateStaticMapUrl(
  latitude: number,
  longitude: number,
  zoom: number = 18,
  width: number = 600,
  height: number = 400
): string {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';
  const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';

  return `${baseUrl}?center=${latitude},${longitude}&zoom=${zoom}&size=${width}x${height}&markers=color:red%7C${latitude},${longitude}&key=${apiKey}`;
}

// Generate Google Maps link
function generateMapsLink(
  latitude: number,
  longitude: number,
  zoom: number = 18
): string {
  return `https://www.google.com/maps/@${latitude},${longitude},${zoom}z`;
}

// Google Maps Geocoding API response type
interface GeocodeResponse {
  status: string;
  results?: Array<{
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
  }>;
}

// Geocode address/place to coordinates using Google Maps Geocoding API
async function geocodeLocation(address: string): Promise<{
  success: boolean;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  error?: string;
}> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
    return {
      success: false,
      error: 'Google Maps API key not configured. Please set GOOGLE_MAPS_API_KEY environment variable.',
    };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Geocoding API returned status ${response.status}`,
      };
    }

    const data = await response.json() as GeocodeResponse;

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return {
        success: false,
        error: data.status === 'ZERO_RESULTS'
          ? 'Location not found. Please provide a more specific address or place name.'
          : `Geocoding failed: ${data.status}`,
      };
    }

    const result = data.results[0];
    return {
      success: true,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Geocoding request failed',
    };
  }
}

export const locationMapTool = tool({
  description: 'Detect physical locations (GPS coordinates, addresses, zip codes, postal codes, or place names) and generate a Google Maps static image snapshot and clickable link. Useful when users mention locations, want to see a map, or ask about places.',
  inputSchema: z.object({
    text: z.string().describe('The text to scan for location mentions (e.g., "47.6205, -122.3493" or "Seattle, WA" or "10001")'),
    zoom: z.number().min(1).max(21).default(18).optional().describe('Google Maps zoom level (1-21, default 18 which shows ~1000 feet on each side)'),
    width: z.number().min(100).max(640).default(600).optional().describe('Map image width in pixels (max 640)'),
    height: z.number().min(100).max(640).default(400).optional().describe('Map image height in pixels (max 640)'),
  }),
  execute: async ({ text, zoom = 18, width = 600, height = 400 }) => {
    console.log(`🗺️ Detecting location in text: "${text}"`);

    // Step 1: Detect location in text
    const detection = detectLocation(text);

    if (!detection.type || !detection.location) {
      console.log('❌ No location detected in text');
      return {
        success: false,
        error: 'no_location_detected',
        message: 'Could not detect a physical location in the provided text. Please provide GPS coordinates (e.g., "47.6205, -122.3493"), an address, zip code, or place name.',
      };
    }

    console.log(`✅ Location detected: type=${detection.type}, location=${detection.location}`);

    let latitude: number;
    let longitude: number;
    let formattedAddress: string | undefined;

    // Step 2: Get coordinates (either directly from detection or via geocoding)
    if (detection.latitude !== undefined && detection.longitude !== undefined) {
      // Coordinates already detected
      latitude = detection.latitude;
      longitude = detection.longitude;
      formattedAddress = detection.location;
    } else {
      // Need to geocode address/place
      console.log(`🌍 Geocoding location: ${detection.location}`);
      const geocodeResult = await geocodeLocation(detection.location);

      if (!geocodeResult.success) {
        console.log(`❌ Geocoding failed: ${geocodeResult.error}`);
        return {
          success: false,
          error: 'geocoding_failed',
          message: geocodeResult.error,
          detectedLocation: detection.location,
          detectedType: detection.type,
        };
      }

      latitude = geocodeResult.latitude!;
      longitude = geocodeResult.longitude!;
      formattedAddress = geocodeResult.formattedAddress;
      console.log(`✅ Geocoded to: ${latitude}, ${longitude} (${formattedAddress})`);
    }

    // Step 3: Generate map snapshot URL and link
    const staticMapUrl = generateStaticMapUrl(latitude, longitude, zoom, width, height);
    const mapsLink = generateMapsLink(latitude, longitude, zoom);

    console.log(`🗺️ Generated map URLs`);
    console.log(`   Static: ${staticMapUrl}`);
    console.log(`   Link: ${mapsLink}`);

    // Step 4: Return formatted response
    return {
      success: true,
      location: {
        original: detection.location,
        formatted: formattedAddress || detection.location,
        latitude,
        longitude,
        type: detection.type,
      },
      maps: {
        staticImageUrl: staticMapUrl,
        interactiveLink: mapsLink,
        zoom,
      },
      // Include markdown-formatted output for easy Discord posting
      markdown: `**📍 Location: ${formattedAddress || detection.location}**\n\n` +
                `**Coordinates:** ${latitude}, ${longitude}\n\n` +
                `![Map](${staticMapUrl})\n\n` +
                `[Open in Google Maps](${mapsLink})`,
    };
  },
});
