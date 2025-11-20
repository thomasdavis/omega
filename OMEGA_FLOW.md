# Omega Bot: Complete Operational Flow

## Overview

Omega is a self-improving Discord AI bot that uses Claude Code for autonomous development and GitHub Actions for automated deployment. This document describes the complete operational flow from user message to deployment.

---

## System Architecture

```
Discord User
    ↓ Sends message
Discord Gateway (WebSocket)
    ↓ MESSAGE_CREATE event
Discord.js Client (Fly.io)
    ↓ shouldRespond decision
AI Agent (OpenAI GPT-4o-mini + AI SDK v6)
    ↓ Multi-step reasoning + tools
Discord Response
```

---

## 1. User Message Flow (Discord Bot)

### Entry Point: `apps/bot/src/index.ts`
```
1. Discord.js client connects to Gateway API (WebSocket)
2. Listens for MESSAGE_CREATE events with intents:
   - Guilds, GuildMessages, MessageContent, DirectMessages
3. Routes to handleMessage()
```

### Message Processing: `apps/bot/src/handlers/messageHandler.ts`
```
1. Ignore bot messages (prevent loops)
2. Call shouldRespond() → AI decision (GPT-4o-mini)
   - Analyzes message content, mentions, questions
   - Returns: shouldRespond, confidence, reason
3. If shouldRespond = false → exit
4. If shouldRespond = true → continue:
   - Show typing indicator
   - Fetch last 20 messages for context
   - Check for file attachments (add URLs to context)
   - Call runAgent()
```

### AI Agent Execution: `apps/bot/src/agent/agent.ts`
```
1. Build system prompt from personality.json
2. Prepare conversation history context
3. Call streamText() with:
   - Model: GPT-4.1-mini (using /v1/chat/completions)
   - System prompt: Omega's personality + tool descriptions
   - Prompt: User message + conversation history
   - Tools: 20 specialized tools (search, calculator, github, etc.)
   - stopWhen: stepCountIs(10) → enables multi-step reasoning
4. Agent processes message:
   - Step 1: Analyze user request
   - Steps 2-N: Call tools as needed
   - Final step: Generate natural language response
5. onStepFinish callback tracks tool calls:
   - Captures toolName, args, results
6. Return { response, toolCalls }
```

### Response Delivery
```
1. Send tool reports FIRST (one message per tool):
   - Format: **Tool N/Total: toolName**
   - Show arguments + results in code blocks
   - Suppress URL auto-embeds with <>
2. Send final AI response as reply:
   - Uses message.reply() (no ping)
   - Max 2000 characters (Discord limit)
```

---

## 2. Claude Code Integration Flow (GitHub Actions)

### Trigger: Issue/PR Comment with `@claude`

**Workflow: `.github/workflows/claude.yml`**
```
Trigger events:
- issue_comment (created)
- pull_request_review_comment (created)
- issues (opened)

Conditions:
- Comment/issue body contains '@claude'

Steps:
1. Checkout repository
2. Run claude-code-action@v1 with OAuth token
   - Claude analyzes issue/PR context
   - Implements requested features
   - Creates commits on claude/** branch
```

### Auto-PR Creation

**Workflow: `.github/workflows/auto-create-claude-pr.yml`**
```
Trigger: Push to claude/** branches

Steps:
1. Check if PR already exists for branch → skip if yes
2. Auto-resolve merge conflicts:
   - Fetch latest main
   - Merge main into Claude branch
   - Prefer Claude's changes (git checkout --ours)
   - Push resolved branch
3. Fix pnpm lockfile if out of sync:
   - Run pnpm install --no-frozen-lockfile
   - Commit updated lockfile
4. Extract issue number from branch name (claude/issue-N-...)
5. Get issue title via GitHub API
6. Create PR:
   - Title: Issue title
   - Body: "Fixes #N" + Omega Bot signature
   - Base: main, Head: claude/**
7. Enable auto-merge (squash + delete branch) with retry logic
8. Send Discord webhook notification

Note: Deployment is handled separately by deploy-on-merge.yml workflow.
Deployment failures require manual investigation (no auto-revert).
```

### Auto-Merge PRs

**Workflow: `.github/workflows/auto-merge-claude.yml`**
```
Trigger: PR opened or synchronized

Conditions:
- PR head branch starts with 'claude/'
- PR body contains 'Fixes #N' or similar

Steps:
1. Enable auto-merge with squash strategy
2. Delete branch after merge
3. Comment: "Auto-merge enabled!"
```

---

## 3. Development Workflow (Feature Request to Deployment)

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User creates GitHub issue or comments '@claude <request>'   │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. claude.yml triggers Claude Code action                      │
│    - Analyzes request from issue/comment                        │
│    - Implements feature on claude/issue-N-timestamp branch      │
│    - Commits changes with descriptive messages                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. auto-create-claude-pr.yml triggers on push to claude/**     │
│    - Auto-resolves merge conflicts (prefers Claude's changes)   │
│    - Fixes pnpm lockfile if needed                              │
│    - Creates PR with issue title + "Fixes #N"                   │
│    - Enables auto-merge (squash + delete-branch)                │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. auto-merge-claude.yml triggers on PR creation                │
│    - Confirms PR is from claude/** branch                       │
│    - Confirms PR links to issue ("Fixes #N")                    │
│    - Enables auto-merge                                          │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. PR checks run (lint, build, tests if configured)            │
│    - If all checks pass → auto-merge to main                    │
│    - If checks fail → PR remains open, Claude can fix           │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. deploy-on-merge.yml triggers on PR merge to main           │
│    - Checks out main branch                                      │
│    - Installs Railway CLI                                        │
│    - Runs: railway up --service=$RAILWAY_SERVICE_ID             │
│    - Sends Discord notifications (starting/success/failure)      │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
                    ┌──────┴──────┐
                    │             │
              Success           Failure
                    │             │
                    ↓             ↓
    ┌─────────────────────┐  ┌────────────────────────┐
    │ Discord webhook:    │  │ Discord: "Failed!"     │
    │ "Feature deployed!" │  │ Manual investigation   │
    │ Issue auto-closes   │  │ required               │
    └─────────────────────┘  └────────────────────────┘

Note: Deployment failures are NOT automatically reverted.
Manual investigation and fixes are required to maintain code integrity.
```

### Real Example

```
User in GitHub: "@claude add a tool that tells jokes"
    ↓
Claude Code (claude.yml):
    - Creates apps/bot/src/agent/tools/tellJoke.ts
    - Updates apps/bot/src/agent/agent.ts to register tool
    - Commits to claude/issue-42-20251115-1230
    ↓
auto-create-claude-pr.yml:
    - Merges main → claude/issue-42-20251115-1230
    - Creates PR: "Add joke-telling tool"
    - Enables auto-merge
    ↓
auto-merge-claude.yml:
    - Confirms claude/** branch + "Fixes #42"
    - Enables auto-merge (squash)
    ↓
GitHub checks pass → PR merges to main
    ↓
deploy-on-merge.yml triggers:
    - Detects PR merge to main
    - Deploys to Railway (railway up)
    - Posts to Discord: "Feature deployed!"
    ↓
Railway restarts Omega with new tool
    ↓
User in Discord: "tell me a joke"
    ↓
Omega uses new tellJoke tool → delivers joke
```

---

## 4. Multi-Step Reasoning (AI SDK v6)

### How It Works

```
User: "Research quantum computing and create an essay"
    ↓
streamText() with stopWhen: stepCountIs(10)
    ↓
Step 1: Agent analyzes request
    → "I need to use researchEssay tool"
    ↓
Step 2: Calls researchEssay tool
    → Tool executes: searches web, compiles research
    → Returns: 5-page essay with citations
    ↓
Step 3: Agent receives tool result
    → Generates commentary: "I've researched quantum computing..."
    ↓
onStepFinish captures:
    - toolName: "researchEssay"
    - args: { topic: "quantum computing", length: "long" }
    - result: { essay: "...", sources: [...] }
    ↓
Response to Discord:
    1. Tool report message (args + result)
    2. AI commentary message (natural language)
```

### Step Limit

- `stopWhen: stepCountIs(10)` allows up to 10 reasoning steps
- Prevents infinite loops
- Typical conversations use 2-4 steps
- Complex multi-tool tasks can use all 10 steps

---

## 5. Key Technologies

### Discord Bot Stack
- **Discord.js**: Gateway API client (WebSocket)
- **AI SDK v6**: Agent protocol with multi-step reasoning
- **OpenAI GPT-4.1-mini**: Primary model (cost-effective)
- **Railway**: Hosting platform (migrated from Fly.io)
- **Express**: Artifact/file hosting server (port 3001)

### Development Stack
- **Turborepo**: Monorepo management
- **pnpm 9.0.0**: Package manager
- **TypeScript**: Type-safe development
- **Node.js 20**: Runtime environment

### CI/CD Stack
- **GitHub Actions**: Automation workflows
- **Claude Code**: Autonomous development
- **Railway CLI**: Deployment CLI

---

## 6. Data Flow Summary

### Discord → Bot
```
User message
→ Discord Gateway (WebSocket)
→ Discord.js Client (Railway)
→ shouldRespond AI check
→ AI Agent with tools
→ Tool execution (if needed)
→ Response generation
→ Discord API (REST)
→ User sees response
```

### GitHub → Deployment
```
@claude comment
→ claude.yml workflow
→ Claude Code implementation
→ Push to claude/** branch
→ auto-create-claude-pr.yml
→ Create PR + enable auto-merge
→ auto-merge-claude.yml
→ Merge to main (if checks pass)
→ deploy-on-merge.yml
→ Railway deployment
→ Discord notification
→ Bot restarts with new code
```

### Feature Request → Production
```
Typical timeline: 2-5 minutes (fully automated)

1. Issue created: 0:00
2. Claude starts: 0:05
3. Implementation: 0:30-3:00 (depends on complexity)
4. PR created: +0:05
5. Checks run: +0:30
6. Merge: +0:01
7. Deploy: +1:00
8. Live: 2-5 minutes total
```

---

## 7. Failure Handling

### Deployment Failures
```
If railway up fails:
1. Discord notification: "Deployment failed"
2. PR remains merged on main
3. Manual investigation required to determine cause
4. Options:
   - Fix the issue with a follow-up commit
   - Manually revert if needed: git revert -m 1 <merge-commit>
   - Check Railway logs for infrastructure issues

Note: Automatic reverts were removed after an incident where working code
was deleted due to temporary infrastructure issues. Manual review ensures
that only genuinely problematic changes are reverted.
```

### PR Check Failures
```
If linting/tests fail:
1. PR remains open (not merged)
2. Auto-merge waits for fixes
3. User can @claude to fix issues
4. Once fixed, auto-merge proceeds
```

### Runtime Errors
```
If bot crashes:
1. Railway auto-restarts (health checks)
2. Discord.js reconnects to Gateway
3. Error logged to stdout (Railway logs)
4. No data loss (stateless design)
```

---

## 8. Key Files Reference

### Bot Core
- `apps/bot/src/index.ts` - Entry point, Discord client setup
- `apps/bot/src/handlers/messageHandler.ts` - Message routing
- `apps/bot/src/agent/agent.ts` - AI agent with tools
- `apps/bot/src/lib/shouldRespond.ts` - Response decision logic

### Workflows
- `.github/workflows/claude.yml` - Claude Code integration
- `.github/workflows/auto-create-claude-pr.yml` - PR automation
- `.github/workflows/auto-merge-claude.yml` - Auto-merge logic

### Configuration
- `apps/bot/src/config/personality.json` - Bot personality
- `railway.json` / `railway.toml` - Railway deployment config
- `turbo.json` - Turborepo tasks
- `pnpm-workspace.yaml` - Workspace definition

### Documentation
- `CLAUDE.md` - Deployment learnings
- `ARCHITECTURE_PLAN.md` - Design decisions
- `README.md` - Setup instructions
- `OMEGA_FLOW.md` - This document

---

## 9. Security & Ethics

### Bot Security
- Validates Discord signatures (verifies requests are from Discord)
- Respects robots.txt before web scraping (webFetch tool)
- Sanitizes filenames (fileUpload tool)
- Validates file extensions (prevents malicious uploads)
- Requires user approval for self-modifications (selfModify tool)

### GitHub Security
- Uses GitHub App with minimal permissions
- OAuth token stored as secret
- Branch protection on main (requires PR)
- Auto-merge only for claude/** branches
- Manual review for deployment failures (no auto-revert)

### Deployment Security
- Railway environment variables for API keys
- No secrets in code or logs
- Read-only file system (except persistent storage)
- Health checks for availability

---

## 10. Performance Characteristics

### Response Times
- shouldRespond decision: ~500ms (GPT-4o-mini)
- Simple query (no tools): ~1-2 seconds
- Single tool call: ~2-5 seconds
- Multi-tool orchestration: ~5-15 seconds
- Max timeout: 30 seconds (Railway limit)

### Scalability
- Discord Gateway: Single WebSocket (not horizontally scalable)
- AI API calls: Parallel execution where possible
- Railway: Autoscaling based on load (if configured)
- Cost: ~$5-20/month (Railway + OpenAI)

### Resource Usage
- Memory: ~200MB baseline
- CPU: <5% idle, 50-80% during AI calls
- Storage: 1GB volume for artifacts/uploads
- Network: <1GB/month typical usage

---

## Conclusion

Omega is a fully autonomous Discord AI bot with self-improving capabilities. The complete flow from user message to response takes 1-15 seconds, while feature development from GitHub issue to production deployment takes 2-5 minutes—entirely automated through Claude Code and GitHub Actions.

**Key Innovation:** The bot can implement its own features by creating GitHub issues that Claude Code automatically implements, tests, merges, and deploys to production, with Discord notifications at each stage.
