# Self-Evolution Framework

## Overview

The Self-Evolution Framework enables Omega to improve itself daily through a safe, structured reflective loop. Each day, Omega analyzes recent interactions, proposes improvements across multiple tracks, performs sanity checks, and creates implementation plans with proper guardrails.

## Architecture

### OODA Loop

The framework follows the OODA (Observe, Orient, Decide, Act) decision-making model:

1. **OBSERVE**: Analyze last 24h of messages, tool usage, errors, and sentiment
2. **ORIENT**: Cluster user needs, identify friction points, and detect opportunities
3. **DECIDE**: Select 2-3 improvements (capability + future + wildcard)
4. **ACT**: Create branch, record actions, and prepare implementation
5. **RECORD**: Store metrics, summaries, and audit trail

### Components

#### Database Layer
- **Tables**: 5 PostgreSQL tables track cycles, actions, sanity checks, metrics, and branches
- **Service**: `selfEvolutionService.ts` provides CRUD operations
- **Schema**: Prisma models with proper relations and indexes

#### Orchestrator
- **Service**: `selfEvolutionOrchestrator.ts` implements the OODA loop
- **AI Analysis**: Uses GPT-4 to analyze patterns and propose improvements
- **Message Integration**: Queries conversation history for insights

#### Scheduler
- **Workflow**: GitHub Actions runs daily at 02:00 UTC
- **Manual Trigger**: Can be triggered on-demand via workflow_dispatch
- **Environment Control**: Kill switch and feature flags

## Database Schema

### Tables

#### `self_evolution_cycles`
Tracks each daily evolution cycle:
- `id` - Auto-incrementing primary key
- `cycle_date` - Unique date for each cycle
- `started_at`, `ended_at` - Timestamps
- `summary` - AI-generated cycle summary
- `wildcard_title` - Title of wildcard improvement
- `status` - Cycle status (planned, running, completed, failed, reverted)

#### `self_evolution_actions`
Records improvement actions:
- `id` - Auto-incrementing primary key
- `cycle_id` - Foreign key to cycles
- `type` - Action type (capability, future, wildcard, prompt, persona)
- `title`, `description` - Action details
- `issue_number`, `pr_number` - GitHub integration
- `branch_name` - Associated git branch
- `status` - Action status (planned, in_progress, done, skipped, reverted, failed)
- `notes` - Implementation notes

#### `self_evolution_sanity_checks`
Stores safety verification results:
- `id` - Auto-incrementing primary key
- `cycle_id` - Foreign key to cycles
- `check_name` - Name of the check
- `passed` - Boolean result
- `result` - Result category (pass, warn, fail)
- `details` - JSON details

#### `self_evolution_metrics`
Quantitative metrics per cycle:
- `id` - Auto-incrementing primary key
- `cycle_id` - Foreign key to cycles
- `metric_name` - Metric identifier
- `metric_value` - Numeric value
- `unit` - Unit of measurement
- `details` - JSON metadata

#### `self_evolution_branches`
Git branch tracking:
- `id` - Auto-incrementing primary key
- `cycle_id` - Foreign key to cycles
- `branch_name` - Unique branch name
- `base_branch` - Base branch (usually 'main')
- `pr_number` - Associated PR
- `merged`, `closed` - Status flags

## Configuration

### Environment Variables

#### `SELF_EVOLUTION_ENABLED`
Kill switch for the entire framework.
- **Type**: Boolean (true/false or 1/0)
- **Default**: false
- **Required**: Yes (to run cycles)
- **Example**: `SELF_EVOLUTION_ENABLED=true`

#### `SELF_EVOLUTION_FEATURE_FLAGS`
Comma-separated list of feature flags.
- **Type**: String
- **Default**: Empty
- **Example**: `SELF_EVOLUTION_FEATURE_FLAGS=wildcard,persona`

### GitHub Actions Variables

Set these in GitHub repository settings under Settings → Secrets and variables → Actions → Variables:

- `SELF_EVOLUTION_ENABLED` - Enable/disable daily runs
- `SELF_EVOLUTION_FEATURE_FLAGS` - Feature flags

### GitHub Secrets

Required secrets (should already be configured):
- `DATABASE_PUBLIC_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key for GPT-4
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

## Usage

### Setup

1. **Run Migration**:
   ```bash
   railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-self-evolution-tables.sh'
   ```

2. **Update Prisma Client**:
   ```bash
   cd packages/database
   pnpm prisma db pull
   pnpm prisma generate
   ```

3. **Enable Framework**:
   - Go to repository Settings → Secrets and variables → Actions → Variables
   - Add variable: `SELF_EVOLUTION_ENABLED` = `true`

4. **Wait for Scheduled Run**:
   - Runs daily at 02:00 UTC
   - Or trigger manually via Actions → "Self-Evolution - Daily Cycle" → Run workflow

### Manual Trigger

To test the framework:

1. Go to GitHub Actions
2. Select "Self-Evolution - Daily Cycle"
3. Click "Run workflow"
4. Check "Force run even if disabled" if testing without enabling the framework
5. Click "Run workflow"

### Viewing Results

#### Database Queries

```sql
-- View recent cycles
SELECT * FROM self_evolution_cycles
ORDER BY cycle_date DESC
LIMIT 10;

-- View actions from latest cycle
SELECT a.*
FROM self_evolution_actions a
JOIN self_evolution_cycles c ON a.cycle_id = c.id
WHERE c.cycle_date = CURRENT_DATE;

-- View metrics
SELECT m.*
FROM self_evolution_metrics m
JOIN self_evolution_cycles c ON m.cycle_id = c.id
ORDER BY c.cycle_date DESC, m.metric_name;

-- Failed sanity checks
SELECT s.*, c.cycle_date
FROM self_evolution_sanity_checks s
JOIN self_evolution_cycles c ON s.cycle_id = c.id
WHERE s.passed = false
ORDER BY c.cycle_date DESC;
```

#### GitHub Actions

- Check workflow runs under Actions tab
- View job summaries for cycle details
- Download artifacts for logs

## Safety Mechanisms

### Guardrails

1. **Kill Switch**: `SELF_EVOLUTION_ENABLED` must be explicitly set to true
2. **Feature Flags**: Individual features can be gated
3. **Sanity Checks**: Type checks and builds run after each cycle
4. **Action Limits**: Maximum 1 wildcard per day
5. **Status Tracking**: Every action and cycle has a status
6. **Audit Trail**: Complete history in database

### Rollback Strategy

1. **Database Level**: Cycles can be marked as 'reverted'
2. **Git Level**: Branches and PRs tracked, can be closed/reverted
3. **Feature Flags**: Can disable individual features
4. **Kill Switch**: Can disable entire framework immediately

### Protected Areas

The framework explicitly avoids:
- Core message handling changes
- Tool orchestration modifications
- Visual identity overhauls
- Database breaking changes

Wildcard changes are constrained to:
- Personality quips
- Visual micro-variations
- Fun utilities
- Minor UX improvements

## Development

### Adding New Metrics

```typescript
import { createMetric } from '@repo/database';

await createMetric({
  cycleId,
  metricName: 'your_metric_name',
  metricValue: 123.45,
  unit: 'count', // or 'ratio', 'ms', etc.
  details: { custom: 'metadata' }
});
```

### Adding New Sanity Checks

```typescript
import { createSanityCheck } from '@repo/database';

await createSanityCheck({
  cycleId,
  checkName: 'your_check_name',
  passed: true,
  result: 'pass', // or 'warn', 'fail'
  details: { checkDetails: 'here' }
});
```

### Extending the Orchestrator

The orchestrator is modular. To add new analysis:

1. Create a new function in `selfEvolutionOrchestrator.ts`
2. Call it from `runDailyCycle()`
3. Store results using the service layer
4. Update the summary generation

### Testing Locally

```bash
# Set environment variables
export DATABASE_URL="postgresql://..."
export SELF_EVOLUTION_ENABLED=true
export OPENAI_API_KEY="sk-..."
export GITHUB_TOKEN="ghp_..."
export GITHUB_REPO="owner/repo"

# Run the orchestrator
cd packages/agent
node --loader ts-node/esm src/services/selfEvolutionOrchestrator.ts
```

## Metrics Tracked

### Default Metrics
- `message_volume` - Number of messages in 24h
- `error_count` - Tool execution errors
- `user_satisfaction` - Sentiment-based satisfaction ratio (0-1)
- `actions_selected` - Number of actions planned

### Future Metrics
- Tool usage coverage
- Response quality deltas
- Time-to-resolution changes
- Bug frequency trends

## Retention Policy

### Current Implementation
- All data is retained indefinitely
- Indexes optimize queries on recent data

### Recommended Policy (Future)
- Keep detailed logs for 180 days
- Keep summaries and metrics indefinitely
- Archive old cycles to separate table

Implementation:
```typescript
import { deleteOldCycles } from '@repo/database';

// Delete cycles older than 180 days
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 180);
await deleteOldCycles(cutoffDate);
```

## Troubleshooting

### Cycle Not Running

1. Check `SELF_EVOLUTION_ENABLED` is set to `true`
2. Verify GitHub Actions workflow is enabled
3. Check workflow run logs in Actions tab
4. Ensure database migration completed successfully

### Database Errors

1. Verify migration ran: `SELECT * FROM self_evolution_cycles LIMIT 1;`
2. Check connection string: `echo $DATABASE_PUBLIC_URL`
3. Ensure Prisma client is generated: `cd packages/database && pnpm prisma generate`

### Type Errors

1. Rebuild database package: `cd packages/database && pnpm build`
2. Regenerate Prisma client: `pnpm prisma generate`
3. Run type check: `pnpm type-check`

### AI Analysis Failures

1. Check OpenAI API key is valid
2. Verify sufficient message history exists
3. Check AI service logs in workflow output

## Future Enhancements

### Phase 2 (Not Yet Implemented)
- [ ] Automated PR creation with implementation
- [ ] Canary deployments for changes
- [ ] Auto-revert on failed sanity checks
- [ ] Integration with existing tools (createIssue, etc.)
- [ ] Dashboard for cycle visualization
- [ ] Slack/Discord notifications
- [ ] A/B testing for wildcard changes
- [ ] User feedback integration
- [ ] Automated testing of proposed changes

### Phase 3 (Vision)
- [ ] Multi-agent collaboration on improvements
- [ ] Reinforcement learning from outcomes
- [ ] Cross-repository evolution (if Omega has multiple instances)
- [ ] Community voting on wildcard proposals
- [ ] Evolution marketplace (share improvements)

## References

- [Issue #751](https://github.com/thomasdavis/omega/issues/751) - Original feature request
- [CLAUDE.md](../CLAUDE.md) - Repository configuration
- [Database Migration Guide](../CLAUDE.md#database-configuration)
- [OODA Loop](https://en.wikipedia.org/wiki/OODA_loop) - Decision-making framework

## License

Same as parent repository.
