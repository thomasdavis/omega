# @omega/tech-translate

> AI-powered tech translation tool that converts informal user requests into detailed, actionable technical specifications.

[![npm version](https://img.shields.io/npm/v/@omega/tech-translate.svg)](https://www.npmjs.com/package/@omega/tech-translate)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🤖 **AI-Powered Translation**: Convert natural language requests into comprehensive technical specs
- 📋 **PAM-Compliant**: Outputs follow Portable Agent Manifest standards
- 🎨 **Multiple Styles**: Enterprise, startup, technical, concise, or detailed formats
- 🔌 **Provider-Agnostic**: Supports OpenAI, Anthropic, and custom LLM backends
- 📦 **Dual Formats**: Generate Markdown and/or JSON outputs
- 🛠️ **CLI & API**: Use as a library or command-line tool
- 🔒 **Type-Safe**: First-class TypeScript support with strict types
- ⚡ **Modern**: ESM + CJS builds for maximum compatibility

## Installation

```bash
npm install @omega/tech-translate
```

For CLI usage via npx:

```bash
npx @omega/tech-translate "your request here"
```

## Quick Start

### CLI Usage

```bash
# Basic usage (reads from stdin or argument)
echo "Build a user authentication system" | npx tech-translate

# With options
npx tech-translate "Create a REST API for blog posts" \
  --format both \
  --style enterprise \
  --depth high \
  --domain api \
  --out ./spec

# Save to files
npx tech-translate "Analytics dashboard" --out ./dashboard-spec.md
```

### API Usage

```typescript
import { translateTech } from '@omega/tech-translate';

const result = await translateTech(
  {
    userRequest: 'Build a real-time chat application with message persistence',
    context: 'For a mobile app with 10k daily active users',
  },
  {
    format: 'both',
    style: 'enterprise',
    depth: 'high',
    domain: 'web',
  }
);

console.log(result.title);
console.log(result.markdown);  // Full markdown spec
console.log(result.json);       // Structured JSON spec
```

## Configuration

### Environment Variables

Set your LLM provider API key:

```bash
export OPENAI_API_KEY="sk-..."
# OR
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Provider Configuration

```typescript
import { translateTech, createProvider } from '@omega/tech-translate';

// Use specific provider
const result = await translateTech(
  { userRequest: 'Build a recommendation engine' },
  {
    provider: {
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 4000,
      temperature: 0.7,
    },
  }
);

// Or create provider separately
import { OpenAIProvider } from '@omega/tech-translate';

const provider = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});
```

## CLI Options

```
Usage: tech-translate [options] [request]

Options:
  -V, --version          Output version number
  -h, --help             Display help
  -f, --format <format>  Output format: md, json, both (default: "both")
  -s, --style <style>    Style preset: enterprise, startup, technical, concise, detailed (default: "enterprise")
  -d, --depth <depth>    Detail depth: low, medium, high (default: "medium")
  -D, --domain <domain>  Domain: web, data, ml, mobile, devops, api, database
  -o, --out <file>       Output file (default: stdout)
  --no-color             Disable colored output
  --no-assumptions       Skip assumptions section
  --no-risks             Skip risks section
  --no-milestones        Skip milestones section
  --provider <provider>  LLM provider: openai, anthropic (default: "openai")
  --model <model>        Model name override
  --api-key <key>        API key override (or use env var)
```

## Output Specification

### Markdown Sections

Generated specifications include these sections:

1. **Summary** - Executive overview, problem statement, solution approach
2. **Assumptions** - Technical and business assumptions
3. **Requirements** - Functional, non-functional, and constraints
4. **API / Interfaces** - Endpoints, schemas, integrations
5. **Data Model** - Entities, relationships, schemas
6. **DevOps / Infrastructure** - Deployment, CI/CD, monitoring
7. **Security & Privacy** - Authentication, encryption, compliance
8. **Testing & QA** - Strategy, coverage, test types
9. **Risks & Mitigation** - Risks with severity and mitigation plans
10. **Milestones** - Implementation phases and deliverables

### JSON Schema

The JSON output follows this structure:

```typescript
interface TechSpec {
  summary: string;
  assumptions?: string[];
  requirements: {
    functional: string[];
    nonFunctional?: string[];
    constraints?: string[];
  };
  apiInterfaces?: {
    endpoints?: Array<{
      method: string;
      path: string;
      description: string;
      requestSchema?: Record<string, any>;
      responseSchema?: Record<string, any>;
    }>;
    events?: Array<{
      name: string;
      description: string;
      payload?: Record<string, any>;
    }>;
    integrations?: string[];
  };
  dataModel?: {
    entities?: Array<{
      name: string;
      description: string;
      fields: Array<{
        name: string;
        type: string;
        required?: boolean;
        description?: string;
      }>;
      relationships?: string[];
    }>;
    schemas?: Array<{
      name: string;
      description: string;
      schema: Record<string, any>;
    }>;
  };
  devOpsInfra?: {
    deployment?: string;
    infrastructure?: string[];
    cicd?: string;
    monitoring?: string[];
    scaling?: string;
  };
  securityPrivacy?: {
    authentication?: string;
    authorization?: string;
    dataProtection?: string[];
    compliance?: string[];
    threats?: string[];
  };
  testingQA?: {
    strategy?: string;
    unitTests?: string[];
    integrationTests?: string[];
    e2eTests?: string[];
    coverage?: string;
  };
  risks?: Array<{
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    mitigation: string;
  }>;
  milestones?: Array<{
    name: string;
    description: string;
    deliverables: string[];
    estimatedDuration?: string;
  }>;
  metadata: {
    domain?: string;
    style?: string;
    depth?: string;
    generatedAt: string;
    version: string;
  };
}
```

## Examples

### Example 1: Node.js Script

```typescript
import { translateTech } from '@omega/tech-translate';

async function main() {
  const result = await translateTech(
    {
      userRequest: 'Create a file upload service with virus scanning',
      context: 'Cloud-native, must handle 1000 uploads/day',
    },
    {
      format: 'both',
      style: 'enterprise',
      depth: 'high',
      domain: 'api',
    }
  );

  if (result.success) {
    console.log('# Technical Specification\n');
    console.log(result.markdown);
  } else {
    console.error('Error:', result.error);
  }
}

main();
```

### Example 2: GitHub Action

```yaml
name: Generate Spec

on:
  issues:
    types: [labeled]

jobs:
  generate:
    if: github.event.label.name == 'needs-spec'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npx @omega/tech-translate "${{ github.event.issue.body }}" --out spec.md
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      - uses: actions/upload-artifact@v4
        with:
          name: specification
          path: spec.md
```

### Example 3: Express.js Microservice

```typescript
import express from 'express';
import { translateTech } from '@omega/tech-translate';

const app = express();
app.use(express.json());

app.post('/api/translate', async (req, res) => {
  const { userRequest, context, options } = req.body;

  const result = await translateTech(
    { userRequest, context },
    options
  );

  res.json(result);
});

app.listen(3000, () => {
  console.log('Tech translate API running on port 3000');
});
```

## Domains

- **web**: Web applications (SPA, SSR, frontend)
- **data**: Data engineering (pipelines, ETL, warehouses)
- **ml**: Machine learning (models, training, inference)
- **mobile**: Mobile apps (iOS, Android, cross-platform)
- **devops**: Infrastructure and operations (IaC, CI/CD, monitoring)
- **api**: API development (REST, GraphQL, gRPC)
- **database**: Database design (SQL, NoSQL, optimization)

## Style Presets

- **enterprise**: Formal, comprehensive, governance-focused
- **startup**: Pragmatic, MVP-oriented, lean
- **technical**: Deep technical detail, engineering-focused
- **concise**: Brief, essential information only
- **detailed**: Comprehensive coverage with examples

## Depth Levels

- **low**: High-level overview
- **medium**: Standard detail (recommended)
- **high**: Implementation-ready detail

## Security

- ✅ No PII logged
- ✅ Environment-driven secrets (no hard-coding)
- ✅ Rate limiting and backoff built-in
- ✅ Deterministic prompts to reduce leakage
- ✅ Safe defaults

⚠️ **Important**: Never commit API keys. Use environment variables or secret management.

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm type-check

# Run tests
pnpm test

# Lint
pnpm lint
```

## Publishing

This package uses [Changesets](https://github.com/changesets/changesets) for version management:

```bash
# Create a changeset
pnpm changeset

# Version packages
pnpm changeset version

# Publish to npm
pnpm changeset publish
```

## Contributing

Contributions welcome! Please follow the existing code style and add tests for new features.

## License

MIT © [Thomas Davis](https://github.com/thomasdavis)

## Keywords

ai, llm, spec, architecture, devops, database, nlp, pam, technical-specification, requirements

## Related

- [Omega AI](https://github.com/thomasdavis/omega) - The parent monorepo
- Issue [#708](https://github.com/thomasdavis/omega/issues/708) - Tech Translation tool spec
- Issue [#710](https://github.com/thomasdavis/omega/issues/710) - npm package publication

---

**Generated with [Claude Code](https://claude.ai/code)**
