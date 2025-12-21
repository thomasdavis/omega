# Deployment Guide: User Profile Fields Migration

This guide explains how to deploy the user profile fields (avatar_url, bio, preferences) to the production database.

## Overview

This migration adds three new columns to the `user_profiles` table:
- `avatar_url` (TEXT) - For storing user avatar/profile picture URLs
- `bio` (TEXT) - For user biography/description
- `preferences` (JSONB) - For flexible user preferences storage

It also creates a GIN index on the `preferences` column for efficient querying.

## Prerequisites

- Railway CLI installed and authenticated
- Access to the production database
- Database connection string available via `DATABASE_PUBLIC_URL` environment variable

## Deployment Options

### Option 1: Automated Deployment (Recommended)

Use the wrapper script that runs migration + verification:

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/deploy-user-profile-fields.sh'
```

This will:
1. Run the migration to add columns and index
2. Verify all changes were applied successfully
3. Display a summary of changes
4. Exit with error code if anything fails

### Option 2: Manual Step-by-Step

If you prefer to run each step manually:

```bash
# Step 1: Run migration
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/add-user-profile-basic-fields.sh'

# Step 2: Verify changes
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/verify-user-profile-columns.sh'
```

### Option 3: Direct SQL Execution

For advanced users who want to run SQL directly:

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" << '\''EOF'\''
-- Add columns
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preferences JSONB;

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferences_gin ON user_profiles USING GIN (preferences);

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = '\''user_profiles'\''
AND column_name IN ('\''avatar_url'\'', '\''bio'\'', '\''preferences'\'');
EOF'
```

## Post-Deployment Steps

After successfully deploying to production:

### 1. Sync Prisma Schema

Pull the updated schema from production:

```bash
cd packages/database
export DATABASE_URL="postgresql://postgres:<password>@switchback.proxy.rlwy.net:11820/railway"
pnpm prisma db pull
```

### 2. Regenerate Prisma Client

```bash
pnpm prisma generate
```

### 3. Verify in Application

Test that the new fields are accessible:

```typescript
import { prisma } from '@omega/database';

// Update user profile
await prisma.userProfiles.update({
  where: { userId: 'some-user-id' },
  data: {
    avatarUrl: 'https://example.com/avatar.jpg',
    bio: 'Software engineer and coffee enthusiast',
    preferences: {
      theme: 'dark',
      notifications: true
    }
  }
});
```

## Verification

To verify the migration was successful:

```bash
# Check columns exist
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '\''user_profiles'\'' AND column_name IN ('\''avatar_url'\'', '\''bio'\'', '\''preferences'\'') ORDER BY column_name;"'

# Check index exists
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = '\''user_profiles'\'' AND indexname = '\''idx_user_profiles_preferences_gin'\'';"'
```

## Rollback Procedure

If you need to rollback this migration:

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" << '\''EOF'\''
-- Drop index first
DROP INDEX IF EXISTS idx_user_profiles_preferences_gin;

-- Drop columns
ALTER TABLE user_profiles DROP COLUMN IF EXISTS preferences;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS bio;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS avatar_url;
EOF'
```

**Warning:** Rollback will delete all data in these columns. Make sure to backup data if needed.

## Troubleshooting

### Issue: "hostname resolution error"
**Solution:** Make sure you're using `DATABASE_PUBLIC_URL` (external proxy) instead of `DATABASE_URL` (internal hostname):
```bash
export DATABASE_URL=$DATABASE_PUBLIC_URL
```

### Issue: Verification fails after migration
**Possible causes:**
- Migration didn't complete successfully
- Database connection interrupted
- Permissions issue

**Solution:** Check the migration logs and re-run if needed. The migration uses `IF NOT EXISTS`, so it's safe to run multiple times.

### Issue: Prisma schema out of sync
**Solution:** Always run `prisma db pull` after database schema changes:
```bash
cd packages/database
export DATABASE_URL=$DATABASE_PUBLIC_URL
pnpm prisma db pull
pnpm prisma generate
```

## Migration Scripts Reference

- **add-user-profile-basic-fields.sh** - Main migration script that adds columns and index
- **verify-user-profile-columns.sh** - Verification script that checks all changes were applied
- **deploy-user-profile-fields.sh** - Wrapper that runs migration + verification in sequence

## Related

- Original issue: #907
- CLAUDE.md - Main database configuration documentation
- Database migration workflow: `.github/workflows/database-migrate.yml`
