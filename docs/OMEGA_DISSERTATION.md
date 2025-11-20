# Omega: A Self-Coding Discord Agent — Technical Dissertation

## Abstract
Omega is a Discord-native, self-improving agent that translates conversational intent into shipped software updates. It couples a Gateway listener with a tool-rich AI SDK v6 agent, an artifact/file hosting surface, and CI/CD automation on GitHub + Railway. This document provides a comprehensive, research-oriented analysis of the system: design motivations, architectural layers, tooling substrate, interaction model, safety posture, operational workflow, evaluation practices, and forward-looking research directions for socially embedded, self-modifying agents.

## 1. Problem Statement and Scope
- **Goal:** Demonstrate that a socially embedded agent can autonomously extend its own affordances (tools, behaviors, deployments) while maintaining transparency, safety, and production reliability.
- **Setting:** Discord real-time messaging with full Gateway presence (not slash-command constrained), persistent storage for artifacts and uploads, and automated delivery pipelines.
- **Thesis:** Natural-language requests (“build a recipe tool”) can map to end-to-end changes: code generation, registration, testing, deployment, and immediate user-facing utility—closing the loop from intent to production with minimal human intervention.

## 2. Constraints and Design Choices
- **Gateway-first architecture:** Discord has no inbound webhooks for MESSAGE_CREATE; a persistent WebSocket is mandatory. Serverless-only patterns are rejected (`ARCHITECTURE_PLAN.md`) in favor of a long-lived process.
- **Two-tier AI flow:** Lightweight gating (`apps/bot/src/lib/shouldRespond.ts`) prevents social intrusion; heavyweight agent (`apps/bot/src/agent/agent.ts`) performs tool orchestration.
- **Transparency:** Every tool call is surfaced to users as embeds with arguments/results before the final reply, reinforcing trust and debuggability.
- **Rich output substrate:** An artifact server (`apps/bot/src/server/artifactServer.ts`) plus uploads enable expressive HTML/SVG/markdown and binary attachments beyond Discord text limits.
- **Automation:** GitHub workflows and Railway deployment enforce a continuous delivery loop; Claude Code automation is documented in `OMEGA_FLOW.md`.
- **Ethics and safety:** Robots.txt compliance, upload sanitization, path validation, explicit refusal patterns, and guidance against sharing secrets with remote executors.

## 3. System Architecture
### 3.1 Runtime Stack
- Node.js 20, TypeScript (ESM), Discord.js v14, AI SDK v6 (GPT-4o chat completions), Express for hosting, pnpm + Turborepo for monorepo orchestration.

### 3.2 Entry and Message Path
- `apps/bot/src/index.ts`: loads env, initializes storage, starts artifact server, and connects to Discord Gateway with required intents.
- `apps/bot/src/handlers/messageHandler.ts`: ignores bots, fetches history (20 messages), enriches attachments, sets per-tool message contexts, shows typing, calls `runAgent`, then sends tool-report embeds followed by the final reply with rate-limit-friendly spacing.

### 3.3 Decision Layer
- `apps/bot/src/lib/shouldRespond.ts`: four-level framework (rejection → addressee vs mentioned → intent → conversation flow), structured AI output via zod schema, defaults to DMs/mentions and one public channel (#omega) for unsolicited replies.

### 3.4 Agent Orchestration
- `apps/bot/src/agent/agent.ts`: builds persona/system prompt (`apps/bot/src/lib/systemPrompt.ts`), injects history, registers ~25 tools, constrains reasoning with `stepCountIs(10)`, captures tool calls/results for user telemetry.
- Central model selection in `apps/bot/src/config/models.ts`.

### 3.5 Tooling Surface (Representative Set)
- **Execution:** `unsandbox`, `unsandboxSubmit`, `unsandboxStatus` (11 languages) with Discord progress pings; client and polling tests in `apps/bot/src/lib/unsandbox/*`.
- **Web/Research:** `webFetch` (robots-aware), `researchEssay`, `hackerNewsPhilosophy`.
- **Content/Visualization:** `artifact`, `generateHtmlPage`, `renderChart`, `asciiGraph`, `conversationToSlidev`, `buildSlidevPresentation`, `createBlogPost`, `recipeGenerator`.
- **Utility/Social:** `whoami`, `moodUplifter`, `tellJoke`, `linuxAdvantages`, `fileUpload`, `exportConversation`, `listArtifacts`.
- **DevOps/Meta:** `githubCreateIssue`/`githubUpdateIssue`, `codeQuery`, `jsonAgentGenerator`, `getOmegaManifest`, `ooda`.

### 3.6 Hosting Layer
- `apps/bot/src/server/artifactServer.ts`: serves artifacts by UUID (file or folder), static assets with traversal guards, uploads, simple TTS, and blog rendering. CORS enabled; rate-limiting for TTS; content-type inference for assets.

### 3.7 Storage
- Centralized path helpers (`apps/bot/src/utils/storage.ts`) for artifacts/uploads/public directories; important for persistence on Railway volumes.

## 4. Interaction Model and UX
- **Pre-response gating:** Avoids interjecting in social chatter; respects explicit rejection signals.
- **Contextual enrichment:** Pulls recent history and attachment metadata into the user prompt.
- **Tool transparency:** Each tool call is rendered as an embed with arguments/results; renderChart attachments are downloaded and reattached to Discord.
- **Progress cues:** Unsandbox tool emits in-channel status messages (job submission, polling).
- **Tone and persona:** System prompt defines wit, clarity, accuracy, and ethical behavior; humor is woven but not at the expense of correctness.

## 5. Safety, Ethics, and Compliance
- **Robots.txt:** webFetch must honor robots.txt by contract; system prompt reinforces this norm.
- **Input validation:** zod schemas on tool inputs; filename and path validation in artifact server; upload sanitization and content-type checks.
- **Secrets hygiene:** Policy-level prohibition on sending secrets to executors; sensitive env vars are runtime-only (`README.md`).
- **Refusal handling:** shouldRespond rejects when users say “don’t respond” or similar.
- **Limited blast radius:** Single process; no privileged file-system mutations beyond workspace and configured storage; no .git internals edits.

## 6. CI/CD and Operations
- **CI:** `ci-check-workflow.yml` runs pnpm install, type-check, lint, build on PRs and main. Autofix job optionally commits lint fixes on PR branches.
- **Delivery:** Railway deployment (docs in `README.md` and `OMEGA_FLOW.md`); Railway health requires listening on `PORT` for artifact server.
- **Self-coding loop:** Claude Code branches (`claude/**`) auto-PR and auto-merge when checks pass; deployment triggers on merge; Discord webhook notifications described in `OMEGA_FLOW.md`.
- **Runtime stability:** Process signal handling (SIGINT/SIGTERM) and unhandled rejection logging in `apps/bot/src/index.ts`.

## 7. Evaluation and Testing
- **Current coverage:** Vitest suites for Unsandbox polling, TTS validation, HTML metadata parsing, and storage behaviors (`apps/bot/src/lib/unsandbox/*.test.ts`, `apps/bot/src/lib/tts.test.ts`, `apps/bot/src/utils/htmlMetadata.test.ts`).
- **Gaps:** Many tools (visualization, artifact generation, research workflows) lack automated coverage; prompt drift untested; no load or resilience tests for Gateway reconnection/sharding.
- **Operational signals:** Console + Railway logs; tool telemetry visible to users; no formal metrics/alerting yet.

## 8. Risks and Limitations
- **Scalability:** Single Gateway connection; no sharding/HA; rate-limit sensitivity in busy servers.
- **Prompt drift:** Tool roster and deployment reality can diverge from the long system prompt; no automated prompt regression tests.
- **Security boundary:** Unsandbox is a trusted remote executor; relies on policy to avoid secret exfiltration; limited technical enforcement.
- **Observability:** Lacks metrics, tracing, and alerting; relies on logs and in-Discord telemetry.
- **Testing depth:** Limited integration and property-based tests; no chaos/resilience testing.

## 9. Best Practices (Current and Recommended)
- **Gating discipline:** Keep shouldRespond strict for unsolicited channels; always respect explicit opt-out language.
- **Transparency:** Continue surfacing tool calls before responses; attach artifacts/charts rather than restating raw tool output.
- **Robust inputs:** Prefer zod schemas for all tool arguments; validate URLs, file names, and extensions before network/file operations.
- **Secrets discipline:** Never send secrets to Unsandbox or external APIs; audit prompts and tool wiring for accidental leakage.
- **Error handling:** Use `generateUserErrorMessage` for user-facing fallbacks; log with structured context (`apps/bot/src/utils/errorLogger.ts`).
- **Artifacts:** Sanitize paths and filenames; ensure content-type correctness; avoid inline scripts where not needed; prefer self-contained HTML/CSS/JS to simplify hosting.
- **Performance:** Shorten prompts when possible; cache channel metadata where safe; respect Discord rate limits with small delays between messages.
- **Operational playbooks:** Monitor Railway logs for reconnect loops; confirm `PORT` binding; ensure env vars for Discord/OpenAI/Unsandbox/GitHub are present.

## 10. Research Directions
- **Reliability/HA:** Sharding and horizontal scaling for Gateway; reconnection backoff strategies; health endpoints for process supervisors.
- **Guardrails:** Static/dynamic secret scanners on tool inputs; URL/domain allowlists; policy checks before network fetch or code execution.
- **Prompt governance:** Snapshot testing of system prompt/tool registry; linting for tool descriptions to enforce accuracy; drift detection against codebase state.
- **Observability:** Metrics for tool success/latency, decision rates, rate-limit events; dashboards and alerts; per-tool SLOs.
- **Testing:** Integration harness for top tools (renderChart, artifact generation, webFetch) with golden outputs; load tests for message bursts; chaos testing for network partitions.
- **UX controls:** Per-channel admin policies, opt-out lists, and sensitivity tiers for tools (code execution, web fetch); human-in-the-loop for high-risk actions.
- **Data surfaces:** Database-backed metadata for artifacts/uploads, search/indexing of generated assets, provenance tagging for artifacts.

## 11. Conclusion
Omega operationalizes a self-coding loop inside a social surface: it listens, decides when to engage, orchestrates tools transparently, and deploys its own changes. The architecture unifies Gateway presence, multi-tool reasoning, artifact hosting, and CI/CD automation into a coherent system that can evolve through conversation. Advancing Omega now hinges on scaling reliability, deepening testing and observability, strengthening secret/guardrail enforcement, and institutionalizing prompt governance—steps that move it from an impressive self-modifying bot to a robust platform for autonomous, socially aware software evolution.

## 12. Appendix: Key File Map
- `apps/bot/src/index.ts`: process entry; Discord client + artifact server bootstrap.
- `apps/bot/src/handlers/messageHandler.ts`: message flow, history/attachment enrichment, tool telemetry, final reply.
- `apps/bot/src/lib/shouldRespond.ts`: AI gating, four-level decision framework.
- `apps/bot/src/agent/agent.ts`: agent orchestration, tool registry, step-limited reasoning.
- `apps/bot/src/lib/systemPrompt.ts`: identity, ethics, tool guidance, humor/persona.
- `apps/bot/src/server/artifactServer.ts`: artifact/upload hosting, TTS, blog rendering.
- `apps/bot/src/agent/tools/*.ts`: tool implementations (execution, research, content, ops).
- `apps/bot/src/lib/unsandbox/*`: Unsandbox client, polling logic, and tests.
- `ci-check-workflow.yml`: CI (type-check, lint, build) and autofix job.
- `README.md`, `ARCHITECTURE_PLAN.md`, `OMEGA_FLOW.md`: setup, architectural decisions, operational flow.
