# TypeScript Validation for Railway Deployments

## Overview

This feature implements mandatory linting and type checking for TypeScript code executed via the Unsandbox tool (which runs code on Railway infrastructure). The validation helps prevent deployment failures by catching common errors before code execution.

## Features

### Mandatory Validation

When TypeScript code is submitted for execution, the following checks are performed automatically:

1. **Syntax Validation**
   - Bracket matching (parentheses, square brackets, curly braces)
   - String closure detection
   - Comment handling (single-line and block comments)
   - Statement completeness

2. **Code Quality Checks**
   - `var` usage (suggests `let`/`const`)
   - `==` usage (suggests `===`)
   - `console.log` statements (warnings for production code)
   - Excessive `any` type usage

3. **Type Usage Validation**
   - Untyped function parameters
   - Missing type annotations on variables
   - TypeScript-specific patterns

### Bypass Mechanism

Users can bypass validation for a single deployment by including specific keywords in their request:

- "skip checks"
- "skip validation"
- "bypass checks"
- "bypass validation"
- "no checks"
- "no validation"
- "skip linting"
- "--skip-checks"
- "--no-checks"
- "ignore checks"
- "without checks"

**Example:**
```
User: "Run this TypeScript code, skip checks"
Bot: ⚠️ Skipping TypeScript validation as requested...
```

## Implementation

### Files Added/Modified

1. **`apps/bot/src/lib/typescript-validator.ts`**
   - Core validation logic
   - Syntax checking functions
   - Code quality analysis
   - Bypass keyword detection

2. **`apps/bot/src/lib/typescript-validator.test.ts`**
   - Comprehensive test suite
   - 25+ test cases covering all validation scenarios
   - Bypass detection tests

3. **`apps/bot/src/agent/tools/unsandbox.ts`**
   - Integrated validation into `unsandboxTool`
   - Integrated validation into `unsandboxSubmitTool`
   - Added `user_message` parameter for bypass detection
   - Error reporting with helpful messages

## Usage

### Normal Execution (with validation)

```typescript
// User submits TypeScript code via Discord
const code = `
  const greeting: string = "Hello, World!";
  console.log(greeting);
`;

// Bot automatically validates before execution
// If validation passes, code is executed
// If validation fails, user receives error report with fixes
```

### Bypassed Execution

```typescript
// User explicitly requests to skip checks
User: "Run this TypeScript code, skip checks"

// Bot skips validation and executes immediately
```

### Validation Results

#### Success
```
✅ TypeScript validation passed! Executing code...
```

#### Success with Warnings
```
✅ TypeScript validation passed with 2 warning(s)
```

#### Failure
```
❌ TypeScript validation failed. Code must pass linting and type checking before execution.

**Errors:**
- Line 5: Unclosed brackets: {
- Line 8: Unclosed string (started with ")

💡 **Tip:** Fix the errors above, or add "skip checks" to your request to bypass validation for this deployment.
```

## Error Messages

The validator provides clear, actionable error messages:

- **Syntax Errors**: Line numbers and specific issues
- **Code Quality Warnings**: Suggestions for improvement
- **Type Issues**: Missing annotations and type usage problems

Each error message includes:
- Specific line number
- Description of the issue
- Suggestion for fix (where applicable)

## Testing

Run the test suite:

```bash
# From project root
pnpm test --filter=bot

# Or specifically for validator tests
cd apps/bot
npx vitest src/lib/typescript-validator.test.ts
```

## Configuration

No configuration is required. Validation is enabled by default for all TypeScript code submissions.

To modify validation rules, edit:
- `apps/bot/src/lib/typescript-validator.ts`

To modify bypass keywords, update the `shouldBypassValidation` function.

## Limitations

This validation performs **basic syntax and pattern checking**. It does not:

- Run a full TypeScript compiler
- Check external dependencies or imports
- Validate type definitions from `node_modules`
- Perform complex type inference

For simple code snippets and scripts, this validation is sufficient. For complex applications, users should run full TypeScript compilation locally before deployment.

## Future Enhancements

Potential improvements:

1. Integration with full TypeScript compiler API
2. Configurable validation rules per user/channel
3. Auto-fix suggestions for common issues
4. Performance profiling and optimization
5. Support for linting configuration files (.eslintrc)

## Related

- [Unsandbox Tool](../apps/bot/src/agent/tools/unsandbox.ts)
- [Railway Deployment Guide](./RAILWAY_DEPLOYMENT_MONITORING.md)
- [Error Automation](./RAILWAY_ERROR_AUTOMATION.md)

---

**Created:** 2025-11-23
**Issue:** #352
**Status:** Implemented
