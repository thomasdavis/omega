/**
 * GeoJSON Renderer Tool - Renders GeoJSON data as SVG map visualizations
 * Supports all standard GeoJSON types with customizable styling
 * Uses pure TypeScript with Mercator projection - no external dependencies
 */

import { tool } from 'ai';
import { z } from 'zod';
import { saveGeneratedImage } from '@repo/database';

// ===== GeoJSON Type Definitions =====

interface GeoJSONPosition {
  0: number; // longitude
  1: number; // latitude
  [index: number]: number;
}

interface GeoJSONPoint {
  type: 'Point';
  coordinates: GeoJSONPosition;
}

interface GeoJSONMultiPoint {
  type: 'MultiPoint';
  coordinates: GeoJSONPosition[];
}

interface GeoJSONLineString {
  type: 'LineString';
  coordinates: GeoJSONPosition[];
}

interface GeoJSONMultiLineString {
  type: 'MultiLineString';
  coordinates: GeoJSONPosition[][];
}

interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: GeoJSONPosition[][];
}

interface GeoJSONMultiPolygon {
  type: 'MultiPolygon';
  coordinates: GeoJSONPosition[][][];
}

interface GeoJSONGeometryCollection {
  type: 'GeometryCollection';
  geometries: GeoJSONGeometry[];
}

type GeoJSONGeometry =
  | GeoJSONPoint
  | GeoJSONMultiPoint
  | GeoJSONLineString
  | GeoJSONMultiLineString
  | GeoJSONPolygon
  | GeoJSONMultiPolygon
  | GeoJSONGeometryCollection;

interface GeoJSONFeature {
  type: 'Feature';
  geometry: GeoJSONGeometry;
  properties?: Record<string, unknown> | null;
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

type GeoJSONObject = GeoJSONGeometry | GeoJSONFeature | GeoJSONFeatureCollection;

// ===== Bounding Box =====

interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

// ===== Mercator Projection =====

function mercatorX(lng: number): number {
  return (lng + 180) / 360;
}

function mercatorY(lat: number): number {
  const latRad = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;
}

// ===== Coordinate Extraction =====

function extractCoordinates(geojson: GeoJSONObject): GeoJSONPosition[] {
  const coords: GeoJSONPosition[] = [];

  function walk(obj: GeoJSONObject): void {
    switch (obj.type) {
      case 'Point':
        coords.push(obj.coordinates);
        break;
      case 'MultiPoint':
      case 'LineString':
        coords.push(...obj.coordinates);
        break;
      case 'MultiLineString':
      case 'Polygon':
        for (const ring of obj.coordinates) {
          coords.push(...ring);
        }
        break;
      case 'MultiPolygon':
        for (const polygon of obj.coordinates) {
          for (const ring of polygon) {
            coords.push(...ring);
          }
        }
        break;
      case 'GeometryCollection':
        for (const geom of obj.geometries) {
          walk(geom);
        }
        break;
      case 'Feature':
        if (obj.geometry) {
          walk(obj.geometry);
        }
        break;
      case 'FeatureCollection':
        for (const feature of obj.features) {
          walk(feature);
        }
        break;
    }
  }

  walk(geojson);
  return coords;
}

// ===== Bounding Box Calculation =====

function calculateBoundingBox(coords: GeoJSONPosition[], padding: number = 0.1): BoundingBox {
  if (coords.length === 0) {
    return { minLng: -180, minLat: -85, maxLng: 180, maxLat: 85 };
  }

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const coord of coords) {
    if (coord[0] < minLng) minLng = coord[0];
    if (coord[1] < minLat) minLat = coord[1];
    if (coord[0] > maxLng) maxLng = coord[0];
    if (coord[1] > maxLat) maxLat = coord[1];
  }

  // Handle single point - add a small extent
  if (minLng === maxLng && minLat === maxLat) {
    const offset = 0.01;
    minLng -= offset;
    minLat -= offset;
    maxLng += offset;
    maxLat += offset;
  }

  // Add padding
  const lngRange = maxLng - minLng;
  const latRange = maxLat - minLat;
  minLng -= lngRange * padding;
  minLat -= latRange * padding;
  maxLng += lngRange * padding;
  maxLat += latRange * padding;

  // Clamp to valid ranges
  minLng = Math.max(minLng, -180);
  minLat = Math.max(minLat, -85);
  maxLng = Math.min(maxLng, 180);
  maxLat = Math.min(maxLat, 85);

  return { minLng, minLat, maxLng, maxLat };
}

// ===== SVG Rendering =====

interface RenderOptions {
  width: number;
  height: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  fillOpacity: number;
  pointRadius: number;
  backgroundColor: string;
}

function projectPoint(
  lng: number,
  lat: number,
  bbox: BoundingBox,
  width: number,
  height: number
): [number, number] {
  const x0 = mercatorX(bbox.minLng);
  const y0 = mercatorY(bbox.maxLat); // Note: maxLat maps to top (lower Y)
  const x1 = mercatorX(bbox.maxLng);
  const y1 = mercatorY(bbox.minLat);

  const xRange = x1 - x0;
  const yRange = y1 - y0;

  const px = ((mercatorX(lng) - x0) / xRange) * width;
  const py = ((mercatorY(lat) - y0) / yRange) * height;

  return [px, py];
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderGeometry(
  geometry: GeoJSONGeometry,
  bbox: BoundingBox,
  options: RenderOptions,
  featureProperties?: Record<string, unknown> | null
): string {
  const { width, height, fillColor, strokeColor, strokeWidth, fillOpacity, pointRadius } = options;
  const svgParts: string[] = [];

  // Check for per-feature styling in properties
  const propFill = featureProperties?.fill as string | undefined;
  const propStroke = featureProperties?.stroke as string | undefined;
  const propStrokeWidth = featureProperties?.['stroke-width'] as number | undefined;
  const propFillOpacity = featureProperties?.['fill-opacity'] as number | undefined;
  const propMarkerColor = featureProperties?.['marker-color'] as string | undefined;

  const useFill = propFill || fillColor;
  const useStroke = propStroke || propMarkerColor || strokeColor;
  const useStrokeWidth = propStrokeWidth ?? strokeWidth;
  const useFillOpacity = propFillOpacity ?? fillOpacity;

  switch (geometry.type) {
    case 'Point': {
      const [px, py] = projectPoint(geometry.coordinates[0], geometry.coordinates[1], bbox, width, height);
      svgParts.push(
        `<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${pointRadius}" ` +
        `fill="${propMarkerColor || useStroke}" stroke="white" stroke-width="1.5" opacity="0.9"/>`
      );
      break;
    }

    case 'MultiPoint': {
      for (const coord of geometry.coordinates) {
        const [px, py] = projectPoint(coord[0], coord[1], bbox, width, height);
        svgParts.push(
          `<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${pointRadius}" ` +
          `fill="${propMarkerColor || useStroke}" stroke="white" stroke-width="1.5" opacity="0.9"/>`
        );
      }
      break;
    }

    case 'LineString': {
      const points = geometry.coordinates
        .map(coord => {
          const [px, py] = projectPoint(coord[0], coord[1], bbox, width, height);
          return `${px.toFixed(2)},${py.toFixed(2)}`;
        })
        .join(' ');
      svgParts.push(
        `<polyline points="${points}" fill="none" ` +
        `stroke="${useStroke}" stroke-width="${useStrokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`
      );
      break;
    }

    case 'MultiLineString': {
      for (const line of geometry.coordinates) {
        const points = line
          .map(coord => {
            const [px, py] = projectPoint(coord[0], coord[1], bbox, width, height);
            return `${px.toFixed(2)},${py.toFixed(2)}`;
          })
          .join(' ');
        svgParts.push(
          `<polyline points="${points}" fill="none" ` +
          `stroke="${useStroke}" stroke-width="${useStrokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`
        );
      }
      break;
    }

    case 'Polygon': {
      for (let i = 0; i < geometry.coordinates.length; i++) {
        const ring = geometry.coordinates[i];
        const points = ring
          .map(coord => {
            const [px, py] = projectPoint(coord[0], coord[1], bbox, width, height);
            return `${px.toFixed(2)},${py.toFixed(2)}`;
          })
          .join(' ');
        svgParts.push(
          `<polygon points="${points}" ` +
          `fill="${useFill}" fill-opacity="${useFillOpacity}" ` +
          `stroke="${useStroke}" stroke-width="${useStrokeWidth}"/>`
        );
      }
      break;
    }

    case 'MultiPolygon': {
      for (const polygon of geometry.coordinates) {
        for (const ring of polygon) {
          const points = ring
            .map(coord => {
              const [px, py] = projectPoint(coord[0], coord[1], bbox, width, height);
              return `${px.toFixed(2)},${py.toFixed(2)}`;
            })
            .join(' ');
          svgParts.push(
            `<polygon points="${points}" ` +
            `fill="${useFill}" fill-opacity="${useFillOpacity}" ` +
            `stroke="${useStroke}" stroke-width="${useStrokeWidth}"/>`
          );
        }
      }
      break;
    }

    case 'GeometryCollection': {
      for (const geom of geometry.geometries) {
        svgParts.push(renderGeometry(geom, bbox, options, featureProperties));
      }
      break;
    }
  }

  return svgParts.join('\n    ');
}

function renderGeoJSONToSvg(
  geojson: GeoJSONObject,
  options: RenderOptions
): { svg: string; bbox: BoundingBox; featureCount: number } {
  const coords = extractCoordinates(geojson);
  const bbox = calculateBoundingBox(coords);
  const { width, height, backgroundColor } = options;

  let featureCount = 0;
  const svgFeatures: string[] = [];

  function renderObject(obj: GeoJSONObject): void {
    switch (obj.type) {
      case 'FeatureCollection':
        for (const feature of obj.features) {
          renderObject(feature);
        }
        break;
      case 'Feature':
        if (obj.geometry) {
          featureCount++;
          svgFeatures.push(renderGeometry(obj.geometry, bbox, options, obj.properties));
        }
        break;
      default:
        // Raw geometry
        featureCount++;
        svgFeatures.push(renderGeometry(obj, bbox, options));
        break;
    }
  }

  renderObject(geojson);

  // Build a simple grid for visual reference
  const gridLines: string[] = [];
  const gridSteps = 4;
  for (let i = 1; i < gridSteps; i++) {
    const xPos = (width / gridSteps) * i;
    const yPos = (height / gridSteps) * i;
    gridLines.push(
      `<line x1="${xPos.toFixed(1)}" y1="0" x2="${xPos.toFixed(1)}" y2="${height}" stroke="#e0e0e0" stroke-width="0.5" stroke-dasharray="4,4"/>`,
      `<line x1="0" y1="${yPos.toFixed(1)}" x2="${width}" y2="${yPos.toFixed(1)}" stroke="#e0e0e0" stroke-width="0.5" stroke-dasharray="4,4"/>`
    );
  }

  // Add coordinate labels at corners
  const labels = [
    `<text x="4" y="14" font-size="10" fill="#999" font-family="monospace">${bbox.maxLat.toFixed(4)}, ${bbox.minLng.toFixed(4)}</text>`,
    `<text x="${width - 4}" y="${height - 4}" font-size="10" fill="#999" font-family="monospace" text-anchor="end">${bbox.minLat.toFixed(4)}, ${bbox.maxLng.toFixed(4)}</text>`,
  ];

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${escapeXml(backgroundColor)}"/>
  <g id="grid">
    ${gridLines.join('\n    ')}
  </g>
  <g id="features">
    ${svgFeatures.join('\n    ')}
  </g>
  <g id="labels">
    ${labels.join('\n    ')}
  </g>
</svg>`;

  return { svg, bbox, featureCount };
}

// ===== GeoJSON Validation =====

const VALID_GEOJSON_TYPES = [
  'Point', 'MultiPoint', 'LineString', 'MultiLineString',
  'Polygon', 'MultiPolygon', 'GeometryCollection',
  'Feature', 'FeatureCollection',
];

function validateGeoJSON(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'GeoJSON must be a JSON object' };
  }

  const obj = data as Record<string, unknown>;

  if (!obj.type || typeof obj.type !== 'string') {
    return { valid: false, error: 'GeoJSON must have a "type" property' };
  }

  if (!VALID_GEOJSON_TYPES.includes(obj.type)) {
    return { valid: false, error: `Invalid GeoJSON type: "${obj.type}". Must be one of: ${VALID_GEOJSON_TYPES.join(', ')}` };
  }

  if (obj.type === 'FeatureCollection') {
    if (!Array.isArray(obj.features)) {
      return { valid: false, error: 'FeatureCollection must have a "features" array' };
    }
  }

  if (obj.type === 'Feature') {
    if (!obj.geometry && obj.geometry !== null) {
      return { valid: false, error: 'Feature must have a "geometry" property' };
    }
  }

  // Check that coordinates exist for geometry types
  const geometryTypes = ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'];
  if (geometryTypes.includes(obj.type) && !obj.coordinates) {
    return { valid: false, error: `${obj.type} must have a "coordinates" property` };
  }

  if (obj.type === 'GeometryCollection' && !Array.isArray(obj.geometries)) {
    return { valid: false, error: 'GeometryCollection must have a "geometries" array' };
  }

  return { valid: true };
}

// ===== Tool Export =====

export const renderGeojsonTool = tool({
  description: `Render GeoJSON data as an SVG map visualization. Supports all standard GeoJSON types: Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon, GeometryCollection, Feature, and FeatureCollection.

Automatically calculates the bounding box to frame the data optimally. Supports customizable colors, stroke widths, opacity, point sizes, and image dimensions. Per-feature styling via GeoJSON properties (fill, stroke, stroke-width, fill-opacity, marker-color) is also supported.

Returns the rendered SVG string along with metadata including bounding box coordinates, feature count, and geometry type summary.

Example use cases:
- "render this GeoJSON data as a map"
- "show me a map with these GeoJSON coordinates"
- "visualize these GeoJSON polygons"
- "create a map from my GeoJSON file"`,

  inputSchema: z.object({
    geojson: z.union([z.string(), z.record(z.unknown())])
      .describe('GeoJSON data as a JSON string or object. Supports Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon, GeometryCollection, Feature, and FeatureCollection'),

    width: z.number().int().min(200).max(2000).optional()
      .describe('SVG width in pixels (default: 800)'),

    height: z.number().int().min(200).max(2000).optional()
      .describe('SVG height in pixels (default: 600)'),

    fillColor: z.string().optional()
      .describe('Default fill color for polygons (default: "#3388ff")'),

    strokeColor: z.string().optional()
      .describe('Default stroke color for lines and polygon borders (default: "#3388ff")'),

    strokeWidth: z.number().min(0.5).max(10).optional()
      .describe('Default stroke width in pixels (default: 2)'),

    fillOpacity: z.number().min(0).max(1).optional()
      .describe('Default fill opacity for polygons, 0-1 (default: 0.3)'),

    pointRadius: z.number().min(2).max(20).optional()
      .describe('Radius for point markers in pixels (default: 6)'),

    backgroundColor: z.string().optional()
      .describe('Background color of the SVG (default: "#f8f9fa")'),

    title: z.string().optional()
      .describe('Optional title for the map visualization'),

    userId: z.string().optional()
      .describe('User ID for tracking who created the visualization'),

    username: z.string().optional()
      .describe('Username for tracking who created the visualization'),

    discordMessageId: z.string().optional()
      .describe('Discord message ID to associate with this visualization'),
  }),

  execute: async ({
    geojson,
    width = 800,
    height = 600,
    fillColor = '#3388ff',
    strokeColor = '#3388ff',
    strokeWidth = 2,
    fillOpacity = 0.3,
    pointRadius = 6,
    backgroundColor = '#f8f9fa',
    title,
    userId,
    username,
    discordMessageId,
  }) => {
    try {
      console.log('🗺️ Rendering GeoJSON data...');

      // Parse GeoJSON if provided as string
      let parsedGeojson: unknown;
      if (typeof geojson === 'string') {
        try {
          parsedGeojson = JSON.parse(geojson);
        } catch {
          return {
            success: false,
            error: 'Invalid JSON string. Please provide valid GeoJSON data.',
          };
        }
      } else {
        parsedGeojson = geojson;
      }

      // Validate GeoJSON structure
      const validation = validateGeoJSON(parsedGeojson);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const geojsonData = parsedGeojson as GeoJSONObject;

      // Extract coordinates to check we have renderable data
      const allCoords = extractCoordinates(geojsonData);
      if (allCoords.length === 0) {
        return {
          success: false,
          error: 'No coordinates found in the GeoJSON data. Ensure the data contains geometry with valid coordinates.',
        };
      }

      // Render to SVG
      const renderOptions: RenderOptions = {
        width,
        height,
        fillColor,
        strokeColor,
        strokeWidth,
        fillOpacity,
        pointRadius,
        backgroundColor,
      };

      const { svg, bbox, featureCount } = renderGeoJSONToSvg(geojsonData, renderOptions);

      console.log(`✅ GeoJSON rendered: ${featureCount} features, ${allCoords.length} coordinates`);

      // Collect geometry type summary
      const typeCounts: Record<string, number> = {};
      function countTypes(obj: GeoJSONObject): void {
        switch (obj.type) {
          case 'FeatureCollection':
            for (const f of obj.features) countTypes(f);
            break;
          case 'Feature':
            if (obj.geometry) countTypes(obj.geometry);
            break;
          case 'GeometryCollection':
            for (const g of obj.geometries) countTypes(g);
            break;
          default:
            typeCounts[obj.type] = (typeCounts[obj.type] || 0) + 1;
        }
      }
      countTypes(geojsonData);

      const typesSummary = Object.entries(typeCounts)
        .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
        .join(', ');

      // Build result
      const result: Record<string, unknown> = {
        success: true,
        svg,
        svgSize: svg.length,
        svgSizeFormatted: `${(svg.length / 1024).toFixed(2)} KB`,
        width,
        height,
        featureCount,
        coordinateCount: allCoords.length,
        geometryTypes: typeCounts,
        typesSummary,
        boundingBox: {
          minLng: bbox.minLng,
          minLat: bbox.minLat,
          maxLng: bbox.maxLng,
          maxLat: bbox.maxLat,
        },
        message: `GeoJSON rendered successfully: ${featureCount} feature(s) (${typesSummary}) across ${allCoords.length} coordinates.${title ? ` Title: ${title}` : ''}`,
      };

      // Save to database if userId provided
      if (userId) {
        try {
          const prompt = `Render GeoJSON${title ? ` "${title}"` : ''}: ${typesSummary}, ${allCoords.length} coordinates`;
          const dbResult = await saveGeneratedImage({
            userId,
            username,
            toolName: 'renderGeojson',
            prompt,
            model: 'svg-renderer',
            storageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
            storageProvider: 'inline',
            mimeType: 'image/svg+xml',
            bytes: svg.length,
            status: 'success',
            metadata: {
              filename: `geojson_${Date.now()}.svg`,
              description: `GeoJSON SVG visualization: ${typesSummary}`,
              featureCount,
              coordinateCount: allCoords.length,
              geometryTypes: typeCounts,
              width,
              height,
              title: title || null,
              timestamp: new Date().toISOString(),
            },
            messageId: discordMessageId,
          });

          console.log(`💾 GeoJSON visualization saved to database with ID: ${dbResult.id}`);
          result.databaseId = dbResult.id;
          result.savedToDatabase = true;
        } catch (dbError) {
          console.error('❌ Error saving GeoJSON visualization to database:', dbError);
          result.databaseSaveWarning = `Visualization was rendered but could not be saved to database: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`;
          result.savedToDatabase = false;
        }
      }

      return result;
    } catch (error) {
      console.error('❌ Error rendering GeoJSON:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to render GeoJSON data',
      };
    }
  },
});
