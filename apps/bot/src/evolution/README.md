# Self-Evolution Engine

Omega's autonomous improvement system implementing a safe, transparent OODA loop (Observe → Orient → Decide → Act).

## Overview

The self-evolution engine allows Omega to:
- Reflect daily on interactions and internal signals
- Generate improvement proposals (capabilities, anticipatory needs, wildcards)
- Select changes behind feature flags with strict safety checks
- Open guarded PRs from auto-created branches
- Never auto-merge (always requires human review)

## Architecture

### Modules

- **observer.ts** - Collects 24h data: messages, tool usage, errors, feelings
- **orienter.ts** - Analyzes pain points, identifies opportunities, scores proposals
- **decider.ts** - Selects proposals based on requirements and risk
- **actor.ts** - Creates branches and PRs (future: applies changes)
- **sanityChecker.ts** - Multi-stage safety validation
- **database.ts** - Persistence for reflections, proposals, checks, flags
- **engine.ts** - Main OODA loop orchestrator
- **config.ts** - Central configuration and constraints
- **types.ts** - TypeScript type definitions

### Database Tables

- `self_reflections` - Daily analyses and signals
- `evolution_proposals` - Candidate improvements
- `sanity_checks` - Safety gate results
- `experiments` - Rollout tracking
- `feature_flags` - Runtime controls
- `evolution_audit_log` - Full audit trail

## Daily Loop (02:00 UTC)

1. **Observe** - Collect messages, errors, tool usage, feelings
2. **Orient** - Cluster pain points, score proposals
3. **Decide** - Select: 1 capability, 1 anticipatory, 1 wildcard
4. **Act** - Create branch, apply diffs, run checks, open PR

## Safety & Sanity Checks

### Blocklist
- Credentials/secrets/env files
- Deployment manifests (beyond allowed edits)
- Critical prompts without guard clauses
- Workflow files

### Allowlist
- `apps/bot/src/tools/`
- `apps/bot/src/lib/prompts/partials/` (with guards)
- `docs/`
- `apps/bot/src/__tests__/`
- `apps/bot/src/evolution/`

### CI Gates
- `pnpm lint`
- `pnpm type-check`
- `pnpm test`
- `pnpm build`
- Max diff size: 500 lines
- Max files: 20

### Persona Guardrails
- **Core identity preserved:** obsidian plates, crimson veins, stoic presence
- **Allowed micro-variations:** comedic-mouth frequency, timing params, docs
- **Requires approval:** visual appearance, personality voice, core prompts
- **Strictly forbidden:** removing stoic demeanor, changing aesthetic

## Feature Flags

All behavior changes must be behind feature flags:

```typescript
import { getFeatureFlag } from './evolution/database.js';

const flag = await getFeatureFlag('new_feature');
if (flag?.enabled) {
  // New behavior
}
```

## Rollback

1. Immediate PR revert
2. Flag disable: `UPDATE feature_flags SET enabled = false WHERE key = 'X'`
3. Monitor for 24h

## Configuration

See `config/evolution/` for:
- `allowlist.json` - Permitted paths
- `blocklist.json` - Forbidden paths and operations
- `risk-matrix.json` - Risk thresholds and scoring

## Usage

### Manual Trigger (Testing)

```typescript
import { runEvolutionCycle } from './evolution/index.js';

const result = await runEvolutionCycle();
console.log(result.summary);
```

### Scheduled (Production)

Runs automatically via `.github/workflows/evolution.yml` at 02:00 UTC daily.

## Implementation Phases

- **Phase 0** ✅ Database + infrastructure + PR template (current)
- **Phase 1** - Observer reports only (no code changes)
- **Phase 2** - Proposal generation + dry-run checks
- **Phase 3** - Auto-branch + auto-PR (no auto-merge)
- **Phase 4** - Feedback loop, success metrics, iteration

## Integration Points

Existing tools used:
- `queryMessages` - Conversation analytics
- `introspectFeelings` - Internal signals
- `autonomousInsightAgent` - Pattern detection
- `githubCreateIssue/githubFixIssues` - Tracking and review

## Wildcard Feature Policy

**Scope:** Very small, reversible, fun
**Examples:**
- Comedic-mouth pulse probability param
- Smart callback quip library
- Tiny ASCII graph preset
- Safe text transformer
- Harmless utility alias

**Requirements:**
- Must be reversible
- Must align with identity
- Must be low risk
- Must be scoped small

## Monitoring

Daily summary posted to tracking issue with:
- Top insights
- Proposals generated
- Actions taken
- PR links

## Example Workflow

1. Cron triggers at 02:00 UTC
2. Engine observes last 24h
3. Generates 2-4 proposals
4. Selects best proposals (meeting quotas)
5. Runs sanity checks
6. Creates branch `evolve/YYYY-MM-DD/short-slug`
7. Opens PR with checklist and risk assessment
8. Requests review from maintainers
9. Awaits human approval (never auto-merges)

## Security

- No auto-merge capability
- All PRs require human review
- Blocked paths enforced
- Feature flags default to disabled
- Audit log for all actions
- Rollback plans mandatory
