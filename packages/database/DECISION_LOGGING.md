# Decision Logging System

An append-only audit trail for all bot decisions with blame history.

## Overview

The decision logging system captures all significant decisions made by the Omega bot in an immutable, append-only log. This provides full accountability, traceability, and debugging capabilities.

## Database Schema

### Table: `decision_logs`

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Auto-incrementing unique identifier |
| `timestamp` | TIMESTAMPTZ | When the decision was made (defaults to NOW()) |
| `user_id` | VARCHAR(255) | Discord user ID associated with the decision |
| `username` | VARCHAR(255) | Discord username for readability |
| `decision_description` | TEXT | Human-readable description of the decision |
| `blame` | TEXT | Component/module responsible for the decision |
| `metadata` | JSONB | Additional structured data about the decision |

### Indexes

- `idx_decision_logs_timestamp` - Efficient time-range queries
- `idx_decision_logs_user_id` - Filter by user
- `idx_decision_logs_metadata_gin` - Fast JSONB queries

## Usage

### Logging a Decision

```typescript
import { logDecision } from '@repo/database';

await logDecision({
  userId: '12345',
  username: 'user123',
  decisionDescription: 'Response Decision: RESPOND - User mentioned bot directly',
  blame: 'shouldRespond.ts',
  metadata: {
    decisionType: 'shouldRespond',
    shouldRespond: true,
    confidence: 95,
    reason: 'User mentioned bot directly',
    channelId: '67890',
    channelName: 'general',
  },
});
```

### Querying Decision Logs

```typescript
import {
  queryDecisionLogs,
  getUserDecisionLogs,
  getRecentDecisionLogs,
  countDecisionLogs,
  searchDecisionLogs,
} from '@repo/database';

// Get recent decisions
const recent = await getRecentDecisionLogs(50);

// Get decisions for a specific user
const userDecisions = await getUserDecisionLogs('12345', 100);

// Query with filters
const filtered = await queryDecisionLogs({
  userId: '12345',
  startTime: new Date('2024-01-01'),
  endTime: new Date('2024-12-31'),
  limit: 100,
  offset: 0,
});

// Search by text
const searchResults = await searchDecisionLogs('shouldRespond', 50);

// Count decisions
const total = await countDecisionLogs();
const userTotal = await countDecisionLogs('12345');
```

## Decision Types

The system currently logs three types of decisions:

### 1. Response Decisions (`shouldRespond`)

Logs whether the bot decided to respond to a message.

**Metadata:**
- `decisionType: 'shouldRespond'`
- `shouldRespond: boolean` - Whether bot will respond
- `confidence: number` - AI confidence level (0-100)
- `reason: string` - Why this decision was made
- `channelId: string`
- `channelName: string`
- `messageId: string`
- `messageSnippet: string` - First 100 chars of message

**Blame:** `shouldRespond.ts`

### 2. Intent Gate Decisions (`intentGate`)

Logs whether the intent gate allowed or blocked a response.

**Metadata:**
- `decisionType: 'intentGate'`
- `shouldProceed: boolean` - Whether to proceed
- `confidence: number` - AI confidence level
- `classification: string` - Intent classification
- `reason: string` - Why this decision was made
- `channelId: string`
- `channelName: string`
- `messageId: string`
- `repliedToMessageId: string`

**Blame:** `intentGate.ts`

### 3. Tool Execution Decisions (`toolExecution`)

Logs every tool that the bot executes.

**Metadata:**
- `decisionType: 'toolExecution'`
- `toolName: string` - Name of the tool executed
- `toolArgs: object` - Arguments passed to the tool
- `channelId: string`
- `channelName: string`
- `messageId: string`

**Blame:** `runAgent`

## Migration

### Running the Migration

```bash
# On Railway
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-decision-logs-table.sh'

# Update Prisma schema after migration
railway run bash -c 'cd packages/database && DATABASE_URL=$DATABASE_PUBLIC_URL pnpm prisma db pull && pnpm prisma generate'
```

### Migration Script

Located at: `packages/database/scripts/create-decision-logs-table.sh`

The migration is idempotent and can be run multiple times safely using `IF NOT EXISTS` clauses.

## Integration Points

Decision logging is integrated at the following points in the bot:

1. **Message Handler** (`apps/bot/src/handlers/messageHandler.ts`)
   - After `shouldRespond()` decision (line ~122)
   - After `checkIntentGate()` decision (line ~204)
   - For each tool execution (line ~516)

## Best Practices

1. **Always include blame** - Helps identify which component made the decision
2. **Use structured metadata** - Makes querying easier
3. **Keep descriptions concise** - But include key information
4. **Don't log sensitive data** - Sanitize user content
5. **Use appropriate decision types** - Helps with filtering and analysis

## Debugging Examples

### Find all ignored messages

```typescript
const ignored = await queryDecisionLogs({
  limit: 100,
});

const ignoredMessages = ignored.filter(
  log => log.metadata?.decisionType === 'shouldRespond' &&
         log.metadata?.shouldRespond === false
);
```

### Analyze intent gate blocks

```typescript
const blocked = await searchDecisionLogs('Intent Gate: BLOCKED', 100);
console.log('Intent gate blocks:', blocked.length);
```

### Track tool usage

```typescript
const toolLogs = await queryDecisionLogs({
  startTime: new Date('2024-12-01'),
  limit: 1000,
});

const toolUsage = toolLogs
  .filter(log => log.metadata?.decisionType === 'toolExecution')
  .reduce((acc, log) => {
    const toolName = log.metadata?.toolName;
    acc[toolName] = (acc[toolName] || 0) + 1;
    return acc;
  }, {});

console.log('Tool usage:', toolUsage);
```

## Future Enhancements

Potential future additions:

- Decision replay/audit UI
- Aggregated decision metrics
- Performance impact tracking
- A/B testing support
- Decision rollback capabilities
