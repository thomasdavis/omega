# Self-Evolution Conventions

This document defines the standardized conventions for Omega's self-evolution process, including branch naming, commit messages, labels, and workflow practices.

## Overview

Self-evolution changes are modifications that Omega makes to its own codebase to improve capabilities, fix issues, or adapt to new requirements. These changes require special handling to ensure safety, traceability, and rollback capability.

## Branch Naming Convention

### Format
```
auto/evolve/YYYY-MM-DD
```

### Rules
- **Prefix**: Always use `auto/evolve/` to indicate automated evolution
- **Date**: Use ISO 8601 date format (`YYYY-MM-DD`) representing when the evolution was initiated
- **Single evolution per branch**: Each self-evolution cycle gets its own dated branch
- **No feature suffixes**: The date is sufficient; avoid adding feature names to the branch

### Examples
```bash
# Good
auto/evolve/2025-12-05
auto/evolve/2025-12-20

# Bad
auto/evolve/fix-bug        # Missing date
evolve/2025-12-05          # Missing 'auto/' prefix
auto/evolve/12-05-2025     # Wrong date format
auto/evolve/2025-12-05-feature  # Unnecessary suffix
```

## Commit Message Format

### Primary Format
```
chore(evolve): <description> — YYYY-MM-DD
```

### Alternative Format (for specific features)
```
chore(evolve): <specific feature> — YYYY-MM-DD
```

### Rules
- **Type**: Always use `chore` (self-evolution is infrastructure/tooling work)
- **Scope**: Always use `evolve` to identify self-evolution commits
- **Description**: Clear, concise summary of what changed (not why - that's in the PR)
- **Date separator**: Use em dash (—) not hyphen (-)
- **Date**: Match the branch date

### Examples
```bash
# Good - General evolution
chore(evolve): v0 scaffold — 2025-12-05
chore(evolve): add safety validation checks — 2025-12-05
chore(evolve): improve error handling in evolution loop — 2025-12-05

# Good - Specific feature
chore(evolve): add telemetry for deployment failures — 2025-12-05
chore(evolve): implement rollback detection — 2025-12-05

# Bad
evolve: add feature                    # Wrong type, no date
chore(evolve): add feature - 2025-12-05  # Wrong separator (hyphen not em dash)
feat(evolve): new feature — 2025-12-05   # Wrong type (should be 'chore')
chore: evolution changes                # Missing scope
```

### Co-Authorship
When human developers guide or approve evolution changes, include co-authorship:

```bash
chore(evolve): add safety checks — 2025-12-05

Co-authored-by: Thomas Davis <thomasdavis@users.noreply.github.com>
```

## Labels

All self-evolution pull requests must include these labels:

### Required Labels
1. **`self-evolution`** - Primary identifier for evolution PRs
2. **`safety`** - Indicates safety review required
3. **`ai-ops`** - Marks as AI-driven operational change

### Conditional Labels
- **`database`** - Add if the evolution includes schema changes
- **`breaking-change`** - Add if backwards compatibility is affected
- **`P0`, `P1`, `P2`, `P3`** - Priority level (see `CONTRIBUTING.md`)

### Example Label Set
```
✅ Required:
- self-evolution
- safety
- ai-ops

✅ Conditional:
- database (if schema changes)
- P1 (if high priority)
```

## Pull Request Template

Self-evolution PRs must use the dedicated template at `.github/PULL_REQUEST_TEMPLATE/self-evolution.md`.

### Automatic Template Selection

GitHub will automatically suggest the `self-evolution.md` template when:
- Creating a PR from a branch matching `auto/evolve/**`
- Multiple templates exist in the `PULL_REQUEST_TEMPLATE/` directory

### Manual Template Selection

If creating a PR from a different branch pattern, manually select the template:
```
https://github.com/OWNER/REPO/compare/main...BRANCH?template=self-evolution.md
```

### Required Sections

All self-evolution PRs must complete these sections:
1. **Reflection Summary** - What prompted this and what was learned
2. **Proposed Changes** - Detailed description of modifications
3. **Safety Checks Performed** - All validations completed
4. **Risk Assessment** - Potential risks and mitigation strategies
5. **Rollback Plan** - How to revert if needed
6. **Telemetry/Observability** - Monitoring and success metrics

## Workflow Process

### 1. Evolution Initiation
```bash
# Create dated evolution branch
git checkout -b auto/evolve/2025-12-05
```

### 2. Development
```bash
# Make changes, following existing patterns
# Run safety checks continuously
pnpm type-check
pnpm build
```

### 3. Commit
```bash
# Stage changes
git add .

# Commit with proper format
git commit -m "chore(evolve): v0 scaffold — 2025-12-05"
```

### 4. Push and PR
```bash
# Push to remote
git push origin auto/evolve/2025-12-05

# Create PR using self-evolution template
# Add required labels: self-evolution, safety, ai-ops
```

### 5. Review and Merge
- Complete all sections in PR template
- Pass all CI checks
- Obtain human approval for high-risk changes
- Merge to main after approval

### 6. Monitor
- Track telemetry metrics defined in PR
- Watch for rollback triggers
- Document learnings for next iteration

## Safety Guidelines

### Pre-Submission Checklist
- [ ] TypeScript compilation passes
- [ ] Production build succeeds
- [ ] No breaking changes (or documented and approved)
- [ ] Database migrations are idempotent
- [ ] Rollback plan prepared and tested
- [ ] Monitoring in place

### High-Risk Changes
Changes requiring extra scrutiny:
- Database schema modifications
- Authentication/authorization changes
- External API integrations
- Deployment pipeline modifications
- Workflow automation changes

For high-risk changes:
1. Mark as `P0` or `P1` priority
2. Add detailed risk assessment
3. Prepare and test rollback
4. Require human approval before merge
5. Plan staged rollout if possible

## Monitoring and Telemetry

### Required Metrics
Every evolution should define:
- **Success criteria** - How to know it's working
- **Error indicators** - What signals a problem
- **Performance impact** - Expected resource usage

### Standard Metrics to Track
- Build success rate
- Deployment success rate
- Error rate (pre vs post evolution)
- Performance metrics (response time, throughput)
- Resource usage (memory, CPU)

## Rollback Procedures

### When to Rollback
- CI/CD failures after merge
- Production errors increase significantly
- Performance degradation detected
- User-reported critical issues

### Rollback Methods
1. **Git Revert** (preferred for simple changes)
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Database Rollback** (for schema changes)
   ```bash
   # Run prepared rollback SQL
   railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -f rollback.sql'
   ```

3. **Feature Flag** (for gradual rollout)
   ```bash
   # Disable feature via environment variable
   railway variables --set FEATURE_ENABLED=false
   ```

## Related Documentation

- [Parent Issue: #754](https://github.com/thomasdavis/omega/issues/754) - Self-evolution implementation tracking
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - General contribution guidelines
- [CLAUDE.md](../../CLAUDE.md) - Development environment and tooling
- `.github/PULL_REQUEST_TEMPLATE/self-evolution.md` - PR template

## Examples

### Complete Evolution Cycle Example

```bash
# 1. Create branch
git checkout -b auto/evolve/2025-12-05

# 2. Make changes
# ... implement evolution ...

# 3. Safety checks
pnpm type-check
pnpm build

# 4. Commit
git add .
git commit -m "chore(evolve): add telemetry for failed deployments — 2025-12-05"

# 5. Push
git push origin auto/evolve/2025-12-05

# 6. Create PR with template
# - Use .github/PULL_REQUEST_TEMPLATE/self-evolution.md
# - Add labels: self-evolution, safety, ai-ops
# - Complete all required sections

# 7. Monitor after merge
# - Check defined metrics
# - Watch for errors
# - Prepare rollback if needed
```

## Questions or Improvements?

This is a living document. If you have suggestions for improving the self-evolution process:
- Open an issue with label `self-evolution`
- Discuss in Discord #omega channel
- Propose changes via PR to this document

---

**Last Updated**: 2025-12-05
**Status**: Active
**Owner**: Omega Team
