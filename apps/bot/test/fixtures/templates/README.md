# Test Fixtures - Templates

This directory contains templates and examples used for testing the Unsandbox integration.

## chat.html

**Source:** https://github.com/russellballestrini/opencompletion/blob/main/templates/chat.html

This template contains code execution and polling examples that can be used as reference for:
- Implementing polling logic with exponential backoff
- Handling async job submission and status checks
- Testing edge cases in code execution workflows

**To fetch the template:**

```bash
curl -o test/fixtures/templates/chat.html \
  https://raw.githubusercontent.com/russellballestrini/opencompletion/main/templates/chat.html
```

**Usage in tests:**

The template provides real-world examples of:
1. Submitting code for async execution
2. Polling for job completion
3. Handling various terminal states
4. Displaying execution results

These patterns are reflected in our unit and integration tests:
- `src/lib/unsandbox/polling.unit.test.ts` - Unit tests for polling logic
- `src/lib/unsandbox/polling.integration.test.ts` - Integration tests for full async flows
