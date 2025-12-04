# GitHub Actions Workflow Improvement Plan

## Executive Summary

This plan outlines improvements to the 11 GitHub Actions workflows without breaking functionality. Focus areas: naming conventions, abstraction/reusability, logging, and observability.

## Current State Analysis

### Workflow Inventory

| Filename | Current Name | Triggers | Primary Purpose | Issues |
|----------|-------------|----------|-----------------|--------|
| `deploy.yml` | CI Checks | push:main, PR:main | Build/test on main/PRs | Name conflict, duplicated setup |
| `ci-checks.yml` | PR CI Checks | PR with path filters | Lint/typecheck/build PRs | Duplicated setup code |
| `claude.yml` | Claude Code | @claude mentions, labels | Main Claude entry point | Generic job names |
| `auto-merge-claude.yml` | Auto-Merge Claude PRs | workflow_run: "CI Checks" | Merge after CI passes | Ambiguous workflow dependency |
| `auto-create-claude-pr.yml` | Auto-Create Claude Code PR | push: claude/** | Create PRs from branches | Long, duplicated setup |
| `claude-autofix.yml` | Claude Auto-Fix Trigger | workflow_run: "CI" | Auto-fix failed CI | Wrong workflow reference |
| `claude-code-review.yml` | Claude Code Review | PR opened/sync | Review PRs with Claude | Limited logging |
| `pr-notifications.yml` | PR Notifications to Discord | PR opened/closed | Discord notifications | Generic job names |
| `generate-comic-on-merge.yml` | Generate Comic on PR Merge | PR closed/merged | Generate comics | Poor error visibility |
| `close-labeled-issues.yml` | Close Issues/PRs with 'needs close' | Schedule, manual | Cleanup | Good logging (keep) |
| `auto-update-prs.yml` | Auto-Update Pull Requests | push:main, manual | Keep PRs updated | Good logging (keep) |

### Key Problems Identified

1. **Naming Inconsistencies**
   - Mixed use of hyphens vs spaces in workflow names
   - Generic job names (`test`, `claude`, `create-pr`)
   - Unclear purposes from names alone
   - Workflow name conflicts causing dependency issues

2. **Code Duplication**
   - Node.js/pnpm setup repeated in 7+ workflows
   - Lockfile auto-fix logic duplicated
   - Git configuration duplicated
   - Discord notification patterns duplicated

3. **Poor Observability**
   - Limited step descriptions
   - Minimal logging of workflow decisions
   - Few GitHub step summaries
   - Hard to debug failures

4. **Dependency Issues**
   - `auto-merge-claude.yml` depends on "CI Checks" (ambiguous)
   - `claude-autofix.yml` references "CI" workflow (doesn't exist)
   - No clear workflow dependency graph

## Proposed Improvements

### Phase 1: Naming Standardization

#### Workflow Naming Convention
Use format: `[Category] - [Action]` with kebab-case filenames

| Current File | New File | New Name | Rationale |
|--------------|----------|----------|-----------|
| `deploy.yml` | `ci-main.yml` | CI - Build and Deploy (Main) | Clarifies main branch CI |
| `ci-checks.yml` | `ci-pr.yml` | CI - Pull Request Checks | Clarifies PR-specific CI |
| `claude.yml` | `claude-trigger.yml` | Claude - Trigger Entry Point | Clearer purpose |
| `auto-merge-claude.yml` | `claude-merge.yml` | Claude - Auto-Merge PRs | Shorter, clearer |
| `auto-create-claude-pr.yml` | `claude-pr-create.yml` | Claude - Create Pull Request | Shorter, clearer |
| `claude-autofix.yml` | `claude-retry.yml` | Claude - Retry Failed CI | Better describes action |
| `claude-code-review.yml` | `claude-review.yml` | Claude - Code Review | Shorter |
| `pr-notifications.yml` | `notify-discord-pr.yml` | Notify - Discord PR Events | Clearer category |
| `generate-comic-on-merge.yml` | `comic-generate.yml` | Comic - Generate on Merge | Shorter, clearer |
| `close-labeled-issues.yml` | ✓ Keep as-is | ✓ Keep as-is | Already clear |
| `auto-update-prs.yml` | ✓ Keep as-is | ✓ Keep as-is | Already clear |

#### Job Naming Convention
Use descriptive, action-oriented names

**Current → New:**
- `test` → `build-and-test-main` / `run-pr-checks`
- `claude` → `trigger-claude-code`
- `auto-merge` → `merge-pr-after-ci`
- `create-pr` → `create-pull-request`
- `tag_claude` → `retry-with-claude`
- `claude-review` → `review-code-changes`
- `generate-comic` → `generate-and-post-comic`

### Phase 2: Create Reusable Components

#### Composite Actions (`.github/actions/`)

1. **`setup-node-pnpm/action.yml`**
   ```yaml
   name: Setup Node.js and pnpm
   description: Sets up Node.js, pnpm, and caching
   inputs:
     node-version:
       default: '20'
     pnpm-version:
       default: '9.0.0'
   runs:
     - Setup Node
     - Setup pnpm
     - Setup pnpm cache
   ```
   **Impact:** Reduces ~40 lines per workflow × 7 workflows = 280 lines

2. **`setup-git-bot/action.yml`**
   ```yaml
   name: Configure Git for Bot
   description: Configures git with bot identity
   runs:
     - Set git user.name
     - Set git user.email
   ```
   **Impact:** Reduces ~5 lines × 5 workflows = 25 lines

3. **`install-with-lockfile-fix/action.yml`**
   ```yaml
   name: Install with Lockfile Auto-Fix
   description: Installs deps, auto-fixes lockfile on PRs
   inputs:
     frozen-lockfile:
       default: 'true'
     commit-lockfile-fixes:
       default: 'false'
   runs:
     - Try frozen lockfile install
     - On fail: regenerate lockfile
     - Commit if requested
   outputs:
     lockfile-fixed: 'true/false'
   ```
   **Impact:** Reduces ~30 lines × 3 workflows = 90 lines

4. **`notify-discord/action.yml`**
   ```yaml
   name: Send Discord Notification
   description: Sends formatted Discord webhook
   inputs:
     webhook-url:
       required: true
     title:
       required: true
     description:
     color:
       default: '3447003'
     fields:
   ```
   **Impact:** Standardizes Discord notifications

#### Reusable Workflows (`.github/workflows/`)

1. **`_ci-common.yml`** (reusable)
   ```yaml
   name: CI Common Steps
   on:
     workflow_call:
       inputs:
         environment: # 'main' or 'pr'
         skip-type-check:
         skip-build:
   ```
   **Impact:** Single source of truth for CI logic

### Phase 3: Enhanced Logging & Observability

#### Standard Practices to Implement

1. **Job-Level Summaries**
   ```yaml
   - name: Job Summary
     if: always()
     run: |
       echo "## 📊 [Job Name] Summary" >> $GITHUB_STEP_SUMMARY
       echo "**Status:** ${{ job.status }}" >> $GITHUB_STEP_SUMMARY
       # Add relevant metrics, decisions, outputs
   ```

2. **Structured Logging**
   ```yaml
   - name: [Action Name]
     run: |
       echo "::group::[Phase Name]"
       echo "ℹ️ INFO: Starting [action]..."
       # ... action ...
       echo "✅ SUCCESS: Completed [action]"
       echo "::endgroup::"
   ```

3. **Error Context**
   ```yaml
   - name: [Action]
     continue-on-error: true
     id: action-id
     run: ...

   - name: Handle [Action] Failure
     if: steps.action-id.outcome == 'failure'
     run: |
       echo "::error::Action failed: [context]"
       # Log debugging information
       # Create issue or notification
   ```

4. **Decision Logging**
   ```yaml
   - name: Check Condition
     id: check
     run: |
       if [ condition ]; then
         echo "decision=proceed" >> $GITHUB_OUTPUT
         echo "📋 DECISION: Will proceed with [action]"
       else
         echo "decision=skip" >> $GITHUB_OUTPUT
         echo "⏭️ DECISION: Skipping [action] because [reason]"
       fi
   ```

5. **Annotations for Key Events**
   ```yaml
   - name: Important Event
     run: |
       echo "::notice::PR #$PR_NUMBER created successfully"
       echo "::warning::Lockfile was out of sync - auto-fixed"
   ```

### Phase 4: Fix Workflow Dependencies

#### Current Issues
- `auto-merge-claude.yml` depends on workflow named "CI Checks"
- Two workflows have that name: `deploy.yml` and `ci-checks.yml`
- `claude-autofix.yml` references workflow "CI" which doesn't exist

#### Solution
After renaming, update dependencies to use new unique names:

```yaml
# claude-merge.yml
on:
  workflow_run:
    workflows: ["CI - Build and Deploy (Main)"]  # Unique name
    types: [completed]

# claude-retry.yml
on:
  workflow_run:
    workflows: ["CI - Build and Deploy (Main)", "CI - Pull Request Checks"]
    types: [completed]
```

## Implementation Plan

### Step 1: Create Reusable Components (No Breaking Changes)
- [ ] Create `.github/actions/setup-node-pnpm/`
- [ ] Create `.github/actions/setup-git-bot/`
- [ ] Create `.github/actions/install-with-lockfile-fix/`
- [ ] Create `.github/actions/notify-discord/`
- [ ] Test each composite action independently

### Step 2: Refactor One Workflow (Test Pattern)
- [ ] Choose `claude-code-review.yml` (lowest risk)
- [ ] Apply new naming conventions
- [ ] Use composite actions
- [ ] Add enhanced logging
- [ ] Test thoroughly
- [ ] Verify no breakage

### Step 3: Apply to All Workflows (Batch by Risk Level)

**Low Risk (Apply First):**
- `generate-comic-on-merge.yml` → `comic-generate.yml`
- `pr-notifications.yml` → `notify-discord-pr.yml`
- `claude-code-review.yml` → `claude-review.yml`

**Medium Risk:**
- `auto-create-claude-pr.yml` → `claude-pr-create.yml`
- `claude-autofix.yml` → `claude-retry.yml`
- `claude.yml` → `claude-trigger.yml`

**High Risk (Apply Last, Most Critical):**
- `ci-checks.yml` → `ci-pr.yml`
- `deploy.yml` → `ci-main.yml`
- `auto-merge-claude.yml` → `claude-merge.yml` (update dependencies!)

### Step 4: Update Documentation
- [ ] Update README with new workflow names
- [ ] Document composite actions
- [ ] Create workflow dependency diagram
- [ ] Add troubleshooting guide

## Success Criteria

✅ **Functionality Preserved**
- All existing triggers still work
- No broken workflow dependencies
- CI still passes/fails correctly
- Auto-merge still works
- Claude Code still triggers

✅ **Improved Naming**
- No duplicate workflow names
- Clear purpose from name alone
- Consistent naming pattern

✅ **Reduced Duplication**
- Common setup uses composite actions
- ~400 lines of code reduced
- Single source of truth for shared logic

✅ **Better Observability**
- GitHub Step Summaries on all workflows
- Structured logging with groups
- Clear decision logging
- Annotations for key events

## Risk Mitigation

1. **Rename workflows last** - Create new files first, test, then delete old
2. **Update dependencies atomically** - Change all workflow_run references in single commit
3. **Keep old names temporarily** - Use file redirects if needed
4. **Test on non-critical branch first** - Create test PR to verify
5. **Monitor after deploy** - Watch first few PR cycles carefully

## Metrics for Success

**Before:**
- 11 workflows
- ~2000 total lines
- ~400 lines duplicated code
- 2 workflows with same name
- Limited logging
- Hard to debug failures

**After:**
- 11 workflows (same)
- ~1600 total lines (20% reduction)
- ~50 lines duplicated (85% reduction)
- All workflows uniquely named
- Comprehensive logging
- Clear failure diagnostics
- 4 reusable composite actions

## Timeline Estimate

- **Phase 1 (Create Components):** 2-3 hours
- **Phase 2 (Test Pattern):** 1 hour
- **Phase 3 (Low Risk Workflows):** 2 hours
- **Phase 4 (Medium Risk Workflows):** 2 hours
- **Phase 5 (High Risk Workflows):** 3 hours
- **Phase 6 (Documentation):** 1 hour

**Total:** ~11-12 hours of focused work

## Open Questions for User

1. **Breaking Changes:** Are you okay with workflow file renames? This will break any external references to specific workflow files.

2. **Aggressive Refactoring:** Should we create a reusable CI workflow (`_ci-common.yml`) or keep CI logic inline for now?

3. **Notification Format:** Do you want to standardize Discord notification format/styling?

4. **Monitoring:** Should we add workflow runtime metrics or alerts for failures?

5. **Backward Compatibility:** Do you need any transition period where old and new workflows coexist?

---

**Ready to proceed with implementation once approved.**
