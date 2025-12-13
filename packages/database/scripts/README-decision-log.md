# Decision Log Table Migration

## Overview
This migration creates the `decision_log` table for issue #878 - an append-only, immutable log for tracking all bot decisions with blame history.

## Table: `decision_log`

### Purpose
Store denormalized decision log entries for efficient querying and comprehensive auditing of all bot decisions.

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Auto-incrementing unique ID |
| `decision_id` | TEXT NOT NULL | External decision identifier |
| `decision_type` | VARCHAR(100) NOT NULL | Type/category of decision |
| `decision_description` | TEXT NOT NULL | Human-readable description |
| `decision_context` | JSONB | Contextual information about the decision |
| `user_id` | VARCHAR(255) | User ID who triggered the decision |
| `username` | VARCHAR(255) | Username who triggered the decision |
| `actor_type` | VARCHAR(50) | Type of actor (user, bot, system, etc.) |
| `responsible_module` | VARCHAR(255) | Module responsible for the decision |
| `responsible_component` | VARCHAR(255) | Component responsible for the decision |
| `blame_chain` | JSONB | Array tracking the chain of responsibility |
| `metadata` | JSONB | Additional flexible metadata |
| `tags` | TEXT[] | Searchable tags array |
| `outcome` | VARCHAR(50) | Result/outcome of the decision |
| `outcome_details` | JSONB | Detailed outcome information |
| `decided_at` | TIMESTAMPTZ NOT NULL | When the decision was made |
| `logged_at` | TIMESTAMPTZ | When the log entry was created (auto) |

### Indexes

**B-tree Indexes:**
- `idx_decision_log_decision_id` - Fast lookup by decision ID
- `idx_decision_log_user_id` - Filter by user
- `idx_decision_log_username` - Filter by username
- `idx_decision_log_decision_type` - Filter by decision type
- `idx_decision_log_responsible_module` - Filter by module
- `idx_decision_log_responsible_component` - Filter by component
- `idx_decision_log_decided_at` - Time-based queries (DESC)
- `idx_decision_log_logged_at` - Time-based queries (DESC)
- `idx_decision_log_outcome` - Filter by outcome

**GIN Indexes (for JSONB/array columns):**
- `idx_decision_log_metadata_gin` - Query metadata fields
- `idx_decision_log_context_gin` - Query context fields
- `idx_decision_log_blame_chain_gin` - Query blame chain
- `idx_decision_log_tags_gin` - Query tags array

## Running the Migration

### Option 1: Using Railway CLI (Recommended)
```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-decision-log-table.sh'
```

### Option 2: Using GitHub Actions Workflow
1. Go to Actions → "Database - Run Migrations"
2. Click "Run workflow"
3. Enter `migration_script`: `create-decision-log-table.sh`
4. Set `dry_run` to `false`
5. Click "Run workflow"

### Option 3: Auto-run on Merge
The migration will run automatically when this PR is merged to `main` (via the `auto-migrate` job in `.github/workflows/database-migrate.yml`).

## Post-Migration Steps

After running the migration, update the Prisma schema:

```bash
cd packages/database
pnpm prisma db pull
pnpm prisma generate
```

This ensures the Prisma client is aware of the new table.

## Verification

After migration, verify the table exists:

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = '\''public'\'' AND table_name = '\''decision_log'\'';"'
```

Or check the table structure:

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '\''decision_log'\'' ORDER BY ordinal_position;"'
```

## Append-Only Enforcement

This table is designed to be append-only (immutable). The database comment on the table documents this:

```sql
COMMENT ON TABLE decision_log IS 'Append-only immutable log for all bot decisions. No updates or deletes should be performed.';
```

Application code should:
- Only INSERT new records
- Never UPDATE existing records
- Never DELETE records

If stronger enforcement is needed, database triggers can be added later.

## Example Usage

### Logging a Decision

```typescript
await prisma.decision_log.create({
  data: {
    decision_id: crypto.randomUUID(),
    decision_type: 'content_moderation',
    decision_description: 'Flagged message for review',
    decision_context: {
      message_id: '123',
      channel: '#general',
      flags: ['spam', 'offensive']
    },
    user_id: '456',
    username: 'john_doe',
    actor_type: 'bot',
    responsible_module: 'moderation',
    responsible_component: 'spam_detector',
    blame_chain: [
      { module: 'discord_handler', timestamp: '2024-01-01T00:00:00Z' },
      { module: 'moderation', timestamp: '2024-01-01T00:00:01Z' }
    ],
    metadata: {
      confidence: 0.95,
      model: 'spam-v2'
    },
    tags: ['moderation', 'automated'],
    outcome: 'flagged',
    outcome_details: {
      action: 'quarantine',
      notify: ['admin@example.com']
    },
    decided_at: new Date()
  }
});
```

### Querying Decisions

```typescript
// Get recent decisions by user
const userDecisions = await prisma.decision_log.findMany({
  where: { user_id: '456' },
  orderBy: { decided_at: 'desc' },
  take: 10
});

// Get decisions by module with specific outcome
const moduleDecisions = await prisma.decision_log.findMany({
  where: {
    responsible_module: 'moderation',
    outcome: 'flagged'
  }
});

// Query JSONB fields
const decisionsWithHighConfidence = await prisma.$queryRaw`
  SELECT * FROM decision_log
  WHERE metadata->>'confidence' > '0.9'
  ORDER BY decided_at DESC
  LIMIT 10
`;
```

## Related Issues
- #878 - Append-only log with blame history for all decisions
- #879 - Create denormalized append-only decision log table
