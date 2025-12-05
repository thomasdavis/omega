# Self-Evolution Scripts

This directory contains scripts for Omega's self-evolution capabilities, allowing the AI to propose and execute small, safe improvements to its own capabilities.

## Wildcard Feature Hook

**File:** `wildcard.ts`

The wildcard feature hook allows Omega to make one small, reversible change per day to enhance its personality or capabilities.

### Key Features

- **Daily execution**: Runs at 3:00 AM UTC via the scheduler
- **Feature flag**: `ENABLE_SELF_EVOLUTION_WILDCARD=true` (default: disabled)
- **Strict sandboxing**: Only operates in pre-approved allowlist areas
- **Gradual rollout**: Changes start at 0% and can gradually increase to max 25%
- **Full auditability**: All proposals and actions logged to database
- **Reversible**: Every change can be rolled back

### Safety Constraints

1. **Allowlist-only areas**:
   - Saved replies (jokes, greetings, expressions)
   - Minor prompt flavoring (tone modifiers, emoji preferences)
   - Harmless tool aliases
   - Content categories (joke types, music genres)

2. **Risk assessment**: All proposals evaluated as low/medium/high risk
3. **Auto-rejection**: High-risk proposals automatically rejected
4. **Canary testing**: Changes deployed gradually with monitoring
5. **No core runtime changes**: Cannot modify critical application logic

### Database Schema

**Tables:**
- `self_evolution_proposals`: Tracks proposed changes with approval workflow
- `self_evolution_actions`: Tracks execution, rollout percentage, and rollback

### Usage

**Automatic (via scheduler):**
```typescript
// Already integrated in packages/agent/src/services/scheduler.ts
// Runs daily at 3:00 AM UTC
```

**Manual trigger:**
```typescript
import { triggerWildcardNow } from '@repo/agent/services/scheduler';

const result = await triggerWildcardNow();
console.log(result.message);
```

**Increase rollout percentage:**
```typescript
import { increaseRollout } from './scripts/self_evolution/wildcard';

await increaseRollout(actionId, 10); // Increase to 10%
await increaseRollout(actionId, 25); // Max 25%
```

**Rollback a change:**
```typescript
import { rollbackAction } from './scripts/self_evolution/wildcard';

await rollbackAction(actionId, 'Unexpected side effects detected');
```

### Workflow

1. **Proposal Generation**: System generates a random wildcard idea from allowlist
2. **Validation**: Proposal checked against safety guardrails
3. **Auto-approval**: Low-risk proposals auto-approved (can be configured for human approval)
4. **Execution**: Change executed with 0% rollout (canary phase)
5. **Monitoring**: System monitors for issues
6. **Gradual Rollout**: If successful, gradually increase rollout to 25% max
7. **Rollback**: If issues detected, automatic rollback

### Example Wildcard Changes

- Adding "science puns" to joke categories
- Adding encouraging tone to technical explanations
- Creating shortcut alias "profile" for getUserProfile
- Adding "lo-fi" to music generation genres

### Migration

Run the database migration to create required tables:

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-self-evolution-tables.sh'
```

### Related Issues

- #751: Self-evolution architecture foundation
- #752: Autonomous capability enhancement
- #755: Wildcard feature hook v1 (this implementation)
