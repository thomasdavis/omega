# Parallel Database Testing Guide

## Overview

This guide explains how to test database migrations and schema changes on a separate PostgreSQL instance before applying them to production. This approach minimizes risk and allows for thorough validation.

## Prerequisites

- Railway CLI installed (`npm install -g @railway/cli`)
- Access to Railway project
- PostgreSQL client tools (`psql`)

## Option 1: Railway Isolated Environment

Railway allows you to create isolated environments for testing database changes.

### Step 1: Create a Test Environment

```bash
# List current environments
railway environments

# Create a new test environment
railway environment create user-profiles-test

# Switch to test environment
railway environment use user-profiles-test
```

### Step 2: Provision a Test Database

In the test environment, Railway will create a separate PostgreSQL instance with its own connection string.

```bash
# Link to the test database service
railway link

# Get the test database URL
railway run bash -c 'echo $DATABASE_PUBLIC_URL'
```

### Step 3: Copy Production Schema to Test

```bash
# From production, export schema
railway environment use production
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && pg_dump "$DATABASE_URL" --schema-only > schema.sql'

# Switch to test environment and import
railway environment use user-profiles-test
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" < schema.sql'
```

### Step 4: Run Migration on Test Database

```bash
# Run the migration script on test environment
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/ensure-user-profile-basic-fields.sh'
```

### Step 5: Verify Migration

```bash
# Run verification script
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/verify-user-profiles-schema.sh'
```

### Step 6: Test Application Code

Update your `.env` file to point to the test database:

```env
DATABASE_URL=<test-database-url-from-step-2>
```

Run your application and test the user profile functionality:

```bash
# Install dependencies
pnpm install

# Update Prisma schema from test database
cd packages/database
pnpm prisma db pull
pnpm prisma generate

# Run type checks
cd ../..
pnpm type-check

# Run tests
pnpm test

# Start application locally
pnpm dev
```

### Step 7: Apply to Production (If Successful)

Once testing is complete and successful:

```bash
# Switch back to production
railway environment use production

# Run the migration
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/ensure-user-profile-basic-fields.sh'

# Update Prisma schema from production
cd packages/database
pnpm prisma db pull
pnpm prisma generate

# Commit the updated schema
git add prisma/schema.prisma
git commit -m "chore: update Prisma schema after user profiles migration"
```

## Option 2: Local PostgreSQL Instance

For faster iteration during development, you can use a local PostgreSQL instance.

### Step 1: Start Local PostgreSQL

Using Docker:

```bash
docker run --name omega-test-db \
  -e POSTGRES_PASSWORD=testpass \
  -e POSTGRES_DB=omega_test \
  -p 5433:5432 \
  -d postgres:15
```

### Step 2: Export Production Schema

```bash
# Export from production
railway environment use production
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && pg_dump "$DATABASE_URL" --schema-only > schema.sql'

# Import to local
psql postgresql://postgres:testpass@localhost:5433/omega_test < schema.sql
```

### Step 3: Run Migration on Local Database

```bash
# Set local database URL
export DATABASE_URL="postgresql://postgres:testpass@localhost:5433/omega_test"

# Run migration
bash packages/database/scripts/ensure-user-profile-basic-fields.sh
```

### Step 4: Test Locally

```bash
# Update .env.local
echo "DATABASE_URL=postgresql://postgres:testpass@localhost:5433/omega_test" > .env.local

# Update Prisma schema
cd packages/database
pnpm prisma db pull
pnpm prisma generate

# Run application
cd ../..
pnpm dev
```

## Option 3: Dry Run with Transaction Rollback

For quick validation without creating a separate environment:

### Create a Dry-Run Migration Script

```bash
#!/bin/bash
# Dry-run script that executes in a transaction and rolls back

set -e

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🔍 DRY RUN MODE - Changes will be rolled back"
echo ""

psql "$DB_URL" << 'EOF'
BEGIN;

-- Add columns
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preferences JSONB;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferences_gin ON user_profiles USING GIN (preferences);
CREATE INDEX IF NOT EXISTS idx_user_profiles_avatar_url ON user_profiles (avatar_url) WHERE avatar_url IS NOT NULL;

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('avatar_url', 'bio', 'preferences');

-- Rollback instead of commit
ROLLBACK;

SELECT 'DRY RUN COMPLETE - All changes rolled back' AS status;
EOF

echo ""
echo "✅ Dry run completed successfully - no changes persisted"
```

## Best Practices

### 1. Always Verify First

Before running migrations, check the current state:

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/verify-user-profiles-schema.sh'
```

### 2. Use Idempotent Migrations

All migration scripts should use `IF NOT EXISTS` / `IF EXISTS` to ensure they can be run multiple times safely.

### 3. Backup Before Major Changes

```bash
# Create a backup
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d-%H%M%S).sql'
```

### 4. Test with Real Data Patterns

When testing locally, consider importing a subset of production data:

```bash
# Export sample data (first 100 rows)
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "COPY (SELECT * FROM user_profiles LIMIT 100) TO STDOUT" > sample-data.csv'

# Import to test database
psql $TEST_DATABASE_URL -c "\COPY user_profiles FROM 'sample-data.csv'"
```

### 5. Monitor Performance

After applying migrations, monitor query performance:

```bash
# Check index usage
psql "$DATABASE_URL" << 'EOF'
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'user_profiles'
ORDER BY idx_scan DESC;
EOF
```

## Rollback Procedures

If issues are discovered after migration:

### Rollback Basic Fields Migration

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" << '\''EOF'\''
-- Drop indexes
DROP INDEX IF EXISTS idx_user_profiles_preferences_gin;
DROP INDEX IF EXISTS idx_user_profiles_avatar_url;

-- Drop columns
ALTER TABLE user_profiles DROP COLUMN IF EXISTS avatar_url;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS bio;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS preferences;

-- Verify
SELECT column_name FROM information_schema.columns
WHERE table_name = '\''user_profiles'\''
AND column_name IN ('\''avatar_url'\'', '\''bio'\'', '\''preferences'\'');
EOF'
```

**Note:** Dropping columns will permanently delete data. Only rollback if absolutely necessary and you have backups.

## Cleanup

After successful production deployment:

```bash
# Delete test environment (if using Railway isolated environment)
railway environment use user-profiles-test
railway environment delete

# Remove local test database (if using Docker)
docker stop omega-test-db
docker rm omega-test-db
```

## Troubleshooting

### Issue: Migration script fails with "permission denied"

**Solution:** Ensure you're using the correct database URL with proper credentials:

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/ensure-user-profile-basic-fields.sh'
```

### Issue: Prisma schema pull fails

**Solution:** Ensure database URL is set correctly:

```bash
cd packages/database
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && pnpm prisma db pull'
```

### Issue: Type check fails after schema update

**Solution:** Regenerate Prisma client:

```bash
cd packages/database
pnpm prisma generate
cd ../..
pnpm type-check
```

## Related Documentation

- [CLAUDE.md](../../CLAUDE.md) - Database configuration and migration guidelines
- [USER_PROFILES_MIGRATION_PLAN.md](../../docs/USER_PROFILES_MIGRATION_PLAN.md) - Long-term migration strategy
- [MIGRATION.md](./MIGRATION.md) - General migration procedures
