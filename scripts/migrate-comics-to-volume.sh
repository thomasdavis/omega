#!/bin/bash
#
# Migrate Comics to Persistent Volume
#
# This script copies existing comics from the git repository to the Railway
# persistent volume at /data/comics. This is a one-time migration needed
# because comics were previously committed to git but Railway doesn't rebuild
# when new files are committed.
#
# Usage (on Railway):
#   railway run bash scripts/migrate-comics-to-volume.sh

set -e

echo "🎨 Comics Migration to Persistent Volume"
echo "========================================="
echo ""

# Source directory (in git repository)
SOURCE_DIR="apps/web/public/comics"

# Target directory (persistent volume)
TARGET_DIR="/data/comics"

# Check if we're in production with /data volume
if [ ! -d "/data" ]; then
  echo "⚠️  /data volume not found - this script should only run on Railway"
  echo "   For local development, comics are already in the correct location."
  exit 0
fi

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
  echo "❌ Source directory not found: $SOURCE_DIR"
  exit 1
fi

# Count comics in source
COMIC_COUNT=$(find "$SOURCE_DIR" -name "comic_*.png" -type f | wc -l)

echo "📁 Source: $SOURCE_DIR"
echo "📁 Target: $TARGET_DIR"
echo "📊 Found $COMIC_COUNT comics to migrate"
echo ""

if [ "$COMIC_COUNT" -eq 0 ]; then
  echo "⚠️  No comics found in source directory"
  exit 0
fi

# Copy comics to persistent volume
echo "🔄 Copying comics to persistent volume..."
cp -v "$SOURCE_DIR"/comic_*.png "$TARGET_DIR/" || true

# Verify migration
MIGRATED_COUNT=$(find "$TARGET_DIR" -name "comic_*.png" -type f | wc -l)

echo ""
echo "✅ Migration complete!"
echo "📊 Comics in persistent volume: $MIGRATED_COUNT"
echo ""

# List migrated comics
echo "📋 Migrated comics:"
ls -lh "$TARGET_DIR"/comic_*.png | tail -10

echo ""
echo "🎉 Comics are now stored in $TARGET_DIR"
echo "   Future comics will be generated directly to this location."
