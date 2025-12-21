#!/bin/bash
# Enable PostGIS extension and add spatial data support
# Run with: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/enable-postgis-extension.sh'

set -e

echo "🌍 Enabling PostGIS extension and adding spatial data support..."

psql "$DATABASE_URL" << 'EOF'
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Verify PostGIS version
SELECT PostGIS_Version();

-- Add spatial column to location_mentions table
-- Using geometry type with SRID 4326 (WGS84 - standard GPS coordinates)
ALTER TABLE location_mentions
  ADD COLUMN IF NOT EXISTS location_point geometry(Point, 4326);

-- Create a function to automatically update location_point when lat/lng changes
CREATE OR REPLACE FUNCTION update_location_point()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if both latitude and longitude are present
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location_point = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  ELSE
    NEW.location_point = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate location_point
DROP TRIGGER IF EXISTS trg_update_location_point ON location_mentions;
CREATE TRIGGER trg_update_location_point
  BEFORE INSERT OR UPDATE OF latitude, longitude ON location_mentions
  FOR EACH ROW
  EXECUTE FUNCTION update_location_point();

-- Backfill existing records with location_point
UPDATE location_mentions
SET location_point = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND location_point IS NULL;

-- Create spatial index for efficient spatial queries (GIST index)
CREATE INDEX IF NOT EXISTS idx_location_mentions_location_point
  ON location_mentions USING GIST(location_point);

-- Add comments for documentation
COMMENT ON COLUMN location_mentions.location_point IS 'Spatial point geometry (SRID 4326) automatically generated from latitude/longitude';
COMMENT ON INDEX idx_location_mentions_location_point IS 'Spatial index for efficient proximity and distance queries';

-- Create helper views for common spatial queries

-- View: Locations with valid spatial data
CREATE OR REPLACE VIEW location_mentions_spatial AS
SELECT
  id,
  user_id,
  username,
  location_text,
  latitude,
  longitude,
  location_point,
  timestamp,
  ST_X(location_point) as point_longitude,
  ST_Y(location_point) as point_latitude
FROM location_mentions
WHERE location_point IS NOT NULL;

COMMENT ON VIEW location_mentions_spatial IS 'Locations with valid spatial data, includes point coordinates for verification';

-- Display summary
SELECT
  'PostGIS Extension' as component,
  'Enabled' as status
UNION ALL
SELECT
  'Spatial Columns' as component,
  COUNT(*)::text || ' records with location_point' as status
FROM location_mentions
WHERE location_point IS NOT NULL
UNION ALL
SELECT
  'Spatial Indexes' as component,
  'GIST index on location_point' as status;

-- Show table structure
SELECT
  column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'location_mentions'
ORDER BY ordinal_position;

-- Example spatial queries you can now run:
COMMENT ON TABLE location_mentions IS 'Location mentions with PostGIS spatial support.

Example Queries:

1. Find locations within 10km of a point:
   SELECT * FROM location_mentions
   WHERE ST_DWithin(
     location_point,
     ST_SetSRID(ST_MakePoint(-122.3321, 47.6062), 4326)::geography,
     10000  -- 10km in meters
   );

2. Calculate distance between two locations:
   SELECT
     a.location_text,
     b.location_text,
     ST_Distance(a.location_point::geography, b.location_point::geography) as distance_meters
   FROM location_mentions a, location_mentions b
   WHERE a.id != b.id;

3. Find nearest locations:
   SELECT
     location_text,
     ST_Distance(
       location_point::geography,
       ST_SetSRID(ST_MakePoint(-122.3321, 47.6062), 4326)::geography
     ) as distance_meters
   FROM location_mentions
   WHERE location_point IS NOT NULL
   ORDER BY distance_meters
   LIMIT 10;

4. Find locations within a bounding box:
   SELECT * FROM location_mentions
   WHERE ST_Within(
     location_point,
     ST_MakeEnvelope(-122.4, 47.5, -122.2, 47.7, 4326)
   );
';

EOF

echo "✅ PostGIS extension enabled and spatial data support added successfully!"
echo ""
echo "📊 Spatial capabilities now available:"
echo "   - PostGIS extension installed"
echo "   - location_point geometry column added to location_mentions"
echo "   - Automatic point generation from lat/lng via trigger"
echo "   - GIST spatial index for efficient queries"
echo "   - Helper views for spatial data access"
echo ""
echo "🔍 You can now perform:"
echo "   - Distance calculations"
echo "   - Proximity searches"
echo "   - Bounding box queries"
echo "   - Nearest neighbor searches"
echo ""
