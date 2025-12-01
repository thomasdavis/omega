# SQLite to PostgreSQL Migration Guide

Complete guide for migrating from LibSQL (SQLite) to Railway PostgreSQL with zero downtime.

## Overview

The migration system provides three modes for gradual, safe migration:

1. **SQLite Primary** (default) - All operations on SQLite
2. **Shadow Writing** - Writes to both databases for validation
3. **PostgreSQL Primary** - All operations on PostgreSQL

## Migration Steps

### Phase 1: Setup PostgreSQL Schema

Run the schema migration to create all tables in PostgreSQL:

```bash
# From repo root
cd packages/database
pnpm tsx src/postgres/migrations/runMigration.ts
```

This creates all 6 tables in PostgreSQL:
- `messages` - With GIN full-text search
- `queries` - Query execution tracking
- `documents` - Collaborative documents
- `document_collaborators` - Access control
- `user_profiles` - PhD-level user profiling (100+ columns)
- `user_analysis_history` - Temporal tracking

### Phase 2: Export Existing Data

Export all data from SQLite to JSON:

```bash
pnpm tsx src/migrations/exportFromSQLite.ts
```

This creates `migration-data/` with JSON files for each table plus metadata.

### Phase 3: Import Data to PostgreSQL

Import the JSON data into PostgreSQL:

```bash
pnpm tsx src/migrations/importToPostgres.ts
```

Handles type conversions:
- TEXT JSON → JSONB
- INTEGER booleans → BOOLEAN
- Preserves foreign key order

### Phase 4: Enable Shadow Writing

Test dual-writing to both databases:

```bash
# Railway Environment Variables
USE_POSTGRES_SHADOW=true
```

This will:
- Write to SQLite (primary)
- Shadow-write to PostgreSQL (fire-and-forget)
- Log any shadow write failures

Monitor logs for any errors. Fix discrepancies before proceeding.

### Phase 5: Switch to PostgreSQL Reads

Once shadow writing is stable, enable PostgreSQL for reads:

```bash
# Railway Environment Variables
USE_POSTGRES_PRIMARY=false
USE_POSTGRES_READ=true
USE_POSTGRES_SHADOW=true
```

This will:
- Write to SQLite
- Shadow-write to PostgreSQL
- **Read from PostgreSQL**

Monitor query performance and correctness.

### Phase 6: Full PostgreSQL Migration

Switch completely to PostgreSQL:

```bash
# Railway Environment Variables
USE_POSTGRES_PRIMARY=true
USE_POSTGRES_READ=false
USE_POSTGRES_SHADOW=false
```

Now all operations use PostgreSQL.

### Phase 7: Cleanup

After running PostgreSQL successfully for 1-2 weeks:

1. Remove SQLite volume mount from Railway
2. Archive SQLite data for backup
3. Remove LibSQL dependencies (optional)

## Environment Variables

| Variable | Effect |
|----------|--------|
| `USE_POSTGRES_PRIMARY=true` | Use PostgreSQL for all operations |
| `USE_POSTGRES_READ=true` | Read from PostgreSQL, write to primary |
| `USE_POSTGRES_SHADOW=true` | Dual-write to both databases |

## Code Usage

The adapter automatically routes to the correct database:

```typescript
import { messageService, queryService, documentService, userProfileService } from '@repo/database';

// These automatically use the correct database based on env vars
await messageService.saveHumanMessage({ ... });
await queryService.saveQuery({ ... });
await documentService.createDocument({ ... });
await userProfileService.updateUserProfile(userId, updates);
```

No code changes needed! Just set environment variables.

## Rollback Plan

If issues occur at any phase:

1. **Remove environment variables** to revert to SQLite
2. **Check logs** for error patterns
3. **Fix issues** in PostgreSQL code
4. **Re-run import** if data corruption occurred
5. **Try again** from the problematic phase

## Performance Comparison

### SQLite (Turso LibSQL)
- ✅ Fast local reads
- ✅ Simple schema
- ❌ Limited concurrency
- ❌ No connection pooling
- ❌ Full-text search via FTS5 triggers

### PostgreSQL
- ✅ Better concurrency (20 connection pool)
- ✅ Native JSONB with indexing
- ✅ GIN indexes for full-text search
- ✅ Industry standard
- ❌ Network latency for reads

## Monitoring

Watch for these metrics during migration:

- **Error rates**: Shadow write failures
- **Query latency**: Read performance
- **Data discrepancies**: Compare row counts
- **Memory usage**: Connection pool impact

## Troubleshooting

### Shadow writes failing

Check PostgreSQL connection:
```bash
railway logs --service omega-bot | grep "PostgreSQL"
```

### Data missing after import

Re-run import (safe, uses ON CONFLICT):
```bash
pnpm tsx src/migrations/importToPostgres.ts
```

### Type conversion errors

Check JSON fields - they should parse cleanly:
```sql
SELECT id, metadata FROM messages WHERE metadata IS NOT NULL LIMIT 10;
```

### Performance issues

Check query plans:
```sql
EXPLAIN ANALYZE SELECT * FROM messages WHERE user_id = 'USER_ID' ORDER BY timestamp DESC LIMIT 100;
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│               Database Adapter                   │
│        (packages/database/src/adapter.ts)        │
├─────────────────────────────────────────────────┤
│                                                   │
│  ┌──────────────┐          ┌──────────────┐    │
│  │    SQLite    │          │  PostgreSQL  │    │
│  │   (Turso)    │          │  (Railway)   │    │
│  └──────────────┘          └──────────────┘    │
│        │                          │              │
│        │    Shadow Write          │              │
│        │◄────────────────────────►│              │
│        │                          │              │
│  Primary Write/Read          Primary Write/Read │
│                                                   │
└─────────────────────────────────────────────────┘
```

## Key Files

- `packages/database/src/adapter.ts` - Feature flag system
- `packages/database/src/postgres/migrations/001_initial_schema.sql` - PostgreSQL schema
- `packages/database/src/postgres/migrations/runMigration.ts` - Schema runner
- `packages/database/src/migrations/exportFromSQLite.ts` - Data export
- `packages/database/src/migrations/importToPostgres.ts` - Data import
- `packages/database/src/postgres/messageService.ts` - Message CRUD
- `packages/database/src/postgres/queryService.ts` - Query CRUD
- `packages/database/src/postgres/documentService.ts` - Document CRUD
- `packages/database/src/postgres/userProfileService.ts` - User profile CRUD

## Database Comparison

### Schema Differences

| Feature | SQLite | PostgreSQL |
|---------|--------|------------|
| Timestamps | INTEGER (seconds) | BIGINT (seconds) |
| JSON | TEXT | JSONB (native) |
| Booleans | INTEGER (0/1) | BOOLEAN (true/false) |
| Full-text | FTS5 virtual table | GIN indexes |
| Arrays | TEXT JSON | JSONB array |
| Timestamp defaults | `strftime('%s', 'now')` | `EXTRACT(EPOCH FROM NOW())::BIGINT` |

### Query Differences

**Full-text search:**
```sql
-- SQLite FTS5
SELECT * FROM messages
INNER JOIN messages_fts ON messages.rowid = messages_fts.rowid
WHERE messages_fts MATCH 'search query';

-- PostgreSQL GIN
SELECT * FROM messages
WHERE to_tsvector('english', message_content || ' ' || username)
      @@ plainto_tsquery('english', 'search query');
```

**JSON queries:**
```sql
-- SQLite (text parsing)
SELECT * FROM messages WHERE json_extract(metadata, '$.key') = 'value';

-- PostgreSQL (native JSONB)
SELECT * FROM messages WHERE metadata->>'key' = 'value';
```

## Success Criteria

Before moving to next phase, verify:

- ✅ All tables exist in PostgreSQL
- ✅ Row counts match between databases
- ✅ Shadow writes succeed with <1% error rate
- ✅ Read latency is acceptable (<100ms p95)
- ✅ Full-text search works correctly
- ✅ JSONB queries perform well
- ✅ No foreign key violations
- ✅ Application logs show no errors

## Timeline

Recommended migration timeline:

- **Week 1**: Setup schema, import data
- **Week 2**: Shadow writing, monitor errors
- **Week 3**: PostgreSQL reads, validate correctness
- **Week 4**: Full PostgreSQL migration
- **Week 5-6**: Monitor stability
- **Week 7**: Remove SQLite dependencies

## Support

If you encounter issues:

1. Check logs: `railway logs --service omega-bot`
2. Verify env vars: `railway variables`
3. Test queries: Use Railway's PostgreSQL dashboard
4. Rollback: Remove env vars to revert to SQLite

---

**Last Updated**: 2025-12-02
**Status**: Ready for migration
**Next Step**: Run Phase 1 (Setup PostgreSQL Schema)
