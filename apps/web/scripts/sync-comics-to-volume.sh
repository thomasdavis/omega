#!/bin/bash
# Sync comics from Docker image to Railway persistent volume
# This ensures existing comics are available on /data/comics

set -e

echo "🎨 Checking for comics sync..."

SOURCE_DIR="/app/apps/web/public/comics"
TARGET_DIR="/data/comics"

# Check if /data is mounted (production environment)
if [ ! -d "/data" ]; then
  echo "ℹ️  /data volume not mounted (local dev), skipping sync"
  exit 0
fi

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Check if source directory exists and has comics
if [ ! -d "$SOURCE_DIR" ]; then
  echo "⚠️  Source directory $SOURCE_DIR not found, skipping sync"
  exit 0
fi

# Count comics in source
SOURCE_COUNT=$(find "$SOURCE_DIR" -name "comic_*.png" 2>/dev/null | wc -l || echo "0")
if [ "$SOURCE_COUNT" -eq 0 ]; then
  echo "ℹ️  No comics found in $SOURCE_DIR, skipping sync"
  exit 0
fi

# Count comics already in target
TARGET_COUNT=$(find "$TARGET_DIR" -name "comic_*.png" 2>/dev/null | wc -l || echo "0")

echo "📊 Found $SOURCE_COUNT comics in Docker image, $TARGET_COUNT in persistent volume"

# Copy comics that don't exist in target (don't overwrite existing)
COPIED=0
for comic in "$SOURCE_DIR"/comic_*.png; do
  if [ -f "$comic" ]; then
    filename=$(basename "$comic")
    if [ ! -f "$TARGET_DIR/$filename" ]; then
      cp "$comic" "$TARGET_DIR/$filename"
      COPIED=$((COPIED + 1))
    fi
  fi
done

if [ "$COPIED" -gt 0 ]; then
  echo "✅ Copied $COPIED comics to $TARGET_DIR"
else
  echo "✅ All comics already synced to $TARGET_DIR"
fi

# Final count
FINAL_COUNT=$(find "$TARGET_DIR" -name "comic_*.png" 2>/dev/null | wc -l || echo "0")
echo "📊 Persistent volume now has $FINAL_COUNT comics"
