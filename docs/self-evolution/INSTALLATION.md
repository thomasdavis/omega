# Self-Evolution v0 Installation Guide

## Overview
This guide walks through the complete installation process for the Self-Evolution v0 system.

## Prerequisites
- Railway CLI installed (`npm install -g @railway/cli`)
- Access to Railway PostgreSQL database
- PostgreSQL client (psql) installed
- Repository maintainer permissions

## Installation Steps

### 1. Database Migration

Run the migration script to create all required tables:

```bash
# Via Railway CLI (recommended)
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-self-evolution-tables.sh'
```

This creates 6 tables:
- `self_evolution_runs` - Execution records
- `self_evolution_reflections` - Analysis and insights
- `self_evolution_proposals` - Candidate changes
- `self_evolution_actions` - Concrete actions
- `self_evolution_rollbacks` - Rollback history
- `feature_flags` - Feature flag store

**Verify migration:**
```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = '\''public'\'' AND table_name LIKE '\''self_evolution%'\'' OR table_name = '\''feature_flags'\'' ORDER BY table_name;"'
```

Expected output:
```
feature_flags
self_evolution_actions
self_evolution_proposals
self_evolution_reflections
self_evolution_rollbacks
self_evolution_runs
```

### 2. Update Prisma Schema

After migration, update the Prisma schema to reflect the new tables:

```bash
cd packages/database
pnpm prisma db pull
pnpm prisma generate
```

### 3. Install GitHub Actions Workflow

**⚠️ IMPORTANT:** The workflow file cannot be added via automated PR due to GitHub App permissions. It must be manually added.

**Option A: Manual file creation**
1. Copy the workflow file from `docs/self-evolution/self-evolution.yml`
2. Create `.github/workflows/self-evolution.yml` manually
3. Paste the contents
4. Commit and push to main branch

**Option B: Command line**
```bash
# From repository root
cp docs/self-evolution/self-evolution.yml .github/workflows/self-evolution.yml
git add .github/workflows/self-evolution.yml
git commit -m "feat: add self-evolution workflow"
git push origin main
```

### 4. Configure Feature Flag (Optional - Disabled by Default)

The feature flag defaults to OFF. To enable self-evolution (after testing):

```sql
-- Enable self-evolution
INSERT INTO feature_flags (key, value, metadata)
VALUES (
  'self_evolution_enabled',
  false,  -- Keep disabled initially
  '{"version": "v0", "enabledAt": null, "dryRunMode": true}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
```

### 5. Test the Installation

**Run a manual test (dry-run mode):**
1. Go to GitHub Actions → Self-Evolution - Daily Capability Development
2. Click "Run workflow"
3. Select:
   - Dry run: `true`
   - Force run: `true` (to bypass daily check)
4. Monitor the workflow execution

**Verify database records:**
```sql
SELECT id, run_date, status, summary, started_at, finished_at
FROM self_evolution_runs
ORDER BY run_date DESC
LIMIT 5;
```

### 6. Configuration Review

Review and adjust settings in `.github/self-evolution-config.json`:
- `enabled` - Master switch (default: false)
- `dryRunMode` - Dry-run mode (default: true)
- `safetyRails.allowedPaths` - Paths that can be modified
- `safetyRails.blockedPaths` - Paths that cannot be modified
- `safetyRails.maxRiskLevel` - Maximum risk level (default: 2)

## Rollout Plan

### Phase 1: Initial Testing (Current)
- ✅ Install infrastructure
- ✅ Run migration
- ✅ Keep feature flag OFF
- ✅ Keep dry-run mode ON

### Phase 2: Dry-Run Testing (48 hours)
1. Enable feature flag in database:
   ```sql
   UPDATE feature_flags
   SET value = true, metadata = jsonb_set(metadata, '{enabledAt}', to_jsonb(NOW()::text))
   WHERE key = 'self_evolution_enabled';
   ```
2. Monitor daily runs in dry-run mode
3. Review telemetry and logs
4. Verify no policy violations

### Phase 3: Limited Enablement (7 days)
1. Disable dry-run mode for wildcard feature only
2. Update config: `wildcardFeature.enabled = true`
3. Monitor one small change per day
4. Review all PRs manually before merge

### Phase 4: Full Enablement
1. Enable all change types
2. Maintain safety rails (diff caps, risk levels)
3. Continue manual PR reviews

## Verification Checklist

After installation, verify:

- [ ] Database tables created successfully
- [ ] Prisma schema updated and client generated
- [ ] Workflow file added to `.github/workflows/`
- [ ] Configuration file present at `.github/self-evolution-config.json`
- [ ] PR template available at `.github/PULL_REQUEST_TEMPLATE/self_evolution.md`
- [ ] Documentation complete at `docs/self-evolution/v0.md`
- [ ] Feature flag record exists in database (disabled)
- [ ] Test workflow run completes successfully
- [ ] Artifacts uploaded correctly (90-day retention)

## Troubleshooting

### Migration Fails
**Issue:** Migration script fails with permission error

**Solution:**
```bash
# Verify DATABASE_URL is set
railway run bash -c 'echo $DATABASE_PUBLIC_URL'

# Test connection
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "SELECT version();"'
```

### Workflow Not Appearing
**Issue:** Workflow doesn't appear in GitHub Actions

**Solution:**
1. Verify workflow file exists at `.github/workflows/self-evolution.yml`
2. Check YAML syntax: `yamllint .github/workflows/self-evolution.yml`
3. Push to main branch (workflows only run from default branch)

### Feature Flag Not Working
**Issue:** Workflow skips execution even with flag enabled

**Solution:**
```sql
-- Check flag value
SELECT key, value, metadata FROM feature_flags WHERE key = 'self_evolution_enabled';

-- Ensure it's set to true
UPDATE feature_flags SET value = true WHERE key = 'self_evolution_enabled';
```

### psql Command Not Found in Workflow
**Issue:** Workflow fails with "psql: command not found"

**Solution:**
The workflow includes PostgreSQL client installation. If it fails, check the workflow logs and ensure the setup step completed.

## Security Notes

1. **Feature flag defaults to OFF** - System is disabled by default
2. **Dry-run mode ON** - No actual changes until explicitly enabled
3. **Workflow requires manual addition** - Cannot be auto-added for security
4. **All PRs require human approval** - No auto-merge
5. **Audit trail** - All actions logged to database and GitHub Actions
6. **Rollback capability** - Every action can be reverted

## Next Steps

After installation:
1. Review the documentation in `docs/self-evolution/v0.md`
2. Familiarize yourself with the configuration options
3. Run a test workflow execution
4. Monitor the first few dry-runs
5. Gradually enable features as confidence grows

## Support

For issues or questions:
- Review documentation: `docs/self-evolution/v0.md`
- Check troubleshooting section above
- Review workflow logs in GitHub Actions
- Query database for run history

## Related Files

- Migration: `packages/database/scripts/create-self-evolution-tables.sh`
- Workflow: `docs/self-evolution/self-evolution.yml` (copy to `.github/workflows/`)
- Config: `.github/self-evolution-config.json`
- PR Template: `.github/PULL_REQUEST_TEMPLATE/self_evolution.md`
- Docs: `docs/self-evolution/v0.md`
