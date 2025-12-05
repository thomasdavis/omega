# Self Evolution: Wildcard Feature Hook v1

## Overview

The Wildcard Feature Hook is a strictly sandboxed autonomous evolution system that allows the AI to make small, reversible changes to its behavior on a daily basis. This system is designed with multiple layers of safety constraints to ensure responsible self-modification.

**Related Issues:** #751, #752, #755

## Core Principles

1. **One Change Per Day**: Maximum of one wildcard change every 24 hours
2. **Strict Sandboxing**: Changes confined to pre-approved allowlist areas only
3. **Reversibility Required**: All changes must be fully reversible
4. **Low Risk Only**: v1 only allows low-risk changes
5. **Gradual Rollout**: Feature flag with 0%→25% maximum rollout percentage
6. **Full Audit Trail**: All proposals and actions logged to database

## Architecture

### Database Tables

#### `self_evolution_proposals`
Tracks all proposed self-evolution changes with approval workflow.

**Key Fields:**
- `category`: wildcard | enhancement | bugfix | optimization
- `proposal_type`: saved_reply | prompt_flavor | tool_alias | joke_category | config_tweak
- `status`: pending | approved | rejected | executed | rolled_back
- `risk_level`: low | medium | high (v1 only allows 'low')
- `reversible`: boolean (v1 requires `true`)
- `allowlist_area`: Must be in predefined allowlist

#### `self_evolution_actions`
Logs executed changes with rollback information and success metrics.

**Key Fields:**
- `proposal_id`: Links to the proposal
- `success`: Execution result
- `rollback_info`: Data needed to reverse the change
- `rollout_percentage`: Percentage at time of execution
- `execution_time_ms`: Performance tracking
- `user_feedback_score`: Optional 1-5 rating

### Allowlist Areas

Changes are **strictly confined** to these areas:

1. **Saved Replies** (`config/saved_replies.json`)
   - Quick reply shortcuts for common messages
   - Examples: weekend greetings, thank you responses

2. **Prompt Flavors** (`config/prompt_flavors.json`)
   - Response style variations
   - Examples: enthusiastic, concise, detailed

3. **Tool Aliases** (`config/tool_aliases.json`)
   - Shorthand commands for tools
   - Examples: `db` → `database`, `gh` → `github`

4. **Joke Categories** (`jokes`)
   - New humor categories
   - Examples: puns, tech jokes, dad jokes, riddles

5. **Config Tweaks** (`config/wildcard_tweaks.json`)
   - Minor configuration adjustments
   - Must be non-breaking and reversible

## Configuration

### Environment Variables

```bash
# Enable/disable wildcard feature hook
SELF_EVOLUTION_WILDCARD_ENABLED=true

# Rollout percentage (0-100, hard capped at 25 for v1)
WILDCARD_ROLLOUT_PERCENTAGE=10
```

### Feature Flags

- **Default State**: Disabled (`SELF_EVOLUTION_WILDCARD_ENABLED=false`)
- **Gradual Rollout**: Start at 0%, increase to 25% maximum
- **Rollout Logic**: Probabilistic selection based on percentage

## Usage

### Running the Wildcard Hook

```bash
# Execute wildcard hook manually
tsx scripts/self_evolution/wildcard.ts

# Run via Railway (production)
railway run tsx scripts/self_evolution/wildcard.ts
```

### Setting Up Database

```bash
# Create database tables
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-self-evolution-tables.sh'

# Update Prisma schema from production
cd packages/database
export DATABASE_URL="postgresql://postgres:<password>@switchback.proxy.rlwy.net:11820/railway"
pnpm prisma db pull
pnpm prisma generate
```

### Scheduled Execution

To run wildcards daily, set up a cron job or scheduled task:

```bash
# Example cron (runs at 2 AM daily)
0 2 * * * tsx /path/to/scripts/self_evolution/wildcard.ts
```

## Safety Guardrails

### Validation Checks

Before execution, every proposal is validated:

1. ✅ Feature flag enabled
2. ✅ Rollout percentage > 0 and ≤ 25
3. ✅ Allowlist area is valid
4. ✅ Change is reversible
5. ✅ Risk level is 'low'
6. ✅ Proper change structure
7. ✅ Only one execution per 24 hours

### Rollout Logic

```typescript
// Probabilistic selection based on WILDCARD_ROLLOUT_PERCENTAGE
// Example: 10% rollout = 10% chance of execution
if (Math.random() * 100 < ROLLOUT_PERCENTAGE) {
  executeWildcard();
}
```

### Automatic Approval

- v1: Wildcard category auto-approved after validation
- v2+ (future): May require manual approval for certain changes

## Wildcard Generators

### 1. Saved Reply Generator
Adds quick response shortcuts for common interactions.

**Example Output:**
```json
{
  "trigger": "thanks",
  "reply": "You're very welcome! Happy to help."
}
```

### 2. Prompt Flavor Generator
Creates response style variations.

**Example Output:**
```json
{
  "name": "enthusiastic",
  "prefix": "Let me help you with that! "
}
```

### 3. Tool Alias Generator
Defines shorthand commands.

**Example Output:**
```json
{
  "alias": "db",
  "targetTool": "database"
}
```

### 4. Joke Category Generator
Expands humor variety.

**Example Output:**
```json
{
  "category": "puns",
  "description": "Classic puns and wordplay"
}
```

## Monitoring & Rollback

### Viewing Proposals

```sql
-- Recent proposals
SELECT id, title, status, category, proposed_at
FROM self_evolution_proposals
ORDER BY proposed_at DESC
LIMIT 10;

-- Approved but not executed
SELECT * FROM self_evolution_proposals
WHERE status = 'approved' AND executed_at IS NULL;
```

### Viewing Actions

```sql
-- Recent executions
SELECT id, title, success, rollout_percentage, executed_at
FROM self_evolution_actions
ORDER BY executed_at DESC
LIMIT 10;

-- Failed actions
SELECT * FROM self_evolution_actions
WHERE success = false;
```

### Manual Rollback

```sql
-- Mark action as rolled back
UPDATE self_evolution_actions
SET rolled_back_at = NOW()
WHERE id = 'action-id';

-- Update proposal status
UPDATE self_evolution_proposals
SET status = 'rolled_back'
WHERE id = 'proposal-id';
```

## Roadmap

### v1 (Current)
- ✅ Basic wildcard with 4 generators
- ✅ Strict sandboxing and allowlist
- ✅ Feature flag with gradual rollout
- ✅ Database logging
- ✅ Auto-approval for wildcard category

### v2 (Future)
- [ ] Manual approval workflow
- [ ] User feedback collection
- [ ] Automatic rollback on negative feedback
- [ ] More wildcard generators
- [ ] A/B testing support
- [ ] Analytics dashboard

### v3 (Future)
- [ ] Multi-day experiments
- [ ] Cross-area changes (with extra validation)
- [ ] Learning from user feedback
- [ ] Predictive success scoring

## Contributing

When adding new wildcard generators:

1. Add to `WILDCARD_GENERATORS` array in `wildcard.ts`
2. Ensure generator returns valid `Proposal` object
3. Use only allowlisted areas
4. Keep changes small and reversible
5. Set `riskLevel: 'low'`
6. Provide clear rationale

## Security Considerations

- **No Core Runtime Changes**: Wildcards cannot modify core bot logic
- **No Dangerous Operations**: No file system, database schema, or permission changes
- **No External Communication**: No API calls or external data fetching
- **Reversibility**: Every change must be fully reversible
- **Rate Limiting**: Maximum one change per 24 hours
- **Audit Trail**: Full logging to database

## Troubleshooting

### Wildcard not executing

1. Check feature flag: `SELF_EVOLUTION_WILDCARD_ENABLED=true`
2. Check rollout percentage: `WILDCARD_ROLLOUT_PERCENTAGE > 0`
3. Verify 24-hour window since last execution
4. Check database connectivity

### Validation failures

- Review error message in console output
- Verify allowlist area is valid
- Ensure change is reversible and low-risk
- Check proposal structure matches expected format

### Database errors

- Ensure tables exist (run migration script)
- Verify Prisma client is generated
- Check database connection string

## License

Part of the Omega project.
