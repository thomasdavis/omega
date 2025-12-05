# Self-Evolution Observatory Scripts

Scripts for auditing and monitoring self-evolution runs, guardrails, and metrics.

## Overview

The Self-Evolution Observatory provides insights into autonomous evolution performance through:
- **Guardrail pass rates** - How often safety checks pass
- **PR cycle times** - Time from PR creation to merge
- **Rollback counts** - Number of reverts needed
- **Category selection** - Features chosen vs rejected
- **Wildcard adoption** - Success rate of experimental features

## Database Schema

The observatory uses the following tables (created by `packages/database/scripts/create-self-evolution-tables.sh`):

- `self_evolution_runs` - Main execution log
- `self_evolution_guardrails` - Pass/fail tracking for safety checks
- `self_evolution_pr_cycles` - PR lifecycle metrics
- `self_evolution_rollbacks` - Revert and rollback tracking
- `self_evolution_categories` - Feature category decisions
- `self_evolution_wildcards` - Experimental feature adoption
- `self_evolution_metrics` - Aggregated metrics snapshots

## Usage

### Running the Audit Script

```bash
# With DATABASE_URL set
tsx scripts/self_evolution/audit.ts

# With explicit connection
DATABASE_URL=postgresql://... tsx scripts/self_evolution/audit.ts
```

The audit script:
1. Connects to the database
2. Calculates metrics for each run
3. Stores snapshots in `self_evolution_metrics` table
4. Exports JSON to `apps/bot/public/data/self-evolution-metrics.json`

### Setting Up the Workflow

**Note:** Due to GitHub App permissions, the workflow file cannot be created automatically.

To enable nightly audits:

1. Create `.github/workflows/self_evolution_audit.yml` from the template:
   ```bash
   cp .github/workflows/self_evolution_audit.yml.template .github/workflows/self_evolution_audit.yml
   ```

2. Commit and push:
   ```bash
   git add .github/workflows/self_evolution_audit.yml
   git commit -m "feat: add self-evolution audit workflow"
   git push
   ```

The workflow will run:
- Nightly at 2 AM UTC
- After merges to `main` that touch audit scripts
- Manually via workflow_dispatch

### Viewing the Dashboard

After the audit runs, view metrics at:
```
https://omega.thomasdavis.io/self-evolution.html
```

Or locally:
```
/apps/bot/public/self-evolution.html
```

## Metrics Calculated

### Guardrail Pass Rate
Percentage of guardrail checks that passed:
```sql
(passed_guardrails / total_guardrails) * 100
```

### Average PR Cycle Time
Mean time from PR creation to merge:
```sql
AVG(merged_at - created_at)
```

### Rollback Count
Total number of rollbacks per run:
```sql
COUNT(*) FROM self_evolution_rollbacks WHERE run_id = ...
```

### Categories Chosen vs Rejected
Count of feature categories selected or discarded:
```sql
SUM(CASE WHEN chosen THEN 1 ELSE 0 END)
```

### Wildcard Adoption Rate
Percentage of experimental features adopted:
```sql
(adopted_wildcards / total_wildcards) * 100
```

## Data Export

Metrics are exported to JSON format:

```json
{
  "generatedAt": "2025-12-05T21:00:00Z",
  "totalRuns": 30,
  "runs": [
    {
      "runId": "run-2025-12-05-001",
      "startedAt": "2025-12-05T20:00:00Z",
      "status": "completed",
      "guardrailPassRate": 95.5,
      "avgPrCycleTimeMs": 1200000,
      "rollbackCount": 0,
      "categoriesChosenCount": 3,
      "categoriesRejectedCount": 1,
      "wildcardAdoptionRate": 75.0,
      "totalDurationMs": 3600000
    }
  ]
}
```

## Integration

To populate data, self-evolution runs should insert records into the tracking tables:

```typescript
// Example: Recording a guardrail check
await db.query(`
  INSERT INTO self_evolution_guardrails (run_id, guardrail_type, passed, details)
  VALUES ($1, $2, $3, $4)
`, [runId, 'type_check', true, { files: 42 }]);

// Example: Recording a PR cycle
await db.query(`
  INSERT INTO self_evolution_pr_cycles (run_id, pr_number, created_at, merged_at, cycle_time_ms, outcome)
  VALUES ($1, $2, $3, $4, $5, $6)
`, [runId, 123, createdAt, mergedAt, cycleTimeMs, 'merged']);
```

## Troubleshooting

### No Data Showing

1. Check if tables exist:
   ```bash
   railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "\dt self_evolution_*"'
   ```

2. Run migration if needed:
   ```bash
   railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-self-evolution-tables.sh'
   ```

3. Verify data exists:
   ```bash
   railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM self_evolution_runs;"'
   ```

### Audit Script Fails

Check DATABASE_URL is set:
```bash
echo $DATABASE_URL
```

Verify database connectivity:
```bash
psql "$DATABASE_URL" -c "SELECT version();"
```

## References

- Related Issues: #751, #752, #760
- Dashboard: `/apps/bot/public/self-evolution.html`
- Workflow Template: `.github/workflows/self_evolution_audit.yml.template`
