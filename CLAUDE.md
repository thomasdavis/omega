# Omega

Discord AI bot powered by AI SDK v6 + OpenAI. Monorepo with Turborepo + pnpm workspaces.

## Principles

- Don't take shortcuts — do things properly
- Build, typecheck, and verify before committing
- Use `railway` CLI for deployment and debugging
- Use `gh` CLI for GitHub operations

## Architecture

```
omega/
├── apps/bot/          # Discord bot (Gateway API, always-on)
├── apps/web/          # Next.js web app (serves artifacts, blog, docs)
├── packages/agent/    # AI agent core (tools, system prompt, tool routing)
├── packages/shared/   # Shared utilities + model config
├── packages/database/ # Prisma + PostgreSQL + MongoDB tools
└── packages/ui/       # UI components
```

**Key files:**
- `packages/agent/src/agent.ts` — main agent loop (streamText + stopWhen)
- `packages/agent/src/lib/systemPrompt.ts` — Omega's personality and instructions
- `packages/agent/src/toolRegistry/metadata.ts` — tool metadata + CORE_TOOLS
- `packages/agent/src/toolLoader.ts` — dynamic tool loading (TOOL_IMPORT_MAP)
- `packages/agent/src/toolRouter.ts` — BM25 tool selection per message

## Tech Stack

- **AI SDK v6** (`ai@^6.0.86`) — `streamText`, `generateText`, `Output.object()`, `tool()`, `stopWhen(stepCountIs())`
- **@ai-sdk/openai v3** (`@ai-sdk/openai@^3.0.29`) — use `openai.chat(MODEL)` for Chat Completions API
- **Discord.js v14** — Gateway API with MESSAGE_CONTENT intent
- **PostgreSQL** on Railway — via Prisma
- **MongoDB** on Railway — flexible document storage
- **TPMJS** — external tool registry (search + execute are CORE_TOOLS)

## Development

```bash
pnpm install                    # install deps
pnpm dev                        # run all in dev mode
pnpm build                      # build everything (turbo)
pnpm --filter @repo/agent build # build single package
pnpm --filter bot type-check    # typecheck bot (builds deps first)
```

Build order matters: shared → database → agent → bot/web (turbo handles this).

## Railway (Production)

Two services share a persistent volume at `/data`:
- **omega-bot** — Discord bot (Dockerfile at `apps/bot/Dockerfile`)
- **omega** — Next.js web app (Dockerfile at `apps/web/Dockerfile`)

```bash
railway logs                         # tail runtime logs (both services)
railway logs --service omega-bot     # bot logs only
railway shell                        # shell into container
railway variables                    # list env vars
railway variables set KEY=value      # set env var (triggers redeploy)
railway run bash -c 'command'        # run command in Railway env
```

**Debugging production issues:**
1. `railway logs` — check for errors in real-time
2. `railway shell` — inspect container state, check `/data` volume
3. `railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "SELECT ..."'` — query production DB

## Database

**PostgreSQL** (Railway): `switchback.proxy.rlwy.net:11820`

```bash
# Pull production schema
cd packages/database
DATABASE_URL="postgresql://postgres:<pw>@switchback.proxy.rlwy.net:11820/railway" pnpm prisma db pull
pnpm prisma generate

# Run migrations on Railway
railway run bash -c 'cd packages/database && DATABASE_URL=$DATABASE_PUBLIC_URL pnpm prisma migrate deploy'

# Direct SQL on production
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "YOUR SQL HERE"'
```

Always use `IF NOT EXISTS` / `IF EXISTS` for idempotent migrations.

## AI SDK Patterns

```typescript
// Tool definition (all tools follow this pattern)
import { tool } from 'ai';
import { z } from 'zod';

export const myTool = tool({
  description: 'What this tool does',
  inputSchema: z.object({ param: z.string() }),
  execute: async ({ param }) => ({ result: 'done' }),
});

// Structured output (generateObject is DEPRECATED — use this instead)
import { generateText, Output } from 'ai';
const { output } = await generateText({
  model: openai.chat(OMEGA_MODEL),
  output: Output.object({ schema: z.object({ ... }) }),
  prompt: '...',
});

// Agent loop (main pattern in agent.ts)
import { streamText, stepCountIs } from 'ai';
const result = streamText({
  model: openai.chat(OMEGA_MODEL),
  system: buildSystemPrompt(...),
  prompt: userMessage,
  tools,
  stopWhen: stepCountIs(30),
  onStepFinish: (step) => { /* track tool calls */ },
});
```

**Important:** `openai.chat(MODEL)` forces Chat Completions API. In @ai-sdk/openai v3, bare `openai(MODEL)` uses the Responses API.

## TPMJS Integration

Omega uses TPMJS as its primary tool extension system. Two core tools are always loaded:
- `tpmjsRegistrySearch` — search for tools by keyword
- `tpmjsRegistryExecute` — execute tools by toolId

All of Omega's env vars are forwarded to TPMJS tool executions automatically.

## Tool System

Tools are selected per-message via BM25 ranking against `metadata.ts`. CORE_TOOLS bypass BM25 and are always loaded:

```typescript
// packages/agent/src/toolRegistry/metadata.ts
export const CORE_TOOLS = [
  'search', 'calculator', 'webFetch', 'fileUpload', 'whoami',
  'tpmjsRegistrySearch', 'tpmjsRegistryExecute',
];
```

To add a new tool:
1. Create `packages/agent/src/tools/myTool.ts` using `tool()` from `ai`
2. Add metadata entry in `packages/agent/src/toolRegistry/metadata.ts`
3. Add import mapping in `packages/agent/src/toolLoader.ts` (TOOL_IMPORT_MAP)

## Self-Editing Bot & GitHub Actions Pipeline

Omega is a self-improving system. It can create GitHub issues via `reportMissingTool` and `githubCreateIssue` tools. These issues are then automatically implemented by Claude Code running in GitHub Actions.

### How the pipeline works:

1. **Issue created** (by Omega, a user, or manually) → tagged with `@claude`
2. **claude-trigger.yml** — Claude Code picks up the issue, creates a branch (`claude/issue-N-timestamp`), implements the fix/feature, pushes
3. **claude-pr-create.yml** — auto-creates a PR from the Claude branch, links to the issue
4. **claude-review.yml** — Claude reviews the PR for quality
5. **ci-pr.yml** — CI runs (build, typecheck, lint)
6. **claude-retry.yml** — if CI fails, Claude gets another shot (up to 5 retries)
7. **claude-merge.yml** — if CI passes, auto-squash-merges and closes the issue
8. **Railway auto-deploys** from main

### Tips for Claude in GitHub Actions

When implementing issues, Claude Code reads this CLAUDE.md for guidance. Key things to get right:

**Quality standards:**
- Always run `pnpm --filter @repo/agent build` to verify before pushing
- Use AI SDK v6 patterns — `tool()` with `inputSchema`, `generateText` with `Output.object()` (NOT `generateObject`)
- Use `openai.chat(OMEGA_MODEL)` — never bare `openai(MODEL)`
- Import `OMEGA_MODEL` from `@repo/shared` for model consistency
- Keep tools focused and single-purpose
- Add proper metadata (description, keywords, examples, category) in `metadata.ts`

**Common mistakes to avoid:**
- Don't use deprecated `generateObject` / `streamObject` — use `generateText` + `Output.object()`
- Don't use `maxSteps` — use `stopWhen(stepCountIs(N))`
- Don't use `CoreMessage` — use `ModelMessage`
- Don't hardcode model names — use `OMEGA_MODEL` from shared
- Don't forget to add tools to both `metadata.ts` AND `toolLoader.ts`
- Don't add tools to CORE_TOOLS unless they genuinely need to be available in every conversation

**Tool quality checklist:**
- [ ] Tool has a clear, specific description
- [ ] inputSchema uses descriptive `.describe()` on each field
- [ ] Tool handles errors gracefully (returns error objects, doesn't throw)
- [ ] Tool metadata has good keywords and examples for BM25 matching
- [ ] Tool is categorized correctly (content, development, web, data, etc.)
- [ ] If the tool calls an external API, API keys should come from env vars

**Improving existing tools:**
- Check if tool descriptions are vague → improve for better BM25 matching
- Check if error handling is missing → add try/catch with informative error returns
- Check if tools duplicate TPMJS capabilities → prefer TPMJS tools
- Check if tool metadata keywords are poor → add more relevant keywords/examples

## GitHub Actions Model

All Claude Code GitHub Actions use `--model claude-opus-4-6`. This is configured in:
- `.github/workflows/claude-trigger.yml`
- `.github/workflows/claude-review.yml`
