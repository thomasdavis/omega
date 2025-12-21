# Migration Required: Add avatar_url Column

## Issue
The `user_profiles` table is missing the `avatar_url` column, causing failures when users try to upload or update their profile pictures.

## Root Cause
The migration script `packages/database/scripts/add-user-profile-basic-fields.sh` exists and is correct, but it hasn't been executed on the production database yet.

## Solution
Run the existing migration script on production. The script is idempotent (uses `IF NOT EXISTS`) so it's safe to run multiple times.

### Option 1: Using GitHub Actions (Recommended)
1. Go to: https://github.com/thomasdavis/omega/actions/workflows/database-migrate.yml
2. Click "Run workflow"
3. Fill in:
   - `migration_script`: `add-user-profile-basic-fields.sh`
   - `dry_run`: `false`
4. Click "Run workflow"

### Option 2: Using Railway CLI
```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/add-user-profile-basic-fields.sh'
```

### Option 3: Direct SQL Execution
```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" << '\''EOF'\''
-- Add avatar_url column for user avatar/profile picture
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add bio column for user biography/description
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add preferences column for user preferences (JSONB for flexibility)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preferences JSONB;

-- Create index on preferences JSONB column for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferences_gin ON user_profiles USING GIN (preferences);

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = '\''user_profiles'\''
AND column_name IN ('\''avatar_url'\'', '\''bio'\'', '\''preferences'\'')
ORDER BY column_name;
EOF'
```

## What the Migration Does
- Adds `avatar_url` column (TEXT) - stores URL to user's profile picture
- Adds `bio` column (TEXT) - stores user biography/description
- Adds `preferences` column (JSONB) - stores user preferences as JSON
- Creates GIN index on `preferences` for efficient JSONB queries
- Uses `IF NOT EXISTS` for idempotent migrations (safe to run multiple times)

## Verification
After running the migration, verify it succeeded:

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '\''user_profiles'\'' AND column_name IN ('\''avatar_url'\'', '\''bio'\'', '\''preferences'\'');"'
```

Expected output:
```
 column_name | data_type
-------------+-----------
 avatar_url  | text
 bio         | text
 preferences | jsonb
```

## Files Involved
- **Migration Script**: `packages/database/scripts/add-user-profile-basic-fields.sh`
- **Prisma Schema**: `packages/database/prisma/schema.prisma:209` (already defines avatarUrl)
- **Application Code**: `packages/agent/src/tools/updateMyProfile.ts:71` (uses avatar_url)

## Next Steps After Migration
1. Update Prisma client to match production schema:
   ```bash
   cd packages/database
   pnpm prisma db pull
   pnpm prisma generate
   ```

2. Verify no schema drift:
   ```bash
   git diff prisma/schema.prisma
   ```
   Should show no changes if schema was already correct.

3. Test the fix by trying to update a user profile with an avatar URL.
