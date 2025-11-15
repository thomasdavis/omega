# Unsandbox SDK

Comprehensive TypeScript SDK for the Unsandbox API - a safe code execution platform supporting 11 programming languages.

## Features

- ✅ **Full API Coverage**: All endpoints (execute, status, artifacts, cancel, health)
- ✅ **Type-Safe**: Complete TypeScript definitions for all requests and responses
- ✅ **Error Handling**: Custom error class with detailed error information
- ✅ **Timeout Management**: Configurable timeouts with automatic abort
- ✅ **Language Mapping**: User-friendly language names mapped to runtime identifiers
- ✅ **Retry Logic**: Built-in retry capabilities for failed requests (future enhancement)

## API Documentation

- **API Docs**: https://api.unsandbox.com/docs
- **OpenAPI Spec**: https://api.unsandbox.com/openapi

## Installation

The SDK is included in the bot package. Import from:

```typescript
import { createUnsandboxClient } from '../../lib/unsandbox/index.js';
```

## Usage

### Basic Code Execution

```typescript
import { createUnsandboxClient } from './lib/unsandbox/index.js';

const client = createUnsandboxClient({
  apiKey: process.env.UNSANDBOX_API_KEY!,
});

// Execute Python code
const result = await client.executeCode({
  language: 'python',
  code: 'print("Hello, World!")',
  timeout: 5000,
});

console.log(result.stdout); // "Hello, World!\n"
console.log(result.exitCode); // 0
console.log(result.executionTime); // 142 (ms)
```

### With Standard Input

```typescript
const result = await client.executeCode({
  language: 'python',
  code: `
name = input("What's your name? ")
print(f"Hello, {name}!")
  `,
  stdin: 'Alice',
  timeout: 5000,
});

console.log(result.stdout); // "What's your name? Hello, Alice!\n"
```

### With Environment Variables

```typescript
const result = await client.executeCode({
  language: 'node',
  code: 'console.log(process.env.API_KEY)',
  env: {
    API_KEY: 'secret-key-123',
  },
  timeout: 5000,
});

console.log(result.stdout); // "secret-key-123\n"
```

### Check Execution Status

For long-running executions, poll for status:

```typescript
const execution = await client.executeCode({
  language: 'python',
  code: 'import time; time.sleep(10); print("Done")',
  timeout: 15000,
});

// Poll for status
const status = await client.getExecutionStatus({ id: execution.id });
console.log(status.status); // 'running' | 'completed' | 'failed' | 'timeout'

if (status.status === 'completed') {
  console.log(status.stdout);
}
```

### List Artifacts

Get files created during execution:

```typescript
const result = await client.executeCode({
  language: 'python',
  code: `
with open('/tmp/output.txt', 'w') as f:
    f.write('Generated content')
  `,
});

const artifacts = await client.listArtifacts({ id: result.id });
artifacts.artifacts.forEach(artifact => {
  console.log(`${artifact.name} (${artifact.size} bytes)`);
  console.log(`Download: ${artifact.url}`);
});
```

### Cancel Execution

Cancel a long-running execution:

```typescript
const execution = await client.executeCode({
  language: 'bash',
  code: 'sleep 60',
  timeout: 60000,
});

// Cancel it
const cancelled = await client.cancelExecution(execution.id);
console.log(cancelled.status); // 'cancelled'
```

### Health Check

Verify API connectivity:

```typescript
const isHealthy = await client.healthCheck();
console.log(isHealthy); // true or false
```

## Error Handling

The SDK provides detailed error information:

```typescript
import { UnsandboxApiError } from './lib/unsandbox/index.js';

try {
  const result = await client.executeCode({
    language: 'python',
    code: 'invalid syntax!',
  });
} catch (error) {
  if (error instanceof UnsandboxApiError) {
    console.error(`API Error ${error.status}: ${error.message}`);
    console.error(`Error Code: ${error.code}`);
    console.error(`Details:`, error.details);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Supported Languages

| User-Facing Name | Runtime Identifier | Description |
|-----------------|-------------------|-------------|
| `javascript` / `node` | `node` | JavaScript (Node.js) |
| `python` | `python` | Python 3 |
| `typescript` | `typescript` | TypeScript |
| `ruby` | `ruby` | Ruby |
| `go` | `go` | Go |
| `rust` | `rust` | Rust |
| `java` | `java` | Java |
| `cpp` | `cpp` | C++ |
| `c` | `c` | C |
| `php` | `php` | PHP |
| `bash` | `bash` | Bash shell |

## Configuration

```typescript
interface UnsandboxConfig {
  /** API key for authentication (required) */
  apiKey: string;

  /** Base URL for the API (default: https://api.unsandbox.com) */
  baseUrl?: string;

  /** Default timeout for requests in milliseconds (default: 30000) */
  timeout?: number;
}
```

## Response Types

### ExecuteCodeResponse

```typescript
interface ExecuteCodeResponse {
  id: string;                    // Unique execution ID
  status: ExecutionStatus;       // 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled'
  stdout?: string;               // Standard output
  stderr?: string;               // Standard error
  exitCode?: number;             // Exit code (0 = success)
  executionTime?: number;        // Execution time in ms
  error?: string;                // Error message if failed
  startedAt?: string;            // ISO timestamp
  completedAt?: string;          // ISO timestamp
}
```

## Best Practices

1. **Set Appropriate Timeouts**: Default is 5000ms, max is 30000ms
2. **Handle Errors**: Always wrap calls in try-catch blocks
3. **Check Exit Codes**: `exitCode === 0` means success
4. **Use Language Mapping**: The tool handles mapping user-friendly names to runtime identifiers
5. **Monitor Long Executions**: Use `getExecutionStatus()` for executions > 5 seconds
6. **Validate Input**: Sanitize user-provided code before execution

## Architecture

```
apps/bot/src/lib/unsandbox/
├── types.ts       # TypeScript type definitions
├── client.ts      # Main client implementation
├── index.ts       # Public exports
└── README.md      # This file

apps/bot/src/agent/tools/
└── unsandbox.ts   # AI SDK tool wrapper (uses the client)
```

## Migration from Old Implementation

**Old (incorrect)**:
```typescript
// ❌ Wrong endpoint and language identifier
fetch('https://api.unsandbox.com/run', {
  body: JSON.stringify({ language: 'javascript', code: '...' })
})
```

**New (correct)**:
```typescript
// ✅ Correct endpoint and runtime identifier
const client = createUnsandboxClient({ apiKey });
await client.executeCode({
  language: 'node',  // Mapped from 'javascript'
  code: '...'
});
```

## Future Enhancements

- [ ] Retry logic for transient failures
- [ ] Rate limiting handling
- [ ] Execution caching
- [ ] Streaming output for long-running executions
- [ ] Batch execution support
- [ ] Enhanced artifact management

## Related Issues

- Issue #113: Comprehensive Unsandbox API integration
- Fixes incorrect language parameter handling
- Fixes wrong endpoint usage
- Adds support for all API endpoints

## Environment Variables

```bash
# Required
UNSANDBOX_API_KEY=your_api_key_here
```

Set in Vercel/Fly.io dashboard or `.env.local` for development.
