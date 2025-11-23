# Branch Protection Setup

This document explains how to configure GitHub branch protection rules to ensure CI checks pass before PRs can be merged.

## Required Setup

### 1. Enable Branch Protection for `main`

1. Go to your GitHub repository
2. Navigate to **Settings** → **Branches**
3. Click **Add branch protection rule**
4. Configure the following:

#### Branch name pattern
```
main
```

#### Protect matching branches

**Required settings:**

- ✅ **Require a pull request before merging**
  - ✅ Require approvals: `0` (auto-merge doesn't need human approval)
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require approval of the most recent reviewable push

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - **Status checks that are required:**
    - `Lint & Type Check` (from the ci-checks.yml workflow)

- ✅ **Require conversation resolution before merging** (optional but recommended)

- ✅ **Do not allow bypassing the above settings**
  - ⚠️ **DO NOT** enable "Allow force pushes" or "Allow deletions"

**Optional but recommended:**

- ✅ **Require linear history** (enforces squash or rebase merges)
- ✅ **Include administrators** (applies rules to repo admins too)

### 2. Auto-Merge Behavior

With these settings in place:

1. **When a PR is created** from `claude/**` branches:
   - Auto-merge is automatically enabled by the workflow
   - The PR enters a "pending merge" state

2. **CI Checks run**:
   - Type checking
   - Linting
   - Build verification

3. **If checks PASS**:
   - ✅ The PR automatically merges
   - Branch is automatically deleted
   - Deployment workflow triggers

4. **If checks FAIL**:
   - ❌ Auto-merge is blocked by branch protection
   - @claude is tagged in a comment with error details
   - Claude can read the errors and push fixes
   - When fixes are pushed, CI runs again
   - Once all checks pass, auto-merge proceeds

## How It Works Together

```
┌─────────────────────┐
│ Claude pushes to    │
│ claude/** branch    │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ auto-create-claude- │
│ pr.yml creates PR   │
│ and enables         │
│ auto-merge          │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ ci-checks.yml runs  │
│ - type-check        │
│ - lint              │
│ - build             │
└──────────┬──────────┘
           │
      ┌────┴────┐
      │         │
   PASS        FAIL
      │         │
      v         v
   ┌────┐   ┌──────────────┐
   │    │   │ Tag @claude  │
   │    │   │ with errors  │
   │    │   └──────┬───────┘
   │    │          │
   │    │          v
   │    │   ┌──────────────┐
   │    │   │ Claude fixes │
   │    │   │ and pushes   │
   │    │   └──────┬───────┘
   │    │          │
   │    │<─────────┘
   │    │
   v    v
┌─────────────────────┐
│ Branch protection   │
│ allows auto-merge   │
│ to proceed          │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ PR merges           │
│ automatically       │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ deploy.yml runs     │
│ and deploys to      │
│ Railway             │
└─────────────────────┘
```

## Testing the Setup

### Verify Branch Protection

1. Create a test PR that intentionally fails CI (add a type error)
2. Verify that auto-merge is enabled but blocked
3. Verify that @claude is tagged with error details
4. Fix the error and push
5. Verify that auto-merge proceeds once checks pass

### Expected Behavior

**Good PR (passes CI):**
```
1. PR created → Auto-merge enabled
2. CI runs → All checks pass ✅
3. Auto-merge proceeds immediately
4. PR is merged and deployed
```

**Bad PR (fails CI):**
```
1. PR created → Auto-merge enabled
2. CI runs → Checks fail ❌
3. @claude is tagged with errors
4. Auto-merge is blocked by branch protection
5. Claude (or dev) pushes fix
6. CI runs again → All checks pass ✅
7. Auto-merge proceeds
8. PR is merged and deployed
```

## Troubleshooting

### Auto-merge isn't waiting for checks

**Problem:** PR merges immediately without waiting for CI

**Solution:**
- Ensure "Require status checks to pass before merging" is enabled
- Ensure "Lint & Type Check" is added to required status checks
- The status check name must match exactly (case-sensitive)

### Auto-merge is stuck pending

**Problem:** CI passed but auto-merge doesn't proceed

**Solutions:**
- Check if "Require branches to be up to date before merging" is enabled
  - If enabled, the PR branch must be up-to-date with main
  - The workflow will handle this automatically
- Check if required status checks are still running
- Verify the status check name matches exactly

### @claude isn't being tagged on failures

**Problem:** CI fails but no comment appears

**Solutions:**
- Check the CI workflow logs for errors in the "Tag Claude" step
- Verify the GitHub token has `pull-requests: write` permission
- Ensure the PR is from a `claude/**` branch (this is required for tagging)

## Security Considerations

### Why not allow bypassing?

Branch protection rules should apply to **everyone**, including:
- Repository administrators
- Bot accounts
- Service accounts

This ensures:
- No broken code reaches production
- All changes go through CI validation
- Audit trail for all merges

### Why require status checks?

Required status checks prevent:
- Merging code with type errors
- Deploying code with lint violations
- Shipping broken builds

### Auto-merge security

The auto-merge workflow:
- Only runs on `claude/**` branches
- Only enables auto-merge for PRs linked to issues
- Requires all status checks to pass
- Cannot bypass branch protection rules

## Maintenance

### Adding New CI Checks

When adding new checks to `ci-checks.yml`:

1. Add the check as a new step in the workflow
2. Add the check to the "Determine overall status" logic
3. Update branch protection rules to require the new check
4. Update this documentation

### Modifying Status Check Names

If you rename the CI workflow job (`Lint & Type Check`):

1. Update the name in `ci-checks.yml`
2. Update branch protection required checks
3. Test with a new PR to verify it works

## References

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Auto-merge Documentation](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)
- [Required Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging)
