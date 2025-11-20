# CI Test Configuration for Unsandbox Tests

## Overview

This document describes the CI configuration needed to run the new Unsandbox polling tests on PRs and commits affecting the Unsandbox integration.

## Tests Added

1. **Unit Tests**: `src/lib/unsandbox/polling.unit.test.ts`
   - Polling behavior and state transitions
   - Terminal states (completed, failed, timeout, cancelled)
   - Error propagation and handling
   - Retry limits and polling timeout
   - Idempotency and duplicate job ID handling
   - Artifacts handling

2. **Integration Tests**: `src/lib/unsandbox/polling.integration.test.ts`
   - Full async submit/status workflow
   - Normal success flow (pending → running → completed)
   - Completed-with-errors scenarios
   - Timeout handling
   - Artifacts and file output handling
   - Environment variables and stdin
   - Real-world job ID examples from issue #187

## Recommended CI Workflow Changes

### Option 1: Add Test Step to Existing Workflow

Add the following step to `.github/workflows/deploy.yml` after the "Build" step:

```yaml
- name: Run Tests
  run: pnpm test
```

### Option 2: Create Dedicated Test Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Test

on:
  pull_request:
    paths:
      - 'apps/bot/src/lib/unsandbox/**'
      - 'apps/bot/src/agent/tools/unsandbox.ts'
      - '**/*.test.ts'
  push:
    branches:
      - main
    paths:
      - 'apps/bot/src/lib/unsandbox/**'
      - 'apps/bot/src/agent/tools/unsandbox.ts'

jobs:
  test:
    name: Run Unsandbox Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run Unsandbox Tests
        run: pnpm --filter=bot test polling

      - name: Upload Coverage
        if: always()
        uses: codecov/codecov-action@v3
        with:
          files: ./apps/bot/coverage/coverage-final.json
          flags: unsandbox
```

### Option 3: Path-Specific Testing

If you want to run these tests only when Unsandbox code is modified:

```yaml
- name: Check if Unsandbox files changed
  id: unsandbox-check
  run: |
    FILES=$(git diff --name-only ${{ github.event.before }} ${{ github.sha }} | grep -E 'unsandbox|sandbox' || true)
    if [ -n "$FILES" ]; then
      echo "changed=true" >> $GITHUB_OUTPUT
    else
      echo "changed=false" >> $GITHUB_OUTPUT
    fi

- name: Run Unsandbox Tests
  if: steps.unsandbox-check.outputs.changed == 'true'
  run: pnpm --filter=bot test polling
```

## Running Tests Locally

```bash
# Run all tests in the bot package
cd apps/bot
pnpm test

# Run only polling tests
pnpm test polling

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

## Test Coverage Goals

The new tests provide comprehensive coverage for:

- ✅ Correct polling behavior until completion
- ✅ Backoff strategy (currently fixed interval, expandable to exponential)
- ✅ All terminal states: success, completed-with-errors, timeout, cancelled
- ✅ Retry limits and max attempts enforcement
- ✅ Error propagation for API errors (404, 500, network errors)
- ✅ Empty stdout/stderr handling (reproduces issue #187 scenarios)
- ✅ Artifact-only outputs (file writes without console output)
- ✅ Environment variables and stdin support
- ✅ Real job IDs from issue #187

## Future Enhancements

### Exponential Backoff with Jitter

The current implementation uses a fixed polling interval (1000ms). To implement exponential backoff with jitter as specified in the issue:

```typescript
interface BackoffConfig {
  baseDelay: number;      // Initial delay (e.g., 1000ms)
  maxDelay: number;       // Maximum delay cap (e.g., 10000ms)
  multiplier: number;     // Backoff multiplier (e.g., 1.5 or 2)
  maxAttempts: number;    // Maximum polling attempts (e.g., 60)
  jitter: boolean;        // Add randomness to prevent thundering herd
}

function calculateNextDelay(attempt: number, config: BackoffConfig): number {
  let delay = config.baseDelay * Math.pow(config.multiplier, attempt);
  delay = Math.min(delay, config.maxDelay);

  if (config.jitter) {
    // Add ±20% jitter
    const jitterAmount = delay * 0.2;
    delay = delay + (Math.random() * 2 - 1) * jitterAmount;
  }

  return Math.floor(delay);
}
```

This would be added to `client.ts:pollJobStatus()` and tested with fake timers in the unit tests.

## Notes

- **Permission Issue**: The GitHub App permissions do not allow workflow modifications. Manual PR or admin merge required for workflow changes.
- **Test Framework**: Using Vitest with fake timers for deterministic async testing
- **Mock Strategy**: Using global fetch mocks for isolated unit tests
- **Coverage**: Aim for >90% coverage on new polling logic
