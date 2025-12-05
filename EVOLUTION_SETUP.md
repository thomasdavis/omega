# Self-Evolution Engine Setup

This document provides setup instructions for the self-evolution engine implemented in issue #752.

## Phase 0: Database and Infrastructure

This PR implements the foundational infrastructure for Omega's self-evolution system. The system is NOT yet active - it requires database migration and manual activation.

## Database Migration Required

**IMPORTANT:** Before this feature can be used, run the database migration:

```bash
# Via Railway CLI (recommended)
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-evolution-tables.sh'
```

Or use the GitHub Actions workflow:
1. Go to Actions → "Database - Run Migrations"
2. Click "Run workflow"
3. Set migration_script to: `create-evolution-tables.sh`
4. Leave dry_run unchecked
5. Run workflow

This will create 6 tables:
- `self_reflections` - Daily analyses and signals
- `evolution_proposals` - Candidate improvements
- `sanity_checks` - Safety gate results
- `experiments` - Rollout tracking
- `feature_flags` - Runtime controls
- `evolution_audit_log` - Full audit trail

## After Migration

Update the Prisma schema:

```bash
cd packages/database
pnpm prisma db pull
pnpm prisma generate
```

## Activation (Future Phases)

The evolution engine workflow is currently in **dry-run mode**. To activate:

1. Review all safety configurations in `config/evolution/`
2. Test the workflow manually: Actions → "Self-Evolution Engine" → Run workflow
3. Review logs and verify safety checks work correctly
4. Gradually enable features through the phase progression:
   - Phase 1: Observer reports only
   - Phase 2: Proposal generation + dry-run checks
   - Phase 3: Auto-branch + auto-PR (no auto-merge)
   - Phase 4: Feedback loop and iteration

## Configuration Files

- `apps/bot/src/evolution/config.ts` - Main configuration
- `config/evolution/allowlist.json` - Permitted modification paths
- `config/evolution/blocklist.json` - Forbidden paths and operations
- `config/evolution/risk-matrix.json` - Risk assessment criteria

## Safety Features

- ✅ No auto-merge (always requires human review)
- ✅ Path allowlist/blocklist enforcement
- ✅ Diff size and file count limits
- ✅ Feature flags for all behavior changes
- ✅ Comprehensive audit logging
- ✅ Persona guardrails (preserves core identity)
- ✅ Multi-stage sanity checks
- ✅ Mandatory rollback plans

## Testing

Manual test the evolution cycle:

```bash
cd apps/bot
pnpm build
node -e "import('./dist/evolution/engine.js').then(m => m.runEvolutionCycle())"
```

## Monitoring

Daily reports will be posted to a tracking issue labeled `evolution-tracking`.

## Rollback

If issues occur:
1. Disable the GitHub Actions workflow
2. Disable all feature flags in database
3. Revert this PR if necessary

## Questions?

See `apps/bot/src/evolution/README.md` for detailed documentation.
