# CI-Based Auto-Merge System

This project uses a **GitHub Actions-based** auto-merge system that requires no manual branch protection configuration. Everything is handled through workflows.

## How It Works

### Complete Flow

```
1. Claude pushes to claude/** branch
   ↓
2. auto-create-claude-pr.yml creates PR
   ↓
3. ci-checks.yml runs automatically
   - Type check (pnpm type-check)
   - Lint (pnpm lint)
   - Build (pnpm build)
   ↓
┌──────────┴──────────┐
│                     │
PASS                 FAIL
│                     │
↓                     ↓
4a. auto-merge-       4b. ci-checks.yml
    claude.yml            tags @claude
    enables               with errors
    auto-merge
│                     │
↓                     ↓
5a. PR merges         5b. Claude reads
    automatically         errors & fixes
    └→ Deployment         │
                          ↓
                      5c. Push fix
                          │
                          ↓
                      Back to step 3
                      (CI runs again)
```

## The Three Workflows

### 1. **auto-create-claude-pr.yml**
**Trigger:** Push to `claude/**` branches

**Does:**
- Creates PR automatically
- Links to related issue
- Merges main branch
- Fixes pnpm lockfile conflicts
- Sends Discord notification

**Does NOT:**
- Enable auto-merge (that comes later)
- Run CI checks (separate workflow)

### 2. **ci-checks.yml**
**Trigger:** Every PR (opened, synchronized, reopened)

**Does:**
- Runs type check
- Runs lint
- Runs build
- **If all pass:** Comments "Ready to merge"
- **If any fail:** Tags @claude with detailed errors
- **Exit code:** Fails if checks fail (prevents merge)

**Key feature:** Continues on error for each check so we can collect ALL errors at once, then tags Claude with complete error report.

### 3. **auto-merge-claude.yml**
**Trigger:** When `ci-checks.yml` completes successfully

**Does:**
- Only runs if CI workflow succeeded
- Finds the PR for the branch
- Verifies it's a `claude/**` PR
- Verifies it's linked to an issue
- **Merges the PR immediately** with squash and delete-branch
- Comments that PR has been merged

**Does NOT run if:**
- CI checks failed
- Not a Claude PR
- Not linked to an issue

## Advantages of This Approach

### ✅ No Manual Setup Required
- No branch protection rules to configure in GitHub UI
- Everything is version-controlled in the repository
- Easy to modify and test

### ✅ Clear Separation of Concerns
- CI checks focus on validating code
- Auto-merge focuses on merging when ready
- PR creation focuses on workflow automation

### ✅ Auto-Fix with @claude
- When CI fails, Claude gets tagged automatically
- Claude can read the errors and push fixes
- No human intervention needed for simple issues

### ✅ Safe by Design
- PR merges immediately AFTER CI passes (not before)
- If CI fails, the merge workflow doesn't run
- Claude must fix all issues before merge proceeds

## Understanding `workflow_run`

The `auto-merge-claude.yml` uses a special trigger:

```yaml
on:
  workflow_run:
    workflows: ["CI Checks"]
    types:
      - completed
```

**This means:**
- It runs AFTER the CI Checks workflow finishes
- It has access to the conclusion (success/failure)
- It only runs if conclusion == 'success'

**Why this is better than `pull_request`:**
- We don't merge prematurely
- We wait for actual validation before merging
- No race conditions between CI and merge
- No need to configure branch protection rules

## Testing the System

### Test a Successful PR

1. Create a branch: `git checkout -b claude/test-123`
2. Make a valid change (no errors)
3. Push: `git push origin claude/test-123`
4. Watch the workflows:
   - PR created ✅
   - CI checks run ✅
   - PR merges immediately ✅
   - Branch deleted ✅

### Test a Failing PR

1. Create a branch: `git checkout -b claude/test-456`
2. Add a TypeScript error (e.g., wrong type)
3. Push: `git push origin claude/test-456`
4. Watch the workflows:
   - PR created ✅
   - CI checks run ❌
   - @claude tagged with errors ✅
   - Merge workflow does NOT run ✅
5. Fix the error and push
6. CI runs again ✅
7. Merge workflow runs ✅
8. PR merges immediately ✅

## Troubleshooting

### PR isn't merging automatically

**Check:**
1. Did CI checks pass? (All three: type, lint, build)
2. Is it a `claude/**` branch?
3. Is the PR linked to an issue? (Must have "Fixes #123")
4. Check the auto-merge workflow logs for errors
5. Verify the `auto-merge-claude.yml` workflow ran (not just CI checks)

### @claude isn't being tagged

**Check:**
1. Is the workflow running? (Check Actions tab)
2. Are the error logs being captured?
3. Does the GitHub token have `pull-requests: write` permission?

### CI keeps failing

**Check:**
1. Run locally: `pnpm type-check && pnpm lint && pnpm build`
2. Look at the error messages in the PR comment
3. Claude should automatically fix if tagged properly

## Modifying the Workflows

### Adding New CI Checks

Edit `ci-checks.yml`:

```yaml
- name: Run new check
  id: newcheck
  continue-on-error: true
  run: |
    pnpm run new-check 2>&1 | tee newcheck-output.txt
    exit ${PIPESTATUS[0]}
```

Then add to status determination:

```yaml
NEWCHECK_STATUS="${{ steps.newcheck.outcome }}"
if [ "$TYPECHECK_STATUS" == "success" ] && ... && [ "$NEWCHECK_STATUS" == "success" ]; then
```

And add to error reporting:

```yaml
if [ "${{ steps.newcheck.outcome }}" != "success" ]; then
  ERRORS="${ERRORS}### 🔴 New Check Failed\n\n"
  ERRORS="${ERRORS}\`\`\`\n$(cat newcheck-output.txt | tail -50)\n\`\`\`\n\n"
fi
```

### Changing Merge Strategy

Edit `auto-merge-claude.yml`:

```yaml
gh pr merge "$PR_NUMBER" \
  --repo ${{ github.repository }} \
  --squash \        # Change to --merge or --rebase
  --delete-branch   # Remove to keep branches
```

## Security Notes

### Why This is Safe

1. **Merge only after validation:** CI must pass first
2. **Isolated workflows:** Each workflow has specific permissions
3. **Audit trail:** All merges logged in GitHub
4. **Rollback capability:** Can revert any merged PR
5. **No race conditions:** Merge happens only after CI completes successfully

### Permissions Required

**CI Checks:**
- `contents: read`
- `pull-requests: write` (for comments)
- `issues: write` (for @claude tags)

**Auto-Merge:**
- `contents: write` (for merge)
- `pull-requests: write` (for auto-merge and comments)

## FAQ

**Q: Can I manually merge PRs?**
A: Yes! Auto-merge just provides automation. You can always merge manually.

**Q: What if Claude can't fix the errors?**
A: A human can push fixes or merge manually after reviewing.

**Q: Can I disable automatic merging for specific PRs?**
A: Yes, just don't link it to an issue, or use a branch name that doesn't start with `claude/`.

**Q: Does this work for non-Claude PRs?**
A: CI checks run on ALL PRs. Automatic merging only works for `claude/**` branches.

**Q: What about rate limits?**
A: GitHub Actions has generous limits. This workflow uses minimal API calls.

## Monitoring

### Check Workflow Status

```bash
gh run list --workflow=ci-checks.yml
gh run list --workflow=auto-merge-claude.yml
```

### View Workflow Logs

```bash
gh run view <run-id> --log
```

### Check PR Status

```bash
gh pr view <pr-number> --json statusCheckRollup
```

---

**Last Updated:** 2025-11-23
**Workflows:** ci-checks.yml, auto-merge-claude.yml, auto-create-claude-pr.yml
