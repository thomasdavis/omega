# Self-Evolution Conventions

This document outlines the standardized conventions for Omega's self-evolution changes, including branch naming, commit messages, and labeling.

## Branch Naming Convention

All self-evolution changes should use the following branch naming pattern:

```
auto/evolve/YYYY-MM-DD
```

**Examples:**
- `auto/evolve/2025-12-05` - Evolution changes made on December 5, 2025
- `auto/evolve/2025-12-06` - Evolution changes made on December 6, 2025

### Guidelines:
- Use the date when the evolution work begins
- Multiple evolution PRs on the same day should use suffixes: `auto/evolve/2025-12-05-a`, `auto/evolve/2025-12-05-b`
- For feature-specific evolution work, you may append a descriptor: `auto/evolve/2025-12-05-error-handling`

## Commit Message Convention

Commit messages for self-evolution changes should follow this format:

```
chore(evolve): <description> — YYYY-MM-DD
```

**Examples:**
- `chore(evolve): v0 scaffold — 2025-12-05`
- `chore(evolve): improve error handling in agent synthesis — 2025-12-05`
- `chore(evolve): add telemetry for tool execution — 2025-12-06`

### Guidelines:
- Use `chore(evolve):` prefix for all self-evolution commits
- Keep descriptions concise but meaningful
- Always include the date at the end
- For scaffolding/initial work, use "v0 scaffold"
- For specific features, describe the feature clearly

## Pull Request Labels

All self-evolution pull requests must include these labels:

### Required Labels:
- **`self-evolution`** - Identifies this as a self-evolution change
- **`safety`** - Indicates safety checks are required
- **`ai-ops`** - Tags this as an AI operations change

### Optional Labels (use as appropriate):
- **`breaking-change`** - If the change breaks backward compatibility
- **`documentation`** - If significant documentation is added/changed
- **`database`** - If database schema changes are included
- **`enhancement`** - For new features or improvements
- **`refactor`** - For code refactoring without behavior changes
- **`performance`** - For performance optimizations

## Pull Request Template

Self-evolution PRs automatically use the `.github/PULL_REQUEST_TEMPLATE/self-evolution.md` template when the branch matches the `auto/evolve/**` pattern.

### GitHub's Multiple PR Template Feature

GitHub supports multiple PR templates through:

1. **Directory-based templates**: Place templates in `.github/PULL_REQUEST_TEMPLATE/`
2. **Manual selection**: Users can append `?template=template-name.md` to the PR URL
3. **Automatic selection**: Workflows or conventions guide which template to use

For self-evolution changes:
- Use the `self-evolution.md` template
- Access via URL parameter: `?template=self-evolution.md`
- Or reference from issue/workflow automation

## Template Sections

The self-evolution template includes these mandatory sections:

1. **Reflection Summary** - High-level overview and rationale
2. **Proposed Changes** - Specific changes made
3. **Safety Checks Performed** - Validation checklist
4. **Risk Assessment** - Evaluation of potential risks
5. **Rollback Plan** - Steps to revert if needed
6. **Telemetry/Observability** - Monitoring and logging

## Workflow Integration

### Creating a Self-Evolution PR

1. Create a branch following the naming convention: `auto/evolve/YYYY-MM-DD`
2. Make your changes and commit with proper message format
3. When creating the PR, use the self-evolution template:
   ```
   https://github.com/thomasdavis/omega/compare/main...auto/evolve/2025-12-05?template=self-evolution.md
   ```
4. Add required labels: `self-evolution`, `safety`, `ai-ops`
5. Complete all sections in the template
6. Request review from appropriate maintainers

### Review Requirements

Self-evolution PRs require:
- ✅ All safety checks completed
- ✅ Risk assessment documented
- ✅ Rollback plan defined
- ✅ At least one human review approval
- ✅ All CI checks passing
- ✅ Telemetry/observability plan in place

## Safety Guidelines

All self-evolution changes must adhere to these safety principles:

### Code Safety
- No unsafe type assertions or `any` types
- Proper error handling at all system boundaries
- Input validation for external data
- No hardcoded credentials or secrets

### Operational Safety
- Changes are reversible
- Backward compatibility maintained (unless explicitly marked as breaking)
- Database migrations are idempotent
- Feature flags for risky changes

### Testing Safety
- Type checking passes (`pnpm type-check`)
- Build succeeds (`pnpm build`)
- No breaking changes to existing tests (unless intentional)
- Edge cases considered

## Examples

### Example 1: Scaffolding Work
```
Branch: auto/evolve/2025-12-05
Commit: chore(evolve): v0 scaffold — 2025-12-05
Labels: self-evolution, safety, ai-ops
```

### Example 2: Feature Addition
```
Branch: auto/evolve/2025-12-06-telemetry
Commit: chore(evolve): add comprehensive telemetry system — 2025-12-06
Labels: self-evolution, safety, ai-ops, enhancement
```

### Example 3: Refactoring
```
Branch: auto/evolve/2025-12-07
Commit: chore(evolve): refactor agent synthesis for clarity — 2025-12-07
Labels: self-evolution, safety, ai-ops, refactor
```

## Related Documentation

- Parent Issue: [#754](https://github.com/thomasdavis/omega/issues/754)
- PR Template: [.github/PULL_REQUEST_TEMPLATE/self-evolution.md](../../.github/PULL_REQUEST_TEMPLATE/self-evolution.md)
- Contributing Guidelines: [CONTRIBUTING.md](../../CONTRIBUTING.md)

## Revision History

- 2025-12-05: Initial conventions established (Issue #764)
