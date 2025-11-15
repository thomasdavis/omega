# AI SDK v6 Beta.99 Schema Serialization Bug

## Problem Summary

When using AI SDK v6.0.0-beta.99 with OpenAI, all tool schemas are failing with the error:

```
Invalid schema for function 'search': schema must be a JSON Schema of 'type: "object"', got 'type: "None"'.
```

This error occurs at runtime when calling OpenAI's API, even though TypeScript compilation succeeds.

## Environment

- **AI SDK**: `ai@6.0.0-beta.99` (beta version - **NOT STABLE**)
  - Latest stable: `ai@5.0.93`
  - Beta.99 is the newest beta (there is no newer beta)
- **OpenAI Provider**: `@ai-sdk/openai@2.0.67`
- **Zod**: `zod@3.25.76` (latest stable)
- **TypeScript**: `5.9.3`
- **Node.js**: Latest
- **Platform**: Fly.io (production), macOS (development)

## Root Cause

AI SDK v6.0.0-beta.99 is calling OpenAI's **experimental `/v1/responses` endpoint** instead of the standard `/v1/chat/completions` endpoint. This is visible in the error logs:

```javascript
url: 'https://api.openai.com/v1/responses'
```

The `/v1/responses` endpoint has a bug where it cannot properly parse Zod schemas serialized by AI SDK's `@ai-sdk/provider-utils`. The schema conversion from Zod to JSON Schema is producing `'type: "None"'` instead of a valid JSON Schema object.

## Evidence from Error Logs

```
Error in AI agent: APICallError [AI_APICallError]: Invalid schema for function 'search':
schema must be a JSON Schema of 'type: "object"', got 'type: "None"'.

at file:///app/node_modules/.pnpm/@ai-sdk+provider-utils@3.0.17_zod@3.25.76/
node_modules/@ai-sdk/provider-utils/dist/index.mjs:889:14

url: 'https://api.openai.com/v1/responses',
param: 'tools[0].parameters',
code: 'invalid_function_parameters'
```

The error specifically states that `tools[0].parameters` (the search tool, first in the array) has an invalid schema.

## Example Tool Schema (Search Tool)

```typescript
export const searchTool = tool({
  description: 'Search the web for information about a topic using DuckDuckGo. Returns search results with titles, snippets, and URLs.',
  parameters: z.object({
    query: z.string().describe('The search query'),
    numResults: z.number().optional().describe('Number of results to return (default 5, max 10)'),
  }),
  execute: async ({ query, numResults = 5 }) => {
    // Implementation...
  },
});
```

This is a perfectly valid Zod schema with:
- A required `query` string parameter
- An optional `numResults` number parameter

Yet AI SDK v6 beta.99 serializes this to `'type: "None"'` when sending to OpenAI's `/v1/responses` endpoint.

## What We've Tried

### 1. Downgrading to AI SDK v3.3.0
**Result**: Failed due to version conflicts

```bash
pnpm add "ai@3.3.0" "@ai-sdk/openai@0.0.66"
```

**Error**: Incompatible `@ai-sdk/provider` versions (0.0.14 vs 0.0.24)
- `ai@3.3.0` depends on `@ai-sdk/provider@0.0.14`
- `@ai-sdk/openai@0.0.66` depends on `@ai-sdk/provider@0.0.24`

TypeScript compilation failed with hundreds of type mismatch errors about `LanguageModelV1StreamPart`.

### 2. Changing Optional Parameters to Required
**Tried**: Changing `.optional()` to `.default()` or making all parameters required

**Result**: Same error - the issue is not with optional parameters, but with the entire schema serialization process.

### 3. Disabling TypeScript Strict Mode
**Tried**:
```json
{
  "strict": false,
  "noImplicitAny": false,
  "noEmitOnError": false
}
```

**Result**: Build succeeds but runtime error persists. This is a runtime API issue, not a TypeScript issue.

### 4. Upgrading Zod
**Tried**: Ensuring latest Zod version

**Result**: Already using `zod@3.25.76` (latest stable). Schema issue is not related to Zod version.

## Technical Details

### The `/v1/responses` Endpoint

AI SDK v6 beta.99 uses OpenAI's experimental `/v1/responses` endpoint which:
- Is not documented in standard OpenAI API docs
- Has different schema validation than `/v1/chat/completions`
- Appears to have bugs with JSON Schema validation
- Returns errors for valid Zod schemas that work fine with `/v1/chat/completions`

### Schema Serialization Flow

1. **Zod Schema** (defined in tool)
   ```typescript
   z.object({
     query: z.string(),
     numResults: z.number().optional()
   })
   ```

2. **AI SDK Serialization** (@ai-sdk/provider-utils)
   - Converts Zod schema to JSON Schema
   - Something goes wrong here - produces `'type: "None"'`

3. **OpenAI API** (/v1/responses endpoint)
   - Validates JSON Schema
   - Rejects with error: `Invalid schema: got 'type: "None"'`

## Why This is a Beta.99 Bug

1. **Experimental Endpoint**: Beta.99 uses `/v1/responses` which is experimental
2. **No Community Reports**: No widespread reports of this issue suggest it's specific to beta.99 + this endpoint combination
3. **Valid Schemas Fail**: Even the simplest valid Zod schemas fail
4. **All Tools Affected**: Not just one tool - ALL 17 tools fail with same error
5. **Build Success, Runtime Fail**: TypeScript compilation works fine, suggesting code is correct

## Current Workarounds Considered

### Option 1: Wait for AI SDK v6 Stable Release
- Beta.99 is a pre-release version
- Wait for official v6.0.0 stable which likely uses `/v1/chat/completions`

### Option 2: Downgrade to AI SDK v5.0.93 (RECOMMENDED)
- `ai@5.0.93` is the latest **stable** release
- Uses standard `/v1/chat/completions` endpoint
- Well-tested and production-ready
- Missing v6-only features:
  - No `maxSteps` parameter (v6 beta feature)
  - No `onStepFinish` callback (v6 beta feature)
  - May have different tool orchestration behavior
- **This is likely the best solution for production**

### Option 3: Manual OpenAI API Calls
- Bypass AI SDK entirely
- Call `/v1/chat/completions` directly
- Manually implement tool calling logic
- Lose AI SDK benefits (streaming, tool orchestration, etc.)

### Option 4: Simplify Tool Schemas
- Remove all optional parameters
- Use only required string parameters
- May reduce functionality but might work around serialization bug

## Questions for ChatGPT/Community

1. **Is `/v1/responses` a known experimental endpoint with schema bugs?**
2. **Has anyone successfully used AI SDK v6.0.0-beta.99 with OpenAI tools?**
3. **Is there a way to force AI SDK beta.99 to use `/v1/chat/completions` instead?**
4. **Should we downgrade to AI SDK v5.x stable? If so, which version?**
5. **Is there a newer beta version after beta.99 that fixes this?**
6. **Could this be an OpenAI API issue rather than AI SDK issue?**

## Reproduction Steps

1. Install dependencies:
   ```bash
   pnpm add ai@6.0.0-beta.99 @ai-sdk/openai@2.0.67 zod@3.25.76
   ```

2. Create a simple tool:
   ```typescript
   import { tool } from 'ai';
   import { z } from 'zod';

   export const testTool = tool({
     description: 'A test tool',
     parameters: z.object({
       query: z.string(),
     }),
     execute: async ({ query }) => ({ result: query }),
   });
   ```

3. Use in generateText:
   ```typescript
   import { generateText } from 'ai';
   import { openai } from '@ai-sdk/openai';

   const result = await generateText({
     model: openai('gpt-4o'),
     prompt: 'test',
     tools: { test: testTool },
   });
   ```

4. **Expected**: Tool works fine
5. **Actual**: Error: `Invalid schema for function 'test': schema must be a JSON Schema of 'type: "object"', got 'type: "None"'`

## Additional Context

- This is a production Discord bot with 17 tools
- All tools fail with the same schema error
- Build and deployment succeed
- Error only occurs at runtime when OpenAI API is called
- Using TypeScript in ESM mode (NodeNext)
- Monorepo setup with Turborepo + pnpm workspaces

## Request for Help

We need guidance on:
1. Whether this is a known issue with beta.99
2. The best version of AI SDK to use for production
3. How to work around this schema serialization bug
4. Whether we should report this to Vercel AI SDK team
