# Fix for Gemini Image Generation Tools (Issue #942)

## Problem

Gemini image generation tools (`generateComic`, `generateAnimeManga`) are failing due to a Prisma schema mismatch:

- **Prisma Schema** defines `avatarUrl` field in `user_profiles` model
- **Production Database** does NOT have `avatar_url` column
- **Result:** Prisma queries fail when trying to map the non-existent column

## Root Cause

When `prisma.userProfile.findUnique()` is called, Prisma expects ALL fields defined in the schema to exist in the database. Even though the Gemini tools don't explicitly use `avatarUrl`, the query fails because Prisma can't map the result object.

## Solution

Sync the Prisma schema with the actual production database schema:

### Option 1: Run Sync Script (Recommended)

```bash
# Using Railway CLI
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/sync-prisma-schema.sh'
```

### Option 2: Manual Sync

```bash
# Navigate to database package
cd packages/database

# Pull schema from production
export DATABASE_URL="postgresql://postgres:<password>@switchback.proxy.rlwy.net:11820/railway"
pnpm prisma db pull

# Generate Prisma client
pnpm prisma generate
```

## What This Does

1. **Introspects production database** - Detects which columns actually exist
2. **Updates schema.prisma** - Removes `avatarUrl` if column doesn't exist
3. **Regenerates Prisma client** - TypeScript types match actual database
4. **Fixes all queries** - No more mapping errors

## Affected Tools

### Fixed by This Change
- ✅ `generateComic` - Character-based comic generation
- ✅ `generateAnimeManga` - Anime manga page generation
- ✅ `generateUserImage` - Already works (no user profile dependency)
- ✅ All other tools that query `user_profiles`

### May Break (If avatarUrl is used elsewhere)
- ⚠️ `updateMyProfile` - Uses `avatarUrl` field (will need to be updated or migration run)

## Alternative: Add Missing Column

If `avatarUrl` is actually needed, run the migration instead:

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/add-user-profile-basic-fields.sh'
```

This adds:
- `avatar_url` (TEXT)
- `bio` (TEXT)
- `preferences` (JSONB)

## Verification

After syncing, verify the fix:

```bash
# Run type check
pnpm type-check

# Run build
pnpm build

# Check schema matches database
cd packages/database
pnpm prisma validate
```

## Implementation Notes

The Gemini tools use `ai_appearance_description` for character visuals, NOT `avatarUrl`:

```typescript
// packages/agent/src/lib/userAppearance.ts
export async function getUserCharacters(userIds: string[]): Promise<UserCharacter[]> {
  const userProfiles = await Promise.all(
    userIds.map(async (userId) => {
      const profile = await getUserProfile(userId);
      return {
        username: profile.username,
        appearance: profile.ai_appearance_description,  // ✅ Uses this
        // avatarUrl is ignored                        // ❌ Not used
      };
    })
  );
}
```

So removing `avatarUrl` from the schema won't affect Gemini tool functionality.

## References

- Issue #942 - Fix Gemini Image Generation Tools
- Issue #941 - Related avatar_url schema problem
- CLAUDE.md - Database migration guidelines
