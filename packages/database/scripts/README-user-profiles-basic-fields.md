# User Profiles Basic Fields Migration

## Quick Start

This migration adds basic user-editable fields to the `user_profiles` table.

### TL;DR - Run This

```bash
# 1. Verify current state
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/verify-user-profiles-schema.sh'

# 2. Run migration (idempotent, safe to run multiple times)
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/ensure-user-profile-basic-fields.sh'

# 3. Update Prisma schema
cd packages/database
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && pnpm prisma db pull'
pnpm prisma generate

# 4. Type check
cd ../..
pnpm type-check
```

## What This Migration Does

Adds three new columns to `user_profiles`:

| Column | Type | Purpose | Nullable |
|--------|------|---------|----------|
| `avatar_url` | TEXT | User profile picture URL | Yes |
| `bio` | TEXT | User biography/description | Yes |
| `preferences` | JSONB | User settings/preferences | Yes |

**Indexes Created:**
- `idx_user_profiles_preferences_gin` - GIN index for efficient JSONB queries
- `idx_user_profiles_avatar_url` - B-tree index for avatar lookups (partial, non-null only)

## Files in This Migration

### Migration Scripts

1. **`ensure-user-profile-basic-fields.sh`** - Main migration script
   - Adds the three columns if they don't exist
   - Creates indexes for efficient queries
   - Shows before/after schema comparison
   - Fully idempotent (safe to run multiple times)

2. **`verify-user-profiles-schema.sh`** - Verification script
   - Read-only diagnostic tool
   - Checks for required fields
   - Shows index status
   - Reports usage statistics

### Documentation

1. **`../PARALLEL_TESTING_GUIDE.md`** - How to test on separate database
   - Railway isolated environments
   - Local PostgreSQL setup
   - Dry-run procedures

2. **`../USER_PROFILES_INTEGRATION_PLAN.md`** - Production deployment plan
   - Pre-migration checklist
   - Step-by-step execution guide
   - Rollback procedures
   - Success criteria

## Usage Examples

### Verify Before Migration

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/verify-user-profiles-schema.sh'
```

**Expected Output (before migration):**
```
📊 Checking for basic user-editable fields...

 field_name   |   status
--------------+-----------
 user_id      | ✅ EXISTS
 username     | ✅ EXISTS
 avatar_url   | ❌ MISSING
 bio          | ❌ MISSING
 preferences  | ❌ MISSING
 created_at   | ✅ EXISTS
 updated_at   | ✅ EXISTS
```

### Run Migration

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/ensure-user-profile-basic-fields.sh'
```

**Expected Output:**
```
🔍 Checking current user_profiles schema...
[shows current fields]

🚀 Applying migration to add basic user-editable profile fields...

 column_name |  data_type  | is_nullable | column_default
-------------+-------------+-------------+----------------
 avatar_url  | text        | YES         |
 bio         | text        | YES         |
 preferences | jsonb       | YES         |

✅ Migration completed successfully!
```

### Verify After Migration

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/verify-user-profiles-schema.sh'
```

**Expected Output (after migration):**
```
📊 Checking for basic user-editable fields...

 field_name   |   status
--------------+-----------
 user_id      | ✅ EXISTS
 username     | ✅ EXISTS
 avatar_url   | ✅ EXISTS
 bio          | ✅ EXISTS
 preferences  | ✅ EXISTS
 created_at   | ✅ EXISTS
 updated_at   | ✅ EXISTS
```

## Testing on Separate Database

Before running on production, test on a parallel database:

```bash
# Option 1: Railway isolated environment
railway environment create user-profiles-test
railway environment use user-profiles-test
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/ensure-user-profile-basic-fields.sh'

# Option 2: Local PostgreSQL
docker run --name test-db -e POSTGRES_PASSWORD=test -p 5433:5432 -d postgres:15
export DATABASE_URL="postgresql://postgres:test@localhost:5433/postgres"
bash packages/database/scripts/ensure-user-profile-basic-fields.sh
```

See [PARALLEL_TESTING_GUIDE.md](../PARALLEL_TESTING_GUIDE.md) for detailed instructions.

## Using the New Fields

### TypeScript Example

```typescript
import { updateUserProfile, getUserProfile } from '@omega/database';

// Update a profile
await updateUserProfile('123456789012345678', {
  avatar_url: 'https://cdn.example.com/avatars/user123.png',
  bio: 'Full-stack developer passionate about TypeScript and AI',
  preferences: {
    theme: 'dark',
    notifications: {
      email: true,
      push: false
    },
    language: 'en'
  }
});

// Query with JSONB
const darkThemeUsers = await prisma.userProfile.findMany({
  where: {
    preferences: {
      path: ['theme'],
      equals: 'dark'
    }
  }
});
```

### SQL Example

```sql
-- Update a profile
UPDATE user_profiles
SET
  avatar_url = 'https://example.com/avatar.png',
  bio = 'I love TypeScript!',
  preferences = '{"theme": "dark", "language": "en"}'::jsonb
WHERE user_id = '123456789012345678';

-- Query users with dark theme preference
SELECT user_id, username, preferences
FROM user_profiles
WHERE preferences @> '{"theme": "dark"}'::jsonb;

-- Query users with email notifications enabled
SELECT user_id, username
FROM user_profiles
WHERE preferences @> '{"notifications": {"email": true}}'::jsonb;
```

## Rollback

If you need to remove the new fields:

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" << '\''EOF'\''
-- Drop indexes
DROP INDEX IF EXISTS idx_user_profiles_preferences_gin;
DROP INDEX IF EXISTS idx_user_profiles_avatar_url;

-- Drop columns (WARNING: Deletes data!)
ALTER TABLE user_profiles DROP COLUMN IF EXISTS preferences;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS bio;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS avatar_url;
EOF'
```

**Note:** Only rollback if absolutely necessary. Dropping columns permanently deletes data.

## Troubleshooting

### Migration script fails with "permission denied"

**Cause:** Database URL not set or incorrect

**Solution:**
```bash
# Ensure you're using DATABASE_PUBLIC_URL
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/ensure-user-profile-basic-fields.sh'
```

### Fields show as "EXISTS" but not in Prisma schema

**Cause:** Prisma schema not pulled from database

**Solution:**
```bash
cd packages/database
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && pnpm prisma db pull'
pnpm prisma generate
```

### Type errors after migration

**Cause:** Prisma client not regenerated

**Solution:**
```bash
cd packages/database
pnpm prisma generate
cd ../..
pnpm type-check
```

## Related Files

- Previous migration: `add-user-profile-basic-fields.sh` (older version, use `ensure-user-profile-basic-fields.sh` instead)
- Previous documentation: `README-user-profiles-migration.md` (for ID generation fix)
- Integration plan: `../USER_PROFILES_INTEGRATION_PLAN.md`
- Testing guide: `../PARALLEL_TESTING_GUIDE.md`

## Migration History

| Date | Migration | Status |
|------|-----------|--------|
| 2024-12 | ID auto-generation (`fix-user-profiles-id-generation.sh`) | ✅ Complete |
| 2025-01 | Basic fields (`ensure-user-profile-basic-fields.sh`) | 🔄 This migration |
| Future | JSONB normalization (Phase 2) | 📋 Planned |

## Questions?

See:
- [USER_PROFILES_INTEGRATION_PLAN.md](../USER_PROFILES_INTEGRATION_PLAN.md) - Full deployment guide
- [PARALLEL_TESTING_GUIDE.md](../PARALLEL_TESTING_GUIDE.md) - Testing procedures
- [CLAUDE.md](../../../CLAUDE.md) - General database guidelines
