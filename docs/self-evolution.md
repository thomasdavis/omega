# Self-Evolution Observatory

> Real-time metrics and analysis of Omega's autonomous self-evolution capabilities

## Overview

This dashboard tracks key metrics from self-evolution runs, including:
- **Guardrail Pass Rate**: Percentage of changes that pass quality checks
- **PR Cycle Time**: Average time from PR creation to merge
- **Rollback Count**: Number of changes that needed to be reverted
- **Category Selection**: Which improvement categories are chosen vs rejected
- **Wildcard Features**: Adoption rate of experimental features

## Latest Metrics

The metrics below are automatically updated by the [Self-Evolution Audit workflow](../.github/workflows/self_evolution_audit.yml).

**Last Updated:** See [metrics file](./metrics/self-evolution-latest.json)

## Visualizations

### Guardrail Pass Rate Over Time

Track the success rate of self-evolution changes passing quality guardrails.

```chart
{
  "type": "line",
  "data": {
    "labels": [],
    "datasets": [{
      "label": "Guardrail Pass Rate (%)",
      "data": [],
      "borderColor": "rgb(75, 192, 192)",
      "tension": 0.1
    }]
  },
  "options": {
    "scales": {
      "y": {
        "beginAtZero": true,
        "max": 100
      }
    }
  }
}
```

**QuickChart URL:**
```
https://quickchart.io/chart?c={type:'line',data:{labels:['Run1','Run2','Run3'],datasets:[{label:'Pass%25Rate',data:[95,92,98]}]}}
```

### PR Cycle Time Trend

Monitor how quickly self-evolution PRs are merged.

```chart
{
  "type": "bar",
  "data": {
    "labels": [],
    "datasets": [{
      "label": "Avg Cycle Time (hours)",
      "data": [],
      "backgroundColor": "rgba(54, 162, 235, 0.5)"
    }]
  }
}
```

### Rollback Rate

Track the frequency of changes that needed to be rolled back.

```chart
{
  "type": "line",
  "data": {
    "labels": [],
    "datasets": [{
      "label": "Rollbacks per Run",
      "data": [],
      "borderColor": "rgb(255, 99, 132)",
      "tension": 0.1
    }]
  }
}
```

### Category Selection Heatmap

Most frequently chosen vs rejected improvement categories.

**Top Chosen Categories:**
- Feature enhancements
- Bug fixes
- Performance improvements
- Documentation
- Code quality

**Top Rejected Categories:**
- Breaking changes
- High-risk refactors
- Unproven patterns
- Experimental features

### Wildcard Feature Adoption

Track adoption rate of daily wildcard features (experimental improvements).

```chart
{
  "type": "doughnut",
  "data": {
    "labels": ["Wildcard Features", "Standard Features"],
    "datasets": [{
      "data": [15, 85],
      "backgroundColor": [
        "rgba(255, 206, 86, 0.5)",
        "rgba(54, 162, 235, 0.5)"
      ]
    }]
  }
}
```

## Aggregate Metrics (Last 30 Days)

| Metric | Value |
|--------|-------|
| Average Guardrail Pass Rate | - |
| Average PR Cycle Time | - hours |
| Total Rollbacks | - |
| Wildcard Adoption Rate | - % |
| Total Self-Evolution Runs | - |

## How to View Live Data

### Option 1: QuickChart Visualization

Generate charts using the latest metrics file:

```bash
# Generate a live chart URL with actual data
cat docs/metrics/self-evolution-latest.json | jq '.runs | map(.guardrailPassRate)'
```

Then visit:
```
https://quickchart.io/chart?c={type:'line',data:{labels:['R1','R2','R3'],datasets:[{label:'PassRate',data:[95,92,98]}]}}
```

### Option 2: Local JSON Viewing

View the raw metrics data:

```bash
cat docs/metrics/self-evolution-latest.json | jq '.'
```

### Option 3: Database Query

Query the database directly:

```sql
-- Get last 10 runs
SELECT
  run_timestamp,
  trigger_type,
  total_prs_created,
  total_prs_merged,
  guardrail_pass_rate,
  avg_pr_cycle_time_hours,
  wildcard_features_used
FROM self_evolution_runs
WHERE status = 'completed'
ORDER BY run_timestamp DESC
LIMIT 10;
```

## Data Sources

This dashboard pulls data from:
- `self_evolution_runs` - Overall run metrics
- `self_evolution_prs` - Individual PR details
- `self_evolution_categories` - Category selection history
- `self_evolution_metrics` - Aggregated metric snapshots

## Automation

The audit job runs:
- **Nightly** at 2 AM UTC
- **Post-merge** after each merge to main
- **Manual trigger** via GitHub Actions

See [self_evolution_audit.yml](../.github/workflows/self_evolution_audit.yml) for workflow details.

## JSON Export

The latest metrics are exported to:
```
docs/metrics/self-evolution-latest.json
```

This file contains:
- Last N runs with detailed metrics
- Aggregate statistics
- Category selection analysis
- Trend data

## Database Schema

### Tables

**self_evolution_runs**
- Tracks each self-evolution run
- Stores aggregate metrics per run
- Links to PRs, categories, and metrics

**self_evolution_prs**
- Individual PR tracking
- Guardrail pass/fail status
- Cycle time and rollback data

**self_evolution_categories**
- Category selection history
- Chosen vs rejected decisions
- Confidence scores

**self_evolution_metrics**
- Metric snapshots for quick queries
- Time-series data storage

See [create-self-evolution-tables.sh](../packages/database/scripts/create-self-evolution-tables.sh) for full schema.

## Future Enhancements

Potential improvements for this observatory:
- Real-time dashboard with auto-refresh
- Interactive filtering by date range, category, trigger type
- Anomaly detection for unusual patterns
- Predictive analysis of success rates
- Integration with Discord notifications
- Comparative analysis across time periods

## Related Documentation

- [Self-Evolution Audit Script](../scripts/self_evolution/audit.ts)
- [Database Migration](../packages/database/scripts/create-self-evolution-tables.sh)
- [GitHub Workflow](../.github/workflows/self_evolution_audit.yml)

---

*This dashboard is part of Omega's autonomous self-evolution system, tracking the bot's ability to analyze, improve, and monitor its own codebase.*
