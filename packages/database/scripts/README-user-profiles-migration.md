# User Profiles ID Auto-Generation Migration

## Overview

This migration fixes the `user_profiles` table to auto-generate IDs, preventing insert failures caused by missing or null IDs.

## What This Migration Does

1. Adds `DEFAULT gen_random_uuid()::text` to the `id` column
2. Enables automatic ID generation when inserting new user profiles
3. Maintains full backward compatibility with existing code

## Running the Migration

### Option 1: Using Railway CLI (Recommended)

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/fix-user-profiles-id-generation.sh'
```

### Option 2: Direct psql (if you have DATABASE_URL)

```bash
export DATABASE_URL="postgresql://postgres:<password>@switchback.proxy.rlwy.net:11820/railway"
bash packages/database/scripts/fix-user-profiles-id-generation.sh
```

### Option 3: Using GitHub Actions Workflow

1. Go to Actions → "Database - Run Migrations"
2. Click "Run workflow"
3. Enter migration script path: `packages/database/scripts/fix-user-profiles-id-generation.sh`
4. Run workflow

## After Migration

### 1. Update Prisma Schema

The Prisma schema needs to be updated to reflect the database changes:

```bash
cd packages/database
pnpm prisma db pull
pnpm prisma generate
```

### 2. Verify the Change

You can verify the migration was successful by inspecting the schema:

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = '\''user_profiles'\'' AND column_name = '\''id'\'';"'
```

Expected output:
```
 column_name | data_type |       column_default
-------------+-----------+-----------------------------
 id          | text      | (gen_random_uuid())::text
```

### 3. Test Insert Without ID

You can test that inserts now work without specifying an ID:

```javascript
// This now works - ID is auto-generated
const profile = await prisma.userProfile.create({
  data: {
    userId: "123456789012345678",
    username: "testuser",
    firstSeenAt: BigInt(Math.floor(Date.now() / 1000)),
    lastInteractionAt: BigInt(Math.floor(Date.now() / 1000)),
  },
});
console.log("Generated ID:", profile.id);
```

## Code Changes

The application code in `packages/database/src/postgres/userProfileService.ts` has been updated to leverage auto-generated IDs. The changes are backward compatible - if the migration hasn't run yet, the code will still work (though it won't benefit from auto-generation).

## Rollback

If you need to rollback this migration:

```sql
ALTER TABLE user_profiles ALTER COLUMN id DROP DEFAULT;
```

## Related Documentation

- Full migration plan: `docs/USER_PROFILES_MIGRATION_PLAN.md`
- Issue: #927
- CLAUDE.md database guidelines

## Next Steps

This is Phase 1 of a two-phase migration. Phase 2 will normalize the schema using JSONB to group related columns. See `docs/USER_PROFILES_MIGRATION_PLAN.md` for details.
