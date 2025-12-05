# Self-Evolution Safety Rails

This directory contains the safety guardrails system for the self-evolution loop, ensuring that autonomous code changes remain within safe boundaries.

## Overview

The self-evolution safety system enforces:

- **Diff Caps**: Limits on lines of code, files, and directories changed
- **Allow/Block Lists**: Pattern-based restrictions on which files can be modified
- **Canary Tests**: Minimal smoke tests (lint, typecheck, build) run on every PR
- **Rollback Automation**: Automatic revert on failures
- **Policy Visibility**: Safety policy cached to JSON for review

## Components

### 1. Database Tables

#### `safety_policy`
Stores configurable safety parameters:
- `max_lines_of_code`: Maximum LOC changed (default: 500)
- `max_files_changed`: Maximum files in PR (default: 10)
- `max_directories_affected`: Maximum directories touched (default: 4)
- `allow_patterns`: Glob patterns for allowed files
- `block_patterns`: Glob patterns for blocked files
- `require_canary_tests`: Whether canary tests are required
- `auto_rollback_enabled`: Whether auto-rollback is enabled

#### `self_evolution_rollbacks`
Tracks rollback events:
- `pr_number`: The PR that was rolled back
- `rollback_reason`: Why the rollback occurred
- `failure_type`: Type of failure (test, build, runtime, etc.)
- `files_affected`: List of files changed
- `rollback_status`: Status (pending, completed, failed)

### 2. Guardrails Script

**File**: `scripts/self_evolution/guardrails.ts`

**Purpose**: Validates PR changes against safety policy

**Usage**:
```bash
# Check specific PR
tsx scripts/self_evolution/guardrails.ts --pr 123

# Check specific files
tsx scripts/self_evolution/guardrails.ts --files path/to/file1.ts path/to/file2.ts

# Check latest git diff
tsx scripts/self_evolution/guardrails.ts

# Export policy to JSON
tsx scripts/self_evolution/guardrails.ts --export-policy
```

**Exit Codes**:
- `0`: All guardrails passed
- `1`: Guardrail violations detected
- `2`: Error running checks

**Features**:
- Computes diff statistics (LOC, files, directories)
- Validates against database policy
- Checks allow/block patterns
- Outputs GitHub Actions compatible JSON
- Exports policy to `config/self-evolution-policy.json`

### 3. GitHub Workflow

**Template File**: `scripts/self_evolution/self_evolution_checks.yml.template`

**Installation**: Copy the template to `.github/workflows/`:
```bash
cp scripts/self_evolution/self_evolution_checks.yml.template .github/workflows/self_evolution_checks.yml
git add .github/workflows/self_evolution_checks.yml
git commit -m "chore: add self-evolution checks workflow"
git push
```

**Note**: GitHub App permissions prevent automated workflow creation. The workflow must be added manually by a user with repository write access.

**Triggers**:
- Pull request to main branch
- Manual workflow dispatch

**Jobs**:

1. **Guardrails Validation**
   - Runs `guardrails.ts` script
   - Comments on PR if violations detected
   - Fails if errors found

2. **Canary Tests**
   - Runs lint, typecheck, and build in parallel
   - Continues even if guardrails fail
   - Provides early feedback on code quality

3. **Export Policy**
   - Exports current policy to JSON artifact
   - Provides visibility into active limits

4. **Final Status Check**
   - Aggregates results from all jobs
   - Fails if any critical check failed

## Default Policy

The default safety policy (`policy_name: 'default'`) enforces:

### Diff Caps
- **Lines of Code**: ≤500 LOC (additions + deletions)
- **Files Changed**: ≤10 files
- **Directories Affected**: ≤4 directories

### Allow Patterns (New Files Only)
- `prompts/**/*` - AI prompt templates
- `docs/**/*` - Documentation
- `apps/bot/src/agent/tools/**/*.ts` - New agent tools
- `.github/workflows/*.yml` - New workflow files
- `config/feature-flags.*` - Feature flag configs

### Block Patterns (Require Human Approval)
- `apps/bot/src/index.ts` - Core runtime
- `packages/database/prisma/schema.prisma` - Database schema
- `packages/database/scripts/**/*` - Migration scripts
- `.env*` - Environment files
- `*.secret*` - Secret files
- `credentials.*` - Credential files
- `railway.json` - Railway config
- `scripts/deploy-*` - Deployment scripts

### Settings
- **Canary Tests Required**: Yes
- **Auto-Rollback Enabled**: Yes

## Configuration

### Updating the Policy

To update the safety policy, connect to the database and update the `safety_policy` table:

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "
UPDATE safety_policy
SET
  max_lines_of_code = 1000,
  max_files_changed = 20,
  updated_at = (EXTRACT(epoch FROM now()))::bigint
WHERE policy_name = '\''default'\'';
"'
```

### Adding Allow/Block Patterns

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "
UPDATE safety_policy
SET
  allow_patterns = allow_patterns || '\''[\"new/pattern/**/*\"]'\''::jsonb,
  updated_at = (EXTRACT(epoch FROM now()))::bigint
WHERE policy_name = '\''default'\'';
"'
```

### Creating a New Policy

```sql
INSERT INTO safety_policy (
  policy_name,
  max_lines_of_code,
  max_files_changed,
  max_directories_affected,
  allow_patterns,
  block_patterns,
  is_active
) VALUES (
  'strict',
  200,
  5,
  2,
  '["prompts/**/*", "docs/**/*"]'::jsonb,
  '["**/*.ts", "**/*.js"]'::jsonb,
  false  -- Set to true to activate
);
```

## Workflow Integration

### PR Comment on Violations

When guardrails fail, the workflow automatically comments on the PR with:
- Summary of violations
- Suggested resolutions
- Link to workflow run

### Human Override

To override blocklist restrictions:
1. Add the `allow-migrations` label to the PR
2. Add a comment explaining why the override is necessary
3. A human must review and approve

## Rollback Automation

When a merged PR causes failures:

1. **Detection**: CI on main branch detects failure
2. **Logging**: Failure logged to `self_evolution_rollbacks` table
3. **Revert**: Auto-revert branch created
4. **Notification**: Issue/PR created with rollback details

**Note**: Rollback automation is implemented via separate workflows (future enhancement).

## Testing

### Test the Guardrails Script Locally

```bash
# Install dependencies
pnpm install

# Set DATABASE_URL
export DATABASE_URL="postgresql://postgres:password@switchback.proxy.rlwy.net:11820/railway"

# Run on current branch
tsx scripts/self_evolution/guardrails.ts

# Test with specific files
tsx scripts/self_evolution/guardrails.ts --files apps/bot/src/index.ts
```

### Expected Output

**Pass**:
```
📋 Using safety policy: default
🔍 Analyzing 3 file(s)...

Diff Statistics:
  Lines of code: 45 (limit: 500)
  Files changed: 3 (limit: 10)
  Directories affected: 2 (limit: 4)

✅ All guardrails passed!
```

**Fail**:
```
🚨 Guardrail Violations Detected:

ERRORS:
  1. [max_lines_of_code] Lines of code changed (750) exceeds limit (500)
     Details: {"current": 750, "limit": 500, "additions": 600, "deletions": 150}

  2. [blocked_file] File "apps/bot/src/index.ts" matches blocked pattern
     Details: {"file": "apps/bot/src/index.ts", "matched_patterns": ["apps/bot/src/index.ts"]}

❌ Guardrail checks FAILED
```

## Monitoring

### View Active Policy

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "
SELECT
  policy_name,
  max_lines_of_code,
  max_files_changed,
  max_directories_affected,
  is_active
FROM safety_policy
ORDER BY created_at DESC;
"'
```

### View Rollback History

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "
SELECT
  pr_number,
  rollback_reason,
  failure_type,
  rollback_status,
  created_at
FROM self_evolution_rollbacks
ORDER BY created_at DESC
LIMIT 10;
"'
```

## Troubleshooting

### Guardrails Script Fails to Connect to Database

**Error**: `DATABASE_URL environment variable not set`

**Solution**: Ensure `DATABASE_PUBLIC_URL` is set in GitHub Secrets and passed to the workflow

### Policy Export Fails

**Error**: `No active policy to export`

**Solution**: Run the migration script to create the default policy:
```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-self-evolution-safety-tables.sh'
```

### Workflow Times Out

**Error**: Workflow exceeds time limit

**Solution**: Reduce the scope of canary tests or increase timeout in workflow YAML

## Future Enhancements

- [ ] Rollback automation implementation
- [ ] Slack/Discord notifications on failures
- [ ] Policy versioning and rollback
- [ ] ML-based anomaly detection
- [ ] Integration with code review AI
- [ ] Progressive rollout (canary deploys)

## References

- Issue: #758
- Related: #751 (Self-Evolution Loop), #752 (Continuous Improvement)
- Database: `safety_policy`, `self_evolution_rollbacks`
- Workflow: `.github/workflows/self_evolution_checks.yml`
