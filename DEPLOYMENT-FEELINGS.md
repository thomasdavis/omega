# User Feelings Tracking - Deployment Guide

## Pre-Deployment Checklist

- [x] Database schema designed and Prisma model created
- [x] Migration scripts created (SQL and shell)
- [x] CRUD tools implemented (create, list, get, update, delete)
- [x] Analytics tool implemented
- [x] UI components created (chart, timeline, dashboard)
- [x] Tools exported from database package
- [x] UI components exported from UI package
- [x] Tools registered in toolRegistry metadata
- [ ] Database migration deployed to Railway
- [ ] Prisma client regenerated
- [ ] Type-check passed
- [ ] Build successful
- [ ] Manual testing completed

## Deployment Steps

### Step 1: Deploy Database Migration

**Option A: Using Railway CLI (Recommended)**

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-user-feelings-table.sh'
```

**Option B: Using Direct SQL**

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" < packages/database/scripts/create-user-feelings-table.sql'
```

**Verify the table was created:**

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = '\''public'\'' AND table_name = '\''user_feelings'\'';"'
```

### Step 2: Update Prisma Client

```bash
cd packages/database
export DATABASE_URL="postgresql://postgres:<password>@switchback.proxy.rlwy.net:11820/railway"

# Pull the schema from production
pnpm prisma db pull

# Generate the Prisma client
pnpm prisma generate
```

### Step 3: Run Type Checks

```bash
# From project root
pnpm type-check
```

If type errors occur:
- Check that Prisma client was regenerated
- Verify all imports use correct paths (.js extensions)
- Check that all exported types match

### Step 4: Build the Project

```bash
pnpm build
```

### Step 5: Test the Tools

After deployment, test each tool:

1. **createFeeling**: Log a test feeling
   ```
   User: "I'm feeling happy, intensity 8"
   ```

2. **listFeelings**: Query feelings
   ```
   User: "Show me my feelings"
   ```

3. **analyzeFeelings**: Generate insights
   ```
   User: "Analyze my mood trends"
   ```

4. **updateFeeling**: Modify an entry
   ```
   User: "Update that feeling to intensity 9"
   ```

5. **deleteFeeling**: Remove an entry
   ```
   User: "Delete that feeling entry"
   ```

### Step 6: Deploy to Production

```bash
# Commit changes
git add .
git commit -m "feat: add user feelings tracking database and UI

- Add user_feelings table with comprehensive schema
- Implement 6 CRUD tools for feelings management
- Create analytics tool for mood trend analysis
- Build UI components: FeelingsChart, FeelingsTimeline, FeelingsDashboard
- Register tools in BM25 search metadata
- Add deployment scripts and documentation"

# Push to remote
git push origin <branch-name>
```

## Files Modified/Created

### Database Package (`packages/database/`)

**Modified:**
- `prisma/schema.prisma` - Added UserFeeling model
- `src/postgres/tools/index.ts` - Exported new tools

**Created:**
- `scripts/create-user-feelings-table.sh` - Shell migration script
- `scripts/create-user-feelings-table.sql` - SQL migration script
- `src/postgres/tools/userFeelings/createFeeling.ts`
- `src/postgres/tools/userFeelings/listFeelings.ts`
- `src/postgres/tools/userFeelings/getFeeling.ts`
- `src/postgres/tools/userFeelings/updateFeeling.ts`
- `src/postgres/tools/userFeelings/deleteFeeling.ts`
- `src/postgres/tools/userFeelings/analyzeFeelings.ts`
- `src/postgres/tools/userFeelings/index.ts`
- `src/postgres/tools/userFeelings/README.md`

### Agent Package (`packages/agent/`)

**Modified:**
- `src/toolRegistry/metadata.ts` - Added metadata for 6 new tools

### UI Package (`packages/ui/`)

**Modified:**
- `src/index.ts` - Exported new components

**Created:**
- `src/components/data-display/FeelingsChart.tsx`
- `src/components/data-display/FeelingsTimeline.tsx`
- `src/components/data-display/FeelingsDashboard.tsx`

### Documentation

**Created:**
- `DEPLOYMENT-FEELINGS.md` - This file

## Troubleshooting

### Prisma Client Errors

If you see errors like "Property 'userFeeling' does not exist on type 'PrismaClient'":

1. Make sure the migration was deployed
2. Run `pnpm prisma db pull` to sync schema
3. Run `pnpm prisma generate` to regenerate client
4. Restart your development server

### Database Connection Issues

If you can't connect to the database:

1. Verify DATABASE_URL is set correctly
2. Use DATABASE_PUBLIC_URL for Railway connections
3. Check that the TCP proxy (switchback.proxy.rlwy.net:11820) is accessible

### Type Check Failures

Common issues:
- Missing `.js` extensions in imports
- Prisma client not regenerated
- React type definitions missing

## Post-Deployment Validation

1. Check that the `user_feelings` table exists in production
2. Verify all 6 tools are registered and callable
3. Test creating, reading, updating, and deleting feelings
4. Confirm analytics tool returns correct insights
5. Test UI components render correctly
6. Monitor for any runtime errors in production logs

## Rollback Procedure

If issues occur, you can rollback:

```bash
# Drop the table
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "DROP TABLE IF EXISTS user_feelings;"'

# Revert code changes
git revert <commit-hash>
```

## Success Criteria

- ✅ Database table created with all fields and indexes
- ✅ All 6 tools functional and tested
- ✅ UI components render without errors
- ✅ Type-check passes
- ✅ Build succeeds
- ✅ Tools discoverable via BM25 search
- ✅ No breaking changes to existing functionality
