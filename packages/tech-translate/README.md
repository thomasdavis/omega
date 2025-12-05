# @omega/tech-translate

> Tech Translation tool - transforms natural language requests into detailed technical specifications

## Overview

`@omega/tech-translate` is a tool that converts casual user requests into comprehensive, actionable technical specifications. It follows the **tpmjs Tool Schema** and provides both a library API and a CLI interface.

The tool applies charitable interpretation, assumes good faith, and generates specifications with best practices across architecture, API design, data modeling, DevOps, testing, and more.

## Features

- 📋 **Structured Output**: Follows tpmjs Tool Schema with validated input/output
- 🎯 **Best Practices**: Incorporates industry standards for architecture, security, testing
- 🔄 **Dual Formats**: Supports both Markdown and JSON output modes
- ⚡ **Flexible API**: Use as a library or via CLI
- ✅ **Type-Safe**: Full TypeScript support with strict types
- 🧪 **Well-Tested**: Golden fixtures and schema validation tests

## Installation

```bash
pnpm add @omega/tech-translate
```

Or install globally to use the CLI:

```bash
pnpm add -g @omega/tech-translate
```

## Usage

### CLI

#### Basic usage

```bash
tech-translate --request "make a status page" --mode markdown
```

#### With assumptions and constraints

```bash
tech-translate \
  --request "build a real-time chat system" \
  --audience backend \
  --assumption "Users are authenticated" \
  --assumption "WebSocket support available" \
  --constraint "Must scale to 10k concurrent users" \
  --mode markdown
```

#### Output to file

```bash
tech-translate --request "create an API gateway" --out spec.md
```

#### Read from stdin (JSON input)

```bash
cat input.json | tech-translate --stdin --mode json
```

**Input JSON format:**

```json
{
  "request": "make a status page",
  "audience": "fullstack",
  "assumptions": ["Monitoring data already available"],
  "constraints": ["Must work on mobile"],
  "outputMode": "markdown"
}
```

#### CLI options

```
-r, --request <text>       User request to translate
-m, --mode <mode>          Output mode: markdown or json (default: markdown)
-a, --assumption <text>    Add a charitable assumption (repeatable)
--audience <type>          Target audience: infra|backend|frontend|fullstack|ml|security|product|mixed
-c, --constraint <text>    Add a constraint (repeatable)
-o, --out <file>           Output file (optional, defaults to stdout)
--stdin                    Read input JSON from stdin
-h, --help                 Display help
-V, --version              Display version
```

### Library API

```typescript
import { runTechTranslate } from '@omega/tech-translate';
import type { TechTranslateInput, TechTranslateOutput } from '@omega/tech-translate';
import { renderMarkdown } from '@omega/tech-translate/renderers/markdown';
import { renderJson } from '@omega/tech-translate/renderers/json';

const input: TechTranslateInput = {
  request: 'make a status page',
  audience: 'fullstack',
  assumptions: ['Users are authenticated'],
  constraints: ['Must be mobile-friendly'],
};

// Run translation
const output: TechTranslateOutput = await runTechTranslate(input);

// Render as markdown
const markdown = renderMarkdown(output);
console.log(markdown);

// Or render as JSON
const json = renderJson(output);
console.log(json);
```

### Input Schema

```typescript
interface TechTranslateInput {
  request: string;                    // Required: the user's request
  assumptions?: string[];             // Optional: charitable assumptions
  audience?: 'infra' | 'backend' | 'frontend' | 'fullstack' | 'ml' | 'security' | 'product' | 'mixed';
  outputMode?: 'markdown' | 'json';   // Default: 'markdown'
  constraints?: string[];             // Optional: technical constraints
  context?: Record<string, unknown>;  // Optional: additional context
}
```

### Output Schema

```typescript
interface TechTranslateOutput {
  title: string;
  summary: string;
  spec: {
    goals: string[];
    nonGoals?: string[];
    architecture: string;
    apiDesign: string;
    dataModel: string;
    security?: string;
    devOps: string;
    testing: string;
    observability?: string;
    migrationPlan?: string;
    acceptanceCriteria: string[];
  };
  artifacts?: Array<{
    type: 'markdown' | 'json' | 'mermaid' | 'sql' | 'yaml' | 'http' | 'shell' | 'code';
    filename?: string;
    content: string;
  }>;
  notes?: string[];
  warnings?: string[];
}
```

## Examples

### Example 1: Simple status page

**Input:**
```bash
tech-translate --request "make a status page" --audience fullstack
```

**Output:** (abbreviated)
```markdown
# Technical Specification: Make a status page

This specification provides a comprehensive technical plan for implementing: "make a status page"...

## Goals
- Implement make a status page with high reliability and performance
- Ensure scalability and maintainability
- Follow security best practices

## Architecture
The architecture for make a status page will follow a modular design pattern...
```

### Example 2: Complex system with constraints

**Input:**
```bash
tech-translate \
  --request "real-time analytics dashboard" \
  --audience "fullstack" \
  --assumption "Data pipeline already exists" \
  --constraint "Sub-second latency required" \
  --constraint "Must handle 100k events/sec"
```

## Development

### Build

```bash
pnpm build
```

This generates both ESM and CJS builds with TypeScript declarations in `dist/`.

### Test

```bash
pnpm test         # Run tests once
pnpm test:watch   # Watch mode
```

### Type Check

```bash
pnpm type-check
```

### Lint

```bash
pnpm lint
pnpm lint:fix
```

## Tool Manifest (tpmjs Schema)

This tool conforms to the **tpmjs Tool Schema**:

```typescript
{
  id: "omega.tech-translate",
  name: "Tech Translate",
  version: "0.1.0",
  description: "Transforms natural language requests into detailed, actionable technical specifications",
  category: "ai-ops",
  inputSchema: { /* JSON Schema 2020-12 */ },
  outputSchema: { /* JSON Schema 2020-12 */ },
  modes: ["markdown", "json"]
}
```

## Architecture

The package is structured as follows:

```
packages/tech-translate/
├── src/
│   ├── index.ts              # Main library entry
│   ├── cli.ts                # Commander-based CLI
│   ├── schema.ts             # Tool manifest + JSON Schemas
│   └── renderers/
│       ├── markdown.ts       # Markdown renderer
│       └── json.ts           # JSON renderer
├── test/
│   ├── fixtures/             # Golden test fixtures
│   ├── lib.spec.ts           # Library tests
│   ├── cli.spec.ts           # CLI tests
│   └── golden.spec.ts        # Golden fixture tests
├── tsconfig.json             # TypeScript config
├── tsup.config.ts            # Build config (ESM + CJS)
├── vitest.config.ts          # Test config
└── package.json
```

## License

MIT

## Contributing

Issues and PRs welcome! See the main [omega repository](https://github.com/thomasdavis/omega) for contribution guidelines.
