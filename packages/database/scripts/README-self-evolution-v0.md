# Self-Evolution v0 Database Migration

This migration creates the initial schema for the self-evolution scaffolding system.

## Tables Created

### feature_flags
Stores feature flag configurations for controlling system behavior.
- `id` - Auto-incrementing primary key
- `key` - Unique feature flag identifier
- `value` - JSONB configuration data
- `created_at`, `updated_at` - Timestamps

### evolution_runs
Tracks each execution of the self-evolution system.
- `id` - Auto-incrementing primary key
- `run_at` - When the run occurred
- `mode` - Either 'dry-run' or 'active'
- `status` - Result: 'success', 'failure', or 'skipped'
- `notes` - Optional notes about the run
- `metrics` - JSONB with run metrics

### evolution_reflections
Stores AI reflections about the codebase and potential improvements.
- `id` - Auto-incrementing primary key
- `run_id` - Reference to evolution_runs
- `summary` - Text summary of reflection
- `insights` - JSONB structured insights
- `raw_context` - JSONB raw data used for reflection
- `created_at` - Timestamp

### evolution_candidates
Proposed changes identified during evolution runs.
- `id` - Auto-incrementing primary key
- `run_id` - Reference to evolution_runs
- `area` - Code area being improved
- `rationale` - Why this change is proposed
- `proposal` - JSONB detailed proposal
- `risk_level` - Risk assessment
- `score` - Numeric priority/quality score
- `created_at` - Timestamp

### evolution_changes
Actual code changes made during evolution runs.
- `id` - Auto-incrementing primary key
- `run_id` - Reference to evolution_runs
- `change_type` - Type of change made
- `files` - JSONB array of affected files
- `diff_stats` - JSONB diff statistics
- `created_at` - Timestamp

### guardrail_checks
Safety checks performed before applying changes.
- `id` - Auto-incrementing primary key
- `run_id` - Reference to evolution_runs
- `check_name` - Name of the safety check
- `passed` - Boolean result
- `details` - JSONB check details
- `created_at` - Timestamp

## Indexes

All foreign key columns and frequently queried fields have indexes:
- `idx_feature_flags_key` - Fast feature flag lookups
- `idx_runs_at` - Query runs by time
- `idx_reflections_run` - Find reflections by run
- `idx_candidates_run` - Find candidates by run
- `idx_changes_run` - Find changes by run
- `idx_guardrails_run` - Find guardrail checks by run

## Seed Data

The migration seeds one feature flag:
```json
{
  "key": "self_evolution_v0",
  "value": {"enabled": false, "mode": "dry-run"}
}
```

This flag controls whether the self-evolution system is active and in what mode.

## Running the Migration

### On Railway (Production)

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-self-evolution-v0-tables.sh'
```

### Locally (with DATABASE_URL set)

```bash
export DATABASE_URL="postgresql://postgres:password@host:port/database"
bash packages/database/scripts/create-self-evolution-v0-tables.sh
```

## Idempotency

The migration is safe to run multiple times. All `CREATE TABLE` and `CREATE INDEX` statements use `IF NOT EXISTS`, and the seed data uses `ON CONFLICT (key) DO NOTHING`.

## Updating Prisma Schema

After running the migration, update the Prisma schema:

```bash
cd packages/database
export DATABASE_URL="postgresql://postgres:password@host:port/database"
pnpm prisma db pull
pnpm prisma generate
```

## Related Issues

- Part of #754 - Self-Evolution v0 implementation
- Created from #761 - Database migration task
