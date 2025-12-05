# @omega/tech-translate

> Convert informal user requests into detailed, actionable technical specifications using AI

[![npm version](https://img.shields.io/npm/v/@omega/tech-translate.svg)](https://www.npmjs.com/package/@omega/tech-translate)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Transform vague ideas into comprehensive technical specifications with LLM-powered translation. Get structured specs with requirements, architecture, security, testing, and implementation plans—ready for engineering teams.

## Features

- 🤖 **AI-Powered**: Uses OpenAI, Anthropic, or custom LLM providers
- 📋 **Structured Output**: Generates both Markdown and JSON formats
- 🎯 **Domain-Aware**: Specialized templates for web, mobile, data, ML, infrastructure
- 📊 **Configurable Depth**: From brief overviews to exhaustive enterprise specs
- 🎨 **Style Presets**: Startup, enterprise, research, or academic styles
- 🔧 **TypeScript-First**: Full type safety with runtime validation
- 🚀 **Portable**: Use as library, CLI, or GitHub Action
- ⚡ **Zero Config**: Works out-of-the-box with env vars

## Installation

```bash
# npm
npm install @omega/tech-translate

# pnpm
pnpm add @omega/tech-translate

# yarn
yarn add @omega/tech-translate
```

### Peer Dependencies

Install your preferred LLM provider SDK:

```bash
# For OpenAI
npm install openai

# For Anthropic
npm install @anthropic-ai/sdk
```

## Quick Start

### CLI Usage

```bash
# From a simple request
npx tech-translate "Build a todo list app with user auth"

# With options
echo "Create a real-time analytics dashboard" | npx tech-translate \
  --format md \
  --depth high \
  --style enterprise \
  --domain web \
  --out ./specs

# With context
npx tech-translate "Add payment processing" \
  --context "Existing e-commerce site built with Next.js" \
  --constraints "PCI compliance required,Budget: $20k"
```

### API Usage

```typescript
import { translateTech } from '@omega/tech-translate';

const result = await translateTech(
  {
    input: 'Build a chat app with real-time messaging',
    domain: 'web',
    projectContext: 'React + TypeScript, deploying to Railway',
    constraints: ['Timeline: 4 weeks', 'Team: 2 developers'],
  },
  {
    depth: 'standard',
    style: 'startup',
    format: 'both',
  }
);

console.log(result.markdown); // Formatted spec
console.log(result.spec);     // Structured JSON
```

## Configuration

### Environment Variables

```bash
# Required: Set one of these based on your provider
export OPENAI_API_KEY="your-openai-key"
export ANTHROPIC_API_KEY="your-anthropic-key"
```

### Provider Configuration

```typescript
import { translateTech } from '@omega/tech-translate';

// Using OpenAI
const result = await translateTech(input, options, {
  type: 'openai',
  model: 'gpt-4o',
});

// Using Anthropic
const result = await translateTech(input, options, {
  type: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
});
```

## Options

### Depth Levels

- `brief`: High-level overview, 3-5 requirements, minimal details
- `standard`: Comprehensive coverage, 5-10 requirements *(default)*
- `high`: Exhaustive analysis, 10-15+ requirements
- `exhaustive`: Enterprise-grade, audit-ready specification

### Style Presets

- `startup`: Fast MVP-focused, pragmatic tech choices
- `enterprise`: Thorough, compliance-focused, formal processes *(default)*
- `research`: Exploratory, hypothesis-driven, experimental
- `academic`: Formal, citation-heavy, reproducible

### Domains

- `web`: Web applications (SEO, accessibility, performance)
- `mobile`: iOS/Android apps (native vs. hybrid, app stores)
- `data`: Data pipelines (ETL, orchestration, governance)
- `ml`: Machine learning (training, inference, MLOps)
- `infrastructure`: DevOps/IaC (Kubernetes, monitoring, DR)
- `embedded`: Embedded systems (RTOS, power, protocols)
- `general`: General-purpose software *(default)*

### Output Formats

- `markdown`: Formatted markdown document
- `json`: Structured JSON specification
- `both`: Both formats *(default)*

## Output Schema

The generated specification includes:

### Summary
- Title and overview
- Objectives (3-5 measurable goals)
- Scope (inclusions and exclusions)

### Assumptions & Constraints
- Technical and business assumptions
- Known limitations
- External dependencies

### Requirements
- **Functional**: Numbered requirements with priorities (must/should/could/won't)
- **Non-Functional**: Performance, scalability, security with metrics

### API & Interfaces *(optional)*
- Endpoint definitions (method, path, parameters, responses)
- Type interfaces and schemas
- Integration points

### Data Model *(optional)*
- Entity definitions with fields and relationships
- Storage strategy and rationale
- Indexing and migration approach

### DevOps & Infrastructure *(optional)*
- Deployment strategy and platform
- CI/CD pipeline stages
- Monitoring metrics and alerts
- Infrastructure components

### Security & Privacy *(optional)*
- Authentication and authorization
- Data protection (encryption, PII handling)
- Compliance requirements (GDPR, SOC2, HIPAA)
- Threat model with mitigations

### Testing & QA
- Testing strategy
- Test types with coverage targets
- Acceptance criteria

### Risks & Mitigation
- Risk assessment (impact, probability)
- Mitigation strategies

### Milestones
- Project phases
- Deliverables per phase
- Dependencies

## Examples

### Generate Enterprise Spec

```typescript
import { translateTech } from '@omega/tech-translate';

const result = await translateTech(
  {
    input: 'Build a HIPAA-compliant patient portal',
    domain: 'web',
    constraints: ['HIPAA compliance required', 'Multi-tenant architecture'],
  },
  {
    depth: 'exhaustive',
    style: 'enterprise',
  }
);

// Access structured data
console.log('Security requirements:', result.spec.security);
console.log('Compliance:', result.spec.security?.compliance);
```

### Quick MVP Spec

```typescript
const result = await translateTech(
  { input: 'Social media dashboard for Instagram analytics' },
  { depth: 'brief', style: 'startup' }
);

// Get just the requirements
result.spec.requirements.functional.forEach(req => {
  console.log(`${req.id}: ${req.description} [${req.priority}]`);
});
```

### Export to Files

```bash
# CLI: Export both formats
tech-translate "Build a recommendation engine" \
  --domain ml \
  --depth high \
  --out ./project-spec

# Creates:
# - ./project-spec/spec.md
# - ./project-spec/spec.json
```

### GitHub Action Integration

See [examples/github-action.yml](./examples/github-action.yml) for a complete workflow that:
- Triggers on issue labels
- Generates specs from issue descriptions
- Creates PRs with the generated specifications

## API Reference

### `translateTech(input, options?, providerConfig?)`

Main translation function.

**Parameters:**

- `input: TranslateInput` - User request and context
  - `input: string` - The informal request *(required)*
  - `domain?: Domain` - Domain context
  - `projectContext?: string` - Additional project info
  - `constraints?: string[]` - Known constraints

- `options?: TranslateOptions` - Translation options
  - `depth?: DepthLevel` - Detail level (default: `'standard'`)
  - `style?: StylePreset` - Style preset (default: `'enterprise'`)
  - `format?: OutputFormat` - Output format (default: `'both'`)
  - `customPrompt?: string` - Custom prompt additions

- `providerConfig?: ProviderConfig` - LLM provider settings
  - `type?: 'openai' | 'anthropic'` - Provider type
  - `model?: string` - Model name
  - `apiKey?: string` - API key (or use env vars)

**Returns:** `Promise<TranslateResult>`

- `spec: TechnicalSpec` - Structured specification
- `markdown: string` - Formatted markdown
- `metadata` - Generation metadata (tokens, duration, etc.)

### `specToMarkdown(spec)`

Convert a `TechnicalSpec` object to formatted markdown.

### `createProvider(config?)`

Create an LLM provider instance.

## Type Exports

All TypeScript types are exported for full type safety:

```typescript
import type {
  TranslateInput,
  TranslateOptions,
  TranslateResult,
  TechnicalSpec,
  DepthLevel,
  StylePreset,
  Domain,
  Provider,
  ProviderConfig,
} from '@omega/tech-translate';
```

## Security & Privacy

- **No PII Logging**: User data is not logged or persisted
- **Environment-Driven Secrets**: API keys via environment variables
- **Deterministic Prompts**: Minimize data leakage with structured templates
- **Provider Abstraction**: Swap providers without code changes

## Development

```bash
# Install dependencies
pnpm install

# Run type check
pnpm type-check

# Build
pnpm build

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

## Contributing

Contributions welcome! Please read our contributing guidelines and submit PRs.

## License

MIT © Thomas Davis

## Links

- [GitHub Repository](https://github.com/thomasdavis/omega)
- [Issue Tracker](https://github.com/thomasdavis/omega/issues)
- [npm Package](https://www.npmjs.com/package/@omega/tech-translate)

## Related

- Issue [#708](https://github.com/thomasdavis/omega/issues/708): Tech Translation schema and templates
- Issue [#710](https://github.com/thomasdavis/omega/issues/710): npm package publication

---

**Generated with [Claude Code](https://claude.com/claude-code)**
