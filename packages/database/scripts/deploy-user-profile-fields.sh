#!/bin/bash
# Deploy user profile fields (avatar_url, bio, preferences) to production
# This script runs the migration and then verifies the changes
# Usage: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/deploy-user-profile-fields.sh'

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starting deployment of user profile fields..."
echo "================================================"
echo ""

# Step 1: Run migration
echo "📝 Step 1: Running migration to add columns..."
bash "$SCRIPT_DIR/add-user-profile-basic-fields.sh"

if [ $? -ne 0 ]; then
  echo "❌ Migration failed! Stopping deployment."
  exit 1
fi

echo ""
echo "================================================"
echo ""

# Step 2: Run verification
echo "✅ Step 2: Verifying migration was successful..."
bash "$SCRIPT_DIR/verify-user-profile-columns.sh"

if [ $? -ne 0 ]; then
  echo "❌ Verification failed! Migration may not have completed successfully."
  exit 1
fi

echo ""
echo "================================================"
echo "🎉 Deployment completed successfully!"
echo ""
echo "Summary:"
echo "- Added avatar_url column (TEXT)"
echo "- Added bio column (TEXT)"
echo "- Added preferences column (JSONB)"
echo "- Created GIN index on preferences column"
echo ""
echo "Next steps:"
echo "- Run 'cd packages/database && pnpm prisma db pull' to sync Prisma schema"
echo "- Run 'pnpm prisma generate' to update Prisma client"
