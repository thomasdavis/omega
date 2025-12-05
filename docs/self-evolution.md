# Self-Evolution Framework

## Overview

The Self-Evolution Framework enables Omega to iteratively improve itself through a safe, scheduled daily cycle. Each day, Omega analyzes recent interactions, proposes improvements, and creates a PR with gated changes.

## Architecture

### OODA Loop

The framework follows an OODA (Observe, Orient, Decide, Act) loop:

1. **Observe** - Analyze last 24h of messages, tools, errors, and sentiment
2. **Orient** - Identify friction points and opportunities
3. **Decide** - Select 2-3 actions across tracks:
   - Capability/infrastructure improvement
   - Anticipatory/future need
   - Wildcard (personality/appearance tweak or fun utility)
4. **Act** - Create branch/PR with proposed changes
5. **Record** - Log all artifacts to PostgreSQL

### Database Schema

Five tables track self-evolution cycles:

- `self_evolution_cycles` - Daily cycle metadata and status
- `self_evolution_actions` - Proposed/completed actions per cycle
- `self_evolution_sanity_checks` - Safety validation results
- `self_evolution_metrics` - Quantitative signals (volume, errors, etc.)
- `self_evolution_branches` - Git branch and PR tracking

### Safety Guardrails

- **Kill Switch** - `SELF_EVOLUTION_KILL_SWITCH` environment variable
- **Deployment Detection** - Skips if recent commit (< 30 min)
- **Duplicate Prevention** - Checks for existing cycle before running
- **Jitter** - Random 0-20 minute delay to avoid thundering herd
- **Dry Run Mode** - Analyze without making changes
- **Failure Notifications** - Auto-creates GitHub issue on failure

## Configuration

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...          # PostgreSQL connection string
GITHUB_TOKEN=ghp_...                   # GitHub API token

# Optional
SELF_EVOLUTION_KILL_SWITCH=false      # Emergency disable
DRY_RUN=false                          # Analyze without changes
ANTHROPIC_API_KEY=sk-...               # Claude API for analysis
```

### Repository Secrets

Set these in GitHub Settings → Secrets:

- `DATABASE_PUBLIC_URL` - Railway PostgreSQL connection string
- `SELF_EVOLUTION_KILL_SWITCH` - Kill switch (default: false)

## Usage

### Automatic Daily Runs

The framework runs automatically at **02:00 UTC daily** via GitHub Actions.

Workflow: `.github/workflows/self-evolution.yml`

### Manual Trigger

Run manually via GitHub Actions:

1. Go to **Actions** → **Self-Evolution - Daily Cycle**
2. Click **Run workflow**
3. Options:
   - `dry_run` - Analyze without making changes
   - `force_run` - Run even if already ran today

### Dry Run (Local Testing)

```bash
cd apps/bot
export DATABASE_URL="postgresql://..."
export GITHUB_TOKEN="ghp_..."
export DRY_RUN=true

pnpm tsx src/scripts/self-evolution-cycle.ts
```

## Monitoring

### Check Recent Cycles

```sql
SELECT
  cycle_date,
  status,
  summary,
  wildcard_title,
  (ended_at - started_at) as duration
FROM self_evolution_cycles
ORDER BY cycle_date DESC
LIMIT 10;
```

### View Actions by Cycle

```sql
SELECT
  type,
  title,
  status,
  pr_number
FROM self_evolution_actions
WHERE cycle_id = <cycle_id>
ORDER BY created_at;
```

### Metrics Dashboard

```sql
SELECT
  c.cycle_date,
  MAX(CASE WHEN m.metric_name = 'message_volume_24h' THEN m.metric_value END) as messages,
  MAX(CASE WHEN m.metric_name = 'error_count_24h' THEN m.metric_value END) as errors,
  MAX(CASE WHEN m.metric_name = 'actions_proposed' THEN m.metric_value END) as actions
FROM self_evolution_cycles c
LEFT JOIN self_evolution_metrics m ON m.cycle_id = c.id
GROUP BY c.cycle_date
ORDER BY c.cycle_date DESC
LIMIT 30;
```

## Database Maintenance

### Cleanup Old Cycles (180 day retention)

```bash
# Via Railway CLI
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "DELETE FROM self_evolution_cycles WHERE cycle_date < CURRENT_DATE - INTERVAL '\''180 days'\'' AND status IN ('\''completed'\'', '\''failed'\'', '\''reverted'\'')"'
```

Or use the service function:

```typescript
import { selfEvolutionService } from '@repo/database';

await selfEvolutionService.cleanupOldCycles(180);
```

## Troubleshooting

### Cycle Not Running

1. Check kill switch: `echo $SELF_EVOLUTION_KILL_SWITCH`
2. Check recent commits: Recent deployment may block execution
3. Check existing cycle: May have already run today
4. Check workflow logs: Actions → Self-Evolution - Daily Cycle

### Database Connection Issues

```bash
# Test connection
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM self_evolution_cycles"'
```

### Failed Cycle

A GitHub issue is automatically created on failure with:
- Link to workflow run
- Error details
- Suggested remediation

## Roadmap

### Phase 1 (Current)
- [x] Database schema and migrations
- [x] Repository layer
- [x] Orchestrator script with OODA loop
- [x] GitHub Actions workflow
- [x] Safety guardrails

### Phase 2 (Future)
- [ ] Actual PR creation via GitHub API
- [ ] Feature flag integration
- [ ] Health checks and canary deployment
- [ ] Auto-revert on CI failure
- [ ] Claude API integration for intelligent analysis
- [ ] Retention policy automation

### Phase 3 (Advanced)
- [ ] Machine learning for action selection
- [ ] A/B testing framework
- [ ] User feedback integration
- [ ] Performance regression detection
- [ ] Automated rollback triggers

## API Reference

### Service Layer

```typescript
import { selfEvolutionService } from '@repo/database';

// Create cycle
const cycleId = await selfEvolutionService.createCycle({
  cycleDate: '2025-12-05',
  summary: 'Daily cycle',
  wildcardTitle: 'Add quip library'
});

// Add action
const actionId = await selfEvolutionService.createAction({
  cycleId,
  type: 'capability',
  title: 'Improve error handling',
  description: 'Add retry logic for failed operations'
});

// Record metric
await selfEvolutionService.createMetric({
  cycleId,
  metricName: 'message_volume_24h',
  metricValue: 1250,
  unit: 'messages'
});

// Update cycle status
await selfEvolutionService.updateCycle({
  cycleId,
  status: 'completed',
  endedAt: new Date()
});
```

See `packages/database/src/postgres/selfEvolutionService.ts` for full API.

## Contributing

When modifying the self-evolution framework:

1. Test in dry-run mode first
2. Ensure all safety checks pass
3. Update this documentation
4. Add tests for new features
5. Consider backward compatibility

## References

- [Issue #751](https://github.com/thomasdavis/omega/issues/751) - Original specification
- [CLAUDE.md](../CLAUDE.md) - Database configuration
- [Database Migrations](../packages/database/scripts/) - Migration scripts
