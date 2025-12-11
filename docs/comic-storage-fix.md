# Comic Storage Fix

## Problem

Generated comics were not appearing on https://omegaai.dev/comics even though they were being successfully generated and tweeted by GitHub Actions.

### Root Cause

1. **GitHub Actions** generated comics and committed them to `apps/web/public/comics/` in the git repository
2. **Railway doesn't automatically rebuild** when new files are committed to the repo
3. **Docker images are immutable** - files added to git after the image is built are not included in the running container
4. Comics committed after the last Railway deployment were missing from the production container

## Solution

Use Railway's persistent volume (`/data/comics`) as the primary storage location for comics in production:

### What Changed

1. **API Endpoints Updated** (`apps/web/app/api/comics/`)
   - List endpoint: `route.ts` now reads from `/data/comics` in production
   - Serve endpoint: `[filename]/route.ts` now reads from `/data/comics` in production
   - Local development still uses `apps/web/public/comics`

2. **Storage Logic**
   - Production: Comics stored in `/data/comics` (persistent volume)
   - Development: Comics stored in `apps/web/public/comics` (git repository)
   - Both bot and web services already have `/data` volume mounted (see `railway.toml`)

3. **Migration Script** (`scripts/migrate-comics-to-volume.sh`)
   - One-time script to copy existing comics from git to persistent volume
   - Should be run on Railway after deployment

## Migration Steps

### 1. Deploy the Fix

The code changes are automatically deployed when merged to `main`.

### 2. Run Migration Script

After deployment, run this command to copy existing comics to the persistent volume:

```bash
railway run bash scripts/migrate-comics-to-volume.sh
```

This will:
- Copy all existing `comic_*.png` files from `apps/web/public/comics/` to `/data/comics/`
- Verify the migration was successful
- Report how many comics were migrated

### 3. Verify

Check that comics appear on https://omegaai.dev/comics

## How It Works Now

### Comic Generation Flow

1. **PR Merges** → GitHub Actions workflow triggers
2. **Comic Generated** → Gemini API creates comic image
3. **Saved to Storage**:
   - GitHub Actions: Saves to `apps/web/public/comics/` (for git history)
   - Production Bot: Saves to `/data/comics/` (persistent volume)
4. **Posted to Platforms**:
   - Discord: Posted to configured channel
   - Twitter: Posted to configured account (optional)
5. **Committed to Git**: Comic file committed to repository (backup)

### Comic Display Flow

1. **User visits** https://omegaai.dev/comics
2. **Frontend requests** `/api/comics` (list of all comics)
3. **API reads** from appropriate location:
   - Production: `/data/comics/`
   - Development: `apps/web/public/comics/`
4. **Comics displayed** in gallery view

## Benefits

✅ Comics appear immediately after generation (no need to rebuild)
✅ Persistent across deployments (stored in Railway volume)
✅ Git history preserved (comics still committed as backup)
✅ Same code works in both production and development
✅ No breaking changes to existing functionality

## Files Modified

- `apps/web/app/api/comics/route.ts` - List comics endpoint
- `apps/web/app/api/comics/[filename]/route.ts` - Serve comic endpoint
- `scripts/migrate-comics-to-volume.sh` - One-time migration script (new)
- `docs/comic-storage-fix.md` - This documentation (new)

## Related Files

- `packages/agent/src/utils/storage.ts` - Shared storage utility (unchanged)
- `packages/agent/src/services/geminiComicService.ts` - Comic generation service (unchanged)
- `.github/workflows/comic-generate.yml` - GitHub Actions workflow (unchanged)
- `railway.toml` - Bot service config (has `/data` mount)
- `apps/web/railway.toml` - Web service config (has `/data` mount)
