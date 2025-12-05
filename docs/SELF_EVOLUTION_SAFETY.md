# Self-Evolution Safety Rails

This document describes the safety guardrails and automated checks for Omega's self-evolution capabilities.

## Overview

The self-evolution safety system enforces configurable limits and patterns to prevent autonomous changes from introducing breaking changes, security vulnerabilities, or system instability.

## Components

### 1. Database Tables

#### `safety_policy`
Stores configurable guardrail settings:

- **Diff Caps:**
  - `max_lines_of_code`: Maximum total LOC changed (default: 500)
  - `max_files_changed`: Maximum files modified (default: 10)
  - `max_directories_changed`: Maximum directories affected (default: 4)

- **Pattern Lists (JSONB):**
  - `allowlist_patterns`: Directories/files where new files can be created
  - `blocklist_patterns`: Protected files/directories requiring human approval

- **Policy Metadata:**
  - `policy_name`: Unique identifier (e.g., "default")
  - `is_active`: Enable/disable policy
  - `policy_version`: Track policy iterations

**Default Policy:**
```json
{
  "max_lines_of_code": 500,
  "max_files_changed": 10,
  "max_directories_changed": 4,
  "allowlist_patterns": [
    "prompts/",
    "docs/",
    "apps/bot/src/agent/tools/",
    ".github/workflows/",
    "config/feature-flags"
  ],
  "blocklist_patterns": [
    "packages/agent/src/agent.ts",
    "packages/agent/src/toolLoader.ts",
    "packages/database/",
    "scripts/deploy-railway.sh",
    ".env",
    "credentials.json",
    "packages/database/scripts/",
    "packages/database/prisma/"
  ]
}
```

#### `self_evolution_rollbacks`
Audit trail for failed self-evolution attempts:

- **PR Details:** `pr_number`, `pr_title`, `pr_url`, `commit_sha`, `branch_name`
- **Failure Info:** `failure_reason`, `failure_type`, `violation_details` (JSONB)
- **Rollback Tracking:** `rollback_status`, `rollback_commit_sha`, `rollback_completed_at`

**Failure Types:**
- `guardrail_violation`: Safety policy violation
- `test_failure`: Test suite failed
- `build_failure`: Build process failed
- `runtime_error`: Runtime error in production
- `manual_rollback`: Human-initiated rollback
- `other`: Other failure reasons

### 2. Guardrails Checker Script

**Location:** `scripts/self-evolution-guardrails.ts`

**Responsibilities:**
- Fetch active safety policy from database
- Analyze git diff statistics (LOC, files, directories)
- Validate diff against policy caps
- Check blocklist/allowlist pattern violations
- Record rollback events for failures
- Generate detailed violation reports

**Usage:**
```bash
# Check current branch against main
tsx scripts/self-evolution-guardrails.ts --check-diff main HEAD

# Use environment variables (GitHub Actions)
GITHUB_BASE_REF=main GITHUB_HEAD_REF=feature tsx scripts/self-evolution-guardrails.ts
```

**Output:**
- Exit code 0: All guardrails passed
- Exit code 1: Guardrail violations detected
- `GITHUB_OUTPUT`: Sets `guardrails_passed`, `violations_count`, `report`

### 3. GitHub Actions Workflow

**Location:** `.github/workflows/self_evolution_checks.yml`

**Trigger:** Pull requests to `main` from `claude/*` branches

**Jobs:**

1. **check-eligibility**
   - Verify PR is from Claude (branch starts with `claude/`)

2. **guardrails-check**
   - Run guardrails validation script
   - Upload violation report as artifact
   - Set outputs for downstream jobs

3. **canary-tests** (parallel matrix)
   - Lint (non-blocking warning if fails)
   - Type check (required)
   - Build (required)

4. **comment-results**
   - Post/update PR comment with:
     - Guardrails validation results
     - Canary test results
     - Overall safety status

5. **check-migration-approval**
   - Verify `allow-migrations` label exists if database migrations detected
   - Fail PR if label missing

## Safety Policies

### Diff Caps

Prevent massive changes that are hard to review:

- **Lines of Code:** ≤500 total (additions + deletions)
- **Files:** ≤10 modified files
- **Directories:** ≤4 affected directories

### Allowlist (New Files Only)

Directories where autonomous file creation is permitted:

- `prompts/` - Prompt templates and configurations
- `docs/` - Documentation
- `apps/bot/src/agent/tools/` - New tool implementations
- `.github/workflows/` - New workflow files (not modifications)
- `config/feature-flags` - Feature flag configurations

### Blocklist (Requires Human Approval)

Protected files/directories that should never be modified autonomously:

- **Core Runtime:**
  - `packages/agent/src/agent.ts` - Main agent logic
  - `packages/agent/src/toolLoader.ts` - Tool loading system

- **Database:**
  - `packages/database/` - All database code
  - `packages/database/scripts/` - Migration scripts (requires `allow-migrations` label)
  - `packages/database/prisma/` - Prisma schema (requires `allow-migrations` label)

- **Deployment:**
  - `scripts/deploy-railway.sh` - Deployment scripts

- **Secrets:**
  - `.env` - Environment variables
  - `credentials.json` - API credentials

## Database Migration Approval

Database changes require special handling:

1. **Detection:** Guardrails checker identifies files in `packages/database/`
2. **Warning:** Adds warning violation with type `database_migration_requires_approval`
3. **Label Check:** `check-migration-approval` job verifies `allow-migrations` label
4. **Enforcement:** PR fails unless label is present

**Human Review Process:**
1. Review database migration script
2. Verify idempotency (uses `IF NOT EXISTS`, etc.)
3. Check for proper indexes and constraints
4. Add `allow-migrations` label to approve
5. Merge PR (migration auto-runs via `database-migrate.yml`)

## Canary Tests

Minimal smoke tests to catch obvious failures:

1. **Lint:** Code style and quality (warning only)
2. **Type Check:** TypeScript compilation (required)
3. **Build:** Full build process (required)

## Rollback Automation

When guardrails fail:

1. **Record Event:** Insert row into `self_evolution_rollbacks` table
2. **PR Comment:** Post detailed violation report
3. **Block Merge:** GitHub Actions check fails
4. **Manual Review:** Human reviews violations and decides next steps

**Rollback Statuses:**
- `pending`: Rollback needed but not started
- `in_progress`: Rollback in progress
- `completed`: Successfully rolled back
- `failed`: Rollback failed (escalate)
- `skipped`: Decided not to rollback (human decision)

## Configuration

### Updating Safety Policy

```sql
-- Update existing policy
UPDATE safety_policy
SET
  max_lines_of_code = 1000,
  max_files_changed = 20,
  allowlist_patterns = '["prompts/", "docs/", "apps/bot/src/agent/tools/"]'::jsonb
WHERE policy_name = 'default';

-- Create new policy version
INSERT INTO safety_policy (
  policy_name,
  description,
  max_lines_of_code,
  max_files_changed,
  max_directories_changed,
  allowlist_patterns,
  blocklist_patterns,
  is_active,
  policy_version
) VALUES (
  'experimental',
  'Relaxed policy for testing',
  2000,
  50,
  10,
  '["**/*"]'::jsonb,
  '[]'::jsonb,
  false,
  1
);
```

### Activating Different Policy

```sql
-- Deactivate current
UPDATE safety_policy SET is_active = false WHERE is_active = true;

-- Activate new
UPDATE safety_policy SET is_active = true WHERE policy_name = 'experimental';
```

## Monitoring

### View Rollback History

```sql
SELECT
  pr_number,
  failure_type,
  failure_reason,
  rollback_status,
  created_at
FROM self_evolution_rollbacks
ORDER BY created_at DESC
LIMIT 20;
```

### Violation Analysis

```sql
SELECT
  failure_type,
  COUNT(*) as count,
  AVG(CASE WHEN rollback_status = 'completed' THEN 1 ELSE 0 END) as rollback_rate
FROM self_evolution_rollbacks
GROUP BY failure_type
ORDER BY count DESC;
```

## Future Enhancements

Potential improvements to the safety system:

1. **Gradual Rollout:** Canary deployments for merged changes
2. **Automated Rollback:** Auto-revert on production errors
3. **Learning System:** Adjust caps based on historical success rates
4. **Semantic Analysis:** Detect risky code patterns beyond diff stats
5. **Dependency Analysis:** Prevent changes to high-impact modules
6. **Test Coverage Requirements:** Enforce coverage thresholds
7. **Performance Regression Detection:** Benchmark critical paths

## References

- Issue: #758
- Related: #751 (Self-Evolution Loop), #752 (Tool Synthesis)
- Database Migration Workflow: `.github/workflows/database-migrate.yml`
- CI/CD PR Checks: `.github/workflows/ci-pr.yml`
