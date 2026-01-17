#!/bin/bash
# Sync Prisma Schema from Production Database
# This script pulls the actual database schema and regenerates the Prisma client
# Use this when the database schema has changed or when there's a mismatch

set -e

echo "🔄 Syncing Prisma schema from production database..."
echo ""

# Check for required environment variables
if [ -z "$DATABASE_URL" ] && [ -z "$DATABASE_PUBLIC_URL" ]; then
  echo "❌ Error: DATABASE_URL or DATABASE_PUBLIC_URL must be set"
  echo ""
  echo "For local development:"
  echo "  export DATABASE_URL='postgresql://postgres:<password>@switchback.proxy.rlwy.net:11820/railway'"
  echo ""
  echo "For Railway environment:"
  echo "  railway run bash -c 'export DATABASE_URL=\$DATABASE_PUBLIC_URL && bash packages/database/scripts/sync-prisma-schema.sh'"
  exit 1
fi

# Use DATABASE_PUBLIC_URL if available (Railway), otherwise DATABASE_URL
DB_URL="${DATABASE_PUBLIC_URL:-$DATABASE_URL}"

echo "📊 Database: ${DB_URL%%@*}@***"  # Hide password in logs
echo ""

# Navigate to database package
cd "$(dirname "$0")/.."
echo "📁 Working directory: $(pwd)"
echo ""

# Pull schema from production database
echo "🔍 Pulling schema from production database..."
DATABASE_URL="$DB_URL" pnpm prisma db pull

echo ""
echo "✅ Schema pulled successfully!"
echo ""

# Generate Prisma client
echo "🔨 Generating Prisma client..."
DATABASE_URL="$DB_URL" pnpm prisma generate

echo ""
echo "✅ Prisma client generated successfully!"
echo ""

# Show summary of changes
echo "📋 Schema Sync Summary:"
echo "   - Prisma schema updated to match production database"
echo "   - Prisma client regenerated with latest schema"
echo "   - TypeScript types updated"
echo ""
echo "🎉 Sync complete! Your Prisma schema is now in sync with production."
echo ""
echo "⚠️  IMPORTANT: Review the changes to schema.prisma and commit them if correct."
echo "   Any fields that don't exist in production have been removed from the schema."
