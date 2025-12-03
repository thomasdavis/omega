#!/bin/bash
# Migration script to be run on Railway
# Run with: railway run bash migrate.sh (from packages/database directory)

set -e  # Exit on error

echo "🚀 SQLite to PostgreSQL Migration"
echo "=================================="
echo ""

# Phase 1: Setup PostgreSQL schema
echo "📋 Phase 1: Setting up PostgreSQL schema..."
node dist/postgres/migrations/runMigration.js
echo "✅ Phase 1 complete"
echo ""

# Phase 2: Export SQLite data
echo "📤 Phase 2: Exporting data from SQLite..."
node dist/migrations/exportFromSQLite.js
echo "✅ Phase 2 complete"
echo ""

# Phase 3: Import to PostgreSQL
echo "📥 Phase 3: Importing data to PostgreSQL..."
node dist/migrations/importToPostgres.js
echo "✅ Phase 3 complete"
echo ""

echo "🎉 Migration complete!"
echo ""
echo "Next steps:"
echo "1. Verify data integrity"
echo "2. Enable shadow writing: railway variables --set USE_POSTGRES_SHADOW=true"
echo "3. Monitor for 24-48 hours"
echo "4. Switch to PostgreSQL primary: railway variables --set USE_POSTGRES_PRIMARY=true"
