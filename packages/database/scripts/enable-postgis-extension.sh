#!/bin/bash
# Enable PostGIS extension for spatial queries
# Run with: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/enable-postgis-extension.sh'

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🌍 Enabling PostGIS extension for spatial queries..."

psql "$DB_URL" << 'EOF'
-- Enable PostGIS extension (idempotent operation)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify PostGIS installation
SELECT
  name,
  default_version,
  installed_version,
  comment
FROM pg_available_extensions
WHERE name = 'postgis';

-- Display PostGIS version
SELECT PostGIS_Version();

-- List all spatial functions (sample)
SELECT
  proname AS function_name,
  pg_catalog.pg_get_function_result(oid) AS return_type
FROM pg_proc
WHERE proname LIKE 'ST_%'
ORDER BY proname
LIMIT 10;

EOF

echo "✅ PostGIS extension enabled successfully!"
echo "📍 Spatial data types (geometry, geography) are now available"
echo "🗺️  Spatial functions (ST_*) are ready to use"
