# Self-Evolution Framework

Omega's autonomous daily improvement system that reflects, proposes changes, and ships low-risk improvements automatically while gating higher-risk work behind approval.

## Overview

The Self-Evolution Framework enables Omega to:
- **Reflect** on recent interactions and performance daily
- **Propose** improvements across capabilities, infrastructure, persona, and wildcards
- **Score** candidates by risk, impact, effort, and novelty
- **Guard** against breaking changes with sanity checks
- **Implement** low-risk changes autonomously (when enabled)
- **Report** all activities transparently to GitHub and Discord

## Configuration

### Environment Variables

```bash
# Enable/disable self-evolution (default: false)
SELF_EVOLVE_ENABLED=false

# Cron schedule (default: 2:00 AM UTC daily)
SELF_EVOLVE_CRON="0 2 * * *"

# Approval token for manual triggers (optional)
SELF_EVOLVE_TOKEN="your-secret-token"
```

### Safety Defaults

- **Disabled by default**: Set `SELF_EVOLVE_ENABLED=true` to enable
- **Dry-run mode**: When disabled, runs reflection and reporting without changes
- **Approval gates**: Risk ≥ 4 requires human approval
- **Rate limits**: Max 1 code/tool change per day, persona changes must be minor

## Daily Cycle

### Phase 1: Reflect (02:00 UTC)
- Summarize last 24 hours of interactions
- Extract pain points, missed capabilities, friction
- Analyze user sentiment trends
- Gather performance metrics

**Tools Used:**
- `queryMessages` - Natural language SQL queries
- `autonomousInsightAgent` - Comprehensive analysis
- `introspectFeelings` - Bot internal state

### Phase 2: Propose
- Generate 3-6 candidate improvements
- Categories:
  - **Capability**: New tools, integrations, workflows
  - **Anticipatory**: Infrastructure, docs, future needs
  - **Persona**: UX/tone adjustments within brand constraints
  - **Wildcard**: Creative/experimental (fun, but safe)
- Score each (0-5): risk, impact, effort, novelty
- Calculate priority: `(impact * 2 + novelty - risk * 1.5 - effort * 0.5)`
- Select top 2 (max 1 code + 1 persona/wildcard)

### Phase 3: Sanity & Guardrails
- Verify max 1 code change per day
- Ensure persona changes are low risk (< 3)
- Block unapproved high-risk changes (≥ 4)
- Require minimum impact (≥ 3)
- Auto-rollback on failed health checks

### Phase 4: Approval Check
- Risk ≥ 4: Requires human approval (@thomasdavis or designated reviewer)
- Risk < 4: Proceeds to implementation (if enabled)
- Schema/tool registry/prompt changes: Always require approval

### Phase 5: Implement (when enabled)
- Create branch: `evolve/daily-YYYY-MM-DD`
- Generate/update code or config
- Commit with clear message and cross-links
- Open PR with test requirements
- Run CI checks
- Auto-merge on green (low-risk only)
- Post-merge health checks
- Auto-rollback on failure

## Database Schema

### Tables

- **self_evolution_runs**: Daily run records
- **self_evolution_candidates**: Proposed improvements
- **self_evolution_actions**: Implemented changes (branch/PR/commit)
- **self_evolution_metrics**: Performance KPIs
- **self_evolution_sanity**: Guardrail results
- **self_evolution_approvals**: Human approval records

### Migration

```bash
# Run via Railway CLI
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-self-evolution-tables.sh'

# Update Prisma schema
cd packages/database
pnpm prisma db pull
pnpm prisma generate
```

## Safety Constraints

### Identity Guardrails
Persona/appearance tweaks must remain within Omega's defined identity:
- ✅ Allowed: Humor intensity, mouth usage frequency, lighting emphasis, minor wording
- ❌ Forbidden: Wholesale rebrand, removing core tools, violating platform rules

### Technical Guardrails
- No removal of core tools
- No platform rule violations (robots.txt, content policy)
- Feature flags for behavioral changes
- Canary rollout (default 10%) for risky changes
- Fast rollback via single commit revert or GitHub UI

### Kill Switch
Set `SELF_EVOLVE_ENABLED=false` to immediately disable all autonomous changes.

## Manual Triggers

### Via Code
```typescript
import { triggerSelfEvolutionNow } from '@repo/agent';

const result = await triggerSelfEvolutionNow();
console.log(result.summary);
```

### Via Webhook (TODO)
```bash
curl -X POST https://omega.example.com/tasks/self-evolve \
  -H "Authorization: Bearer $SELF_EVOLVE_TOKEN"
```

## Reporting

### GitHub Issue Comments
Daily summaries posted to [Issue #753](https://github.com/thomasdavis/omega/issues/753) with:
- Reflection summary
- Selected candidates with scores
- Branch/PR links (when applicable)
- Sanity check results
- Rollback status

### Discord (Optional)
Post to `#ops` channel with similar info (TODO: configure channel).

### Metrics Tracked
- Pain points count
- Missed capabilities count
- Tool usage rate
- Response quality
- User satisfaction
- Success rate (merged vs total runs)
- Rollback rate

## Phased Rollout

### Phase 1: Foundation (Current)
- ✅ Database schema and migrations
- ✅ Reflection pipeline with Claude
- ✅ Candidate generation and scoring
- ✅ Sanity checks and guardrails
- ✅ Dry-run reporting to GitHub
- ✅ Scheduler integration (node-cron)

### Phase 2: Implementation (Next)
- ⏳ Branch creation via GitHub API
- ⏳ PR creation with auto-generated descriptions
- ⏳ CI integration and status checks
- ⏳ Auto-merge logic for low-risk changes
- ⏳ Post-merge health checks
- ⏳ Automatic rollback on failure

### Phase 3: Advanced Safety (Future)
- ⏳ Approval workflow UI
- ⏳ Feature flag integration
- ⏳ Canary deployment system
- ⏳ A/B testing for persona changes
- ⏳ Weekly digest reports

### Phase 4: Wildcard & Creativity (Future)
- ⏳ Wildcard feature library
- ⏳ Persona micro-tuning presets
- ⏳ Creative experimentation framework
- ⏳ User feedback integration

## Development

### Running Tests
```bash
cd packages/agent
pnpm test src/services/selfEvolutionService.test.ts
```

### Local Testing
```bash
# Dry run (safe, no changes)
SELF_EVOLVE_ENABLED=false pnpm dev

# Enable with caution
SELF_EVOLVE_ENABLED=true pnpm dev
```

### Debugging
Check logs for:
- `🧠 Self-Evolution: DRY RUN mode` - Reflection only
- `🧠 Self-Evolution: LIVE mode` - Changes enabled
- `📊 Created run #N` - Run started
- `✅ Self-evolution completed` - Success
- `❌ Self-evolution failed` - Error

## Governance

### Approval Requirements
- **Auto-approve**: Risk < 4, low-risk persona changes
- **Human approval**: Risk ≥ 4, schema changes, tool registry, prompt architecture
- **Designated reviewers**: @thomasdavis, optional co-review by designated Discord user

### Rollback Process
1. Automatic: Post-merge health checks fail → revert commit
2. Manual: GitHub UI → Revert PR → Merge revert
3. Emergency: Set `SELF_EVOLVE_ENABLED=false` + manual rollback

## FAQ

**Q: Is this safe?**
A: Yes. Multiple safety layers: dry-run mode, risk scoring, sanity checks, approval gates, kill switch, auto-rollback.

**Q: Can it break Omega?**
A: Not easily. Low-risk changes only when enabled. High-risk requires approval. All changes are revertible.

**Q: How do I disable it?**
A: Set `SELF_EVOLVE_ENABLED=false`. Changes stop immediately.

**Q: What happens in dry-run mode?**
A: Reflection, analysis, and reporting only. No code changes.

**Q: Can it change Omega's personality?**
A: Only minor adjustments within defined brand constraints. Wholesale changes require approval.

**Q: How often does it run?**
A: Daily at 2:00 AM UTC by default. Configurable via `SELF_EVOLVE_CRON`.

**Q: Where are reports posted?**
A: GitHub issue #753 and optionally Discord #ops channel.

**Q: Can I manually trigger it?**
A: Yes, call `triggerSelfEvolutionNow()` or use webhook endpoint (when implemented).

## Links

- [Issue #753](https://github.com/thomasdavis/omega/issues/753) - Main tracking issue
- [Database Service](../packages/database/src/postgres/selfEvolutionService.ts)
- [Agent Service](../packages/agent/src/services/selfEvolutionService.ts)
- [Scheduler](../packages/agent/src/services/scheduler.ts)
