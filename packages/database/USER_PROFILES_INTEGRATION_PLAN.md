# User Profiles Basic Fields Integration Plan

## Executive Summary

This document outlines the plan to integrate basic user-editable profile fields (`avatar_url`, `bio`, `preferences`) into the production user_profiles table. The migration is designed to be **zero-downtime** and **fully reversible**.

## Background

### Current State

The `user_profiles` table contains 120+ fields for psychological analysis, appearance tracking, and behavioral predictions. However, it lacks basic user-editable fields for:
- Profile pictures (`avatar_url`)
- User biographies (`bio`)
- User preferences/settings (`preferences`)

### Why This Matters

Several agent tools document support for these fields (e.g., `updateMyProfile.ts`) but they may not exist in the production database. This migration ensures the database schema matches the documented API.

### Previous Migrations

- ✅ **Phase 0**: Fixed ID auto-generation (`fix-user-profiles-id-generation.sh`)
- ✅ **Issue #927**: Resolved profile duplication bugs
- 🔄 **This Migration**: Add basic editable fields (Phase 1a)
- 📋 **Future**: JSONB normalization (Phase 2, planned)

## Migration Overview

### What Will Change

**New Columns:**
- `avatar_url` (TEXT, nullable) - URL to user's profile picture
- `bio` (TEXT, nullable) - User biography/description
- `preferences` (JSONB, nullable) - User preferences as JSON

**New Indexes:**
- `idx_user_profiles_preferences_gin` - GIN index on preferences for efficient JSONB queries
- `idx_user_profiles_avatar_url` - Standard B-tree index on avatar_url (partial, only for non-null values)

### What Won't Change

- No existing columns will be modified
- No data will be deleted
- No existing indexes will be dropped
- All current functionality remains intact

### Impact Assessment

**Risk Level:** ✅ **LOW**

- Migration is **additive only** (no deletions or modifications)
- Uses `IF NOT EXISTS` for full idempotency
- Can be rolled back by dropping columns
- Zero downtime (no table locks required for adding nullable columns)
- No application code changes required (fields are optional)

**Performance Impact:** ✅ **MINIMAL**

- Adding nullable columns with no default is nearly instant in PostgreSQL
- GIN index creation is non-blocking (can use `CREATE INDEX CONCURRENTLY` if needed)
- Index size impact: ~minimal (only profiles with preferences will be indexed)

## Pre-Migration Checklist

Before running the migration, complete these verification steps:

### 1. Verify Current Schema

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/verify-user-profiles-schema.sh'
```

**Expected Output:**
- ❌ MISSING for avatar_url, bio, preferences (if migration hasn't run)
- ✅ EXISTS for user_id, username, created_at, updated_at

### 2. Create Backup

```bash
# Full backup
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && pg_dump "$DATABASE_URL" > backup-user-profiles-$(date +%Y%m%d-%H%M%S).sql'

# Schema-only backup (faster)
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && pg_dump "$DATABASE_URL" --schema-only > schema-backup-$(date +%Y%m%d-%H%M%S).sql'
```

### 3. Test on Parallel Environment

Follow the [Parallel Testing Guide](./PARALLEL_TESTING_GUIDE.md) to test on a separate database first.

### 4. Review Migration Script

```bash
cat packages/database/scripts/ensure-user-profile-basic-fields.sh
```

Verify:
- Uses `IF NOT EXISTS` for all operations
- Handles missing DATABASE_URL gracefully
- Includes verification queries
- Has proper error handling (`set -e`)

## Migration Execution

### Step 1: Run Migration Script

```bash
# Run the migration on production
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/ensure-user-profile-basic-fields.sh'
```

**Expected Output:**
```
🔍 Checking current user_profiles schema...
[current fields listed]

🚀 Applying migration to add basic user-editable profile fields...
[SQL execution output]

✅ Migration completed successfully!

📊 Summary:
  - avatar_url: TEXT field for profile picture URLs
  - bio: TEXT field for user biography
  - preferences: JSONB field for user settings (with GIN index)
```

### Step 2: Verify Migration Success

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/verify-user-profiles-schema.sh'
```

**Expected Output:**
- ✅ EXISTS for all basic fields
- Indexes created successfully
- Statistics show 0 profiles with new fields (initially)

### Step 3: Update Prisma Schema

```bash
cd packages/database

# Pull latest schema from production database
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && pnpm prisma db pull'

# Generate Prisma client with new fields
pnpm prisma generate
```

### Step 4: Verify TypeScript Types

```bash
# Return to root
cd ../..

# Run type check to ensure no errors
pnpm type-check
```

**Expected Result:** No type errors (new fields are optional)

### Step 5: Commit Schema Changes

```bash
git add packages/database/prisma/schema.prisma
git commit -m "chore(database): add basic user profile fields (avatar_url, bio, preferences)

- Added avatar_url (TEXT) for profile pictures
- Added bio (TEXT) for user biographies
- Added preferences (JSONB) for user settings
- Created GIN index on preferences for efficient queries
- Created partial index on avatar_url for non-null values

Migration script: packages/database/scripts/ensure-user-profile-basic-fields.sh
Related issue: #949"
```

## Post-Migration Validation

### 1. Test Profile Updates

Using the bot or API, test updating a profile with new fields:

```typescript
// Example: Update a profile with new fields
import { updateUserProfile } from '@omega/database';

await updateUserProfile('123456789012345678', {
  avatar_url: 'https://example.com/avatar.png',
  bio: 'Software engineer and TypeScript enthusiast',
  preferences: {
    theme: 'dark',
    notifications: true,
    language: 'en'
  }
});
```

### 2. Verify Database Storage

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "SELECT user_id, username, avatar_url, bio, preferences FROM user_profiles WHERE avatar_url IS NOT NULL OR bio IS NOT NULL OR preferences IS NOT NULL LIMIT 5;"'
```

### 3. Test JSONB Queries

Verify the GIN index works for preferences queries:

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "EXPLAIN ANALYZE SELECT * FROM user_profiles WHERE preferences @> '\''{\\"theme\\": \\"dark\\"}'\''::jsonb;"'
```

**Expected:** Query plan should use `idx_user_profiles_preferences_gin` index

### 4. Monitor Application Logs

Check for any errors related to user profiles after deployment:

```bash
# If using Railway
railway logs --filter "user_profile"
```

### 5. Verify Agent Tools

Test the `updateMyProfile` tool through Discord:

```
@omega update my profile with avatar https://example.com/avatar.png and bio "I love coding"
```

## Rollback Procedure

If critical issues are discovered, you can rollback the migration.

### Rollback Script

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" << '\''EOF'\''
BEGIN;

-- Drop indexes first
DROP INDEX IF EXISTS idx_user_profiles_preferences_gin;
DROP INDEX IF EXISTS idx_user_profiles_avatar_url;

-- Drop columns (WARNING: This deletes data!)
ALTER TABLE user_profiles DROP COLUMN IF EXISTS preferences;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS bio;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS avatar_url;

-- Verify rollback
SELECT column_name FROM information_schema.columns
WHERE table_name = '\''user_profiles'\''
AND column_name IN ('\''avatar_url'\'', '\''bio'\'', '\''preferences'\'');

COMMIT;
EOF'
```

### After Rollback

1. Restore Prisma schema from backup
2. Regenerate Prisma client
3. Investigate the issue
4. Re-test on parallel environment before re-attempting

## Success Criteria

The migration is considered successful when:

- ✅ Migration script executes without errors
- ✅ Verification script shows all fields exist
- ✅ Prisma schema updated with new fields
- ✅ Type check passes
- ✅ Application starts without errors
- ✅ Users can update their profiles with new fields
- ✅ JSONB queries on preferences use the GIN index
- ✅ No performance degradation observed

## Timeline

**Estimated Duration:** 30 minutes

| Step | Duration | Can Run During Peak Hours? |
|------|----------|----------------------------|
| Pre-migration verification | 5 min | ✅ Yes (read-only) |
| Backup creation | 2 min | ✅ Yes (read-only) |
| Migration execution | 1 min | ✅ Yes (no locks) |
| Prisma schema update | 5 min | ✅ Yes |
| Post-migration validation | 15 min | ✅ Yes |
| **Total** | **~30 min** | **✅ Zero downtime** |

## Communication Plan

### Before Migration

- Notify team in Discord #development channel
- Post in #omega channel (informational)

### During Migration

- Keep team updated on progress
- Report any unexpected issues immediately

### After Migration

- Announce successful completion
- Share statistics (profiles updated, performance impact)
- Document any lessons learned

## Future Enhancements

After this migration is stable, consider:

1. **Add validation rules** - Character limits for bio, URL validation for avatar_url
2. **Add constraints** - Default values for preferences if needed
3. **Create UI** - Web dashboard for profile editing
4. **Add webhooks** - Notify when profiles are updated
5. **Phase 2 migration** - Normalize schema using JSONB (see USER_PROFILES_MIGRATION_PLAN.md)

## Related Documentation

- [PARALLEL_TESTING_GUIDE.md](./PARALLEL_TESTING_GUIDE.md) - How to test on separate database
- [CLAUDE.md](../../CLAUDE.md) - Database migration guidelines
- [USER_PROFILES_MIGRATION_PLAN.md](../../docs/USER_PROFILES_MIGRATION_PLAN.md) - Long-term strategy
- [MIGRATION.md](./MIGRATION.md) - General migration procedures

## Contacts

**Questions or Issues?**
- Create an issue in the repository
- Post in Discord #development channel
- Review existing migration documentation

---

**Last Updated:** 2026-01-26
**Status:** Ready for execution
**Related Issue:** #949
