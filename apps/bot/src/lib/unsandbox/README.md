# Unsandbox SDK

Comprehensive TypeScript SDK for the Unsandbox API - a safe code execution platform supporting 42+ programming languages (dynamically fetched from the API).

## Features

- ✅ **Full API Coverage**: All endpoints (execute, status, artifacts, cancel, health, languages)
- ✅ **Type-Safe**: Complete TypeScript definitions for all requests and responses
- ✅ **Error Handling**: Custom error class with detailed error information
- ✅ **Timeout Management**: Configurable timeouts with automatic abort
- ✅ **Dynamic Language List**: Fetches supported languages from API with caching
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

console.log(result.result?.stdout); // "Hello, World!\n"
console.log(result.result?.exit_code); // 0
console.log(result.result?.success); // true
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

console.log(result.result?.stdout); // "What's your name? Hello, Alice!\n"
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

console.log(result.result?.stdout); // "secret-key-123\n"
```

### With Network Access (Semitrust Mode)

```typescript
// Network access is controlled by UNSANDBOX_ENABLE_SEMITRUST environment variable
// By default, network access is disabled (zerotrust mode)

const result = await client.executeCode({
  language: 'node',
  code: `
    const https = require('https');
    https.get('https://api.github.com/zen', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => console.log(data));
    });
  `,
  network: 'semitrust', // Only works if UNSANDBOX_ENABLE_SEMITRUST=true
  timeout: 10000,
});

// If UNSANDBOX_ENABLE_SEMITRUST is not set, network requests will fail
// This ensures secure-by-default behavior
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
const status = await client.getExecutionStatus({ job_id: execution.job_id });
console.log(status.status); // 'running' | 'completed' | 'failed' | 'timeout'

if (status.status === 'completed') {
  console.log(status.result?.stdout);
  console.log(status.result?.success);
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

const artifacts = await client.listArtifacts({ id: result.job_id });
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
const cancelled = await client.cancelExecution(execution.job_id);
console.log(cancelled.status); // 'cancelled'
```

### Get Supported Languages

Fetch the list of supported programming languages from the API:

```typescript
// Get full language list
const languages = await client.getLanguages();
console.log(languages); // Array of language info objects

// Or use the utility functions for easier access:
import {
  getUnsandboxLanguages,
  getUnsandboxLanguageIds,
  getUnsandboxLanguageCount,
  formatUnsandboxLanguages
} from './lib/unsandbox/languages.js';

// Get language count
const count = await getUnsandboxLanguageCount();
console.log(`Supports ${count} languages`); // "Supports 42 languages"

// Get language IDs only
const ids = await getUnsandboxLanguageIds();
console.log(ids); // ['python', 'javascript', 'typescript', ...]

// Get formatted string
const formatted = await formatUnsandboxLanguages();
console.log(formatted); // "python, javascript, typescript, ruby, ..."

// Force refresh cache
const fresh = await getUnsandboxLanguages(true);
```

The language list is cached in-memory for 24 hours to minimize API calls.

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

**42+ programming languages** are supported (dynamically fetched from https://api.unsandbox.com/languages).

The full list includes (but is not limited to):
- **Dynamic**: python, javascript, typescript, ruby, perl, php, lua, r, elixir, erlang, tcl, scheme, powershell, clojure, commonlisp, crystal, groovy, deno, awk, raku
- **Compiled**: c, cpp, go, rust, java, kotlin, cobol, fortran, d, zig, nim, v, objc, dart, julia, haskell, ocaml, fsharp, csharp
- **Shell/Script**: bash, prolog, forth

**Note**: The definitive source of truth is the `/languages` endpoint. Use the `getLanguages()` method or language utility functions to fetch the current list programmatically.

### Common Language Mappings

Some user-facing names map to different runtime identifiers:
- `javascript` / `node` → `node`
- Others generally match their common names (e.g., `python`, `typescript`, `ruby`)

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
interface JobStatusResponse {
  job_id: string;                // Unique execution ID
  status: ExecutionStatus;       // 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled'
  result?: {                     // Result object (only present when completed)
    success: boolean;            // Whether execution was successful
    stdout: string;              // Standard output
    stderr: string;              // Standard error
    error: string | null;        // Error message if failed
    language: string;            // Language used
    exit_code: number;           // Exit code (0 = success)
  };
  executionTime?: number;        // Execution time in ms
  startedAt?: string;            // ISO timestamp
  completedAt?: string;          // ISO timestamp
}
```

## Best Practices

1. **Set Appropriate Timeouts**: Default TTL is 30s, max is 300s (5 minutes)
2. **Handle Errors**: Always wrap calls in try-catch blocks
3. **Check Success**: Use `result.result?.success` and `result.result?.exit_code === 0` to verify success
4. **Use Language Mapping**: The tool handles mapping user-friendly names to runtime identifiers
5. **Monitor Long Executions**: Use `getExecutionStatus()` or the `unsandboxSubmit` + `unsandboxStatus` tools for long-running code
6. **Validate Input**: Sanitize user-provided code before execution
7. **Handle 404s**: Jobs may return 404 after completion if they've been cleaned up from the server

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

## API Endpoints

The Unsandbox API uses the following endpoints:

- **Submit Job**: `POST /execute/async` - Submit code for async execution
- **Check Status**: `GET /jobs/{job_id}` - Poll job status until completion
- **Cancel Job**: `POST /jobs/{job_id}/cancel` - Cancel a running job

## Migration from Old Implementation

**Old (incorrect)**:
```typescript
// ❌ Wrong endpoints and language identifier
fetch('https://api.unsandbox.com/v1/execute', {    // Wrong! No /v1
  body: JSON.stringify({ language: 'javascript', code: '...' })  // Wrong! Use 'node'
})
fetch('https://api.unsandbox.com/run', { ... })    // Wrong! Old endpoint
```

**New (correct)**:
```typescript
// ✅ Correct endpoints (no /v1 prefix) and runtime identifiers
const client = createUnsandboxClient({ apiKey });
await client.executeCode({
  language: 'node',  // Correct runtime identifier
  code: '...'
});
// Uses: POST /execute/async → GET /jobs/{job_id}
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

# Optional: Enable network access in code execution (defaults to false)
UNSANDBOX_ENABLE_SEMITRUST=true
```

Set in Vercel/Fly.io dashboard or `.env.local` for development.

## Network Security Modes

Unsandbox supports two network security modes:

### Zerotrust Mode (Default)
- **Network Access**: Disabled
- **Security**: Maximum isolation - no outbound network connections allowed
- **Use Case**: Default for all code execution to prevent unauthorized network access
- **Configuration**: Enabled by default (no environment variable needed)

### Semitrust Mode (Opt-in)
- **Network Access**: Enabled
- **Security**: Allows HTTP/HTTPS requests and API calls
- **Use Case**: When code needs to fetch data, call APIs, or access external services
- **Configuration**: Set `UNSANDBOX_ENABLE_SEMITRUST=true` environment variable

**Security Recommendation**: Only enable semitrust mode if your use case requires network access. The default zerotrust mode provides better security isolation.
