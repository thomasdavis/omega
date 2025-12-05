# @tpmjs/tech-translate

> Translate technical requirements into actionable implementation specs

[![CI](https://github.com/thomasdavis/omega/workflows/CI%20-%20tech-translate/badge.svg)](https://github.com/thomasdavis/omega/actions)
[![npm version](https://badge.fury.io/js/@tpmjs%2Ftech-translate.svg)](https://www.npmjs.com/package/@tpmjs/tech-translate)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

`@tpmjs/tech-translate` converts high-level technical requirements into structured, actionable implementation specifications. It supports both Markdown and JSON output formats, with configurable detail levels (MVP vs Production) and optional concern-specific sections (database, DevOps, security, testing).

This package implements the **tpmjs Tool Schema** specification for technical translation.

## Installation

```bash
npm install @tpmjs/tech-translate
```

Or with pnpm:

```bash
pnpm add @tpmjs/tech-translate
```

## Usage

### Library API

```typescript
import { translateTech } from '@tpmjs/tech-translate';

// Basic usage - Markdown output (default)
const spec = await translateTech('Add user authentication');
console.log(spec);

// Production-level spec with specific concerns
const prodSpec = await translateTech('Build REST API server', {
  level: 'prod',
  include: ['db', 'security', 'testing']
});
console.log(prodSpec);

// MVP-level spec in JSON format
const jsonSpec = await translateTech('Add user authentication', {
  format: 'json',
  level: 'mvp',
  include: ['db']
});
console.log(JSON.stringify(jsonSpec, null, 2));
```

### CLI

```bash
# From stdin
echo "Add user authentication" | tech-translate

# From file
tech-translate requirements.txt

# Specify format and level
tech-translate requirements.txt --format json --level mvp

# Include specific concerns
tech-translate requirements.txt --include db,security,testing

# Production-ready spec with all concerns
tech-translate requirements.txt --level prod --include db,devops,security,testing
```

### CLI Options

- `[file]` - Input file (reads from stdin if omitted)
- `-f, --format <type>` - Output format: `md` (default) or `json`
- `-l, --level <level>` - Detail level: `mvp` or `prod` (default)
- `-i, --include <concerns>` - Comma-separated concerns: `db`, `devops`, `security`, `testing`

## API Reference

### `translateTech(input, options?)`

Translates technical requirements into implementation specs.

**Parameters:**
- `input: string` - The technical requirement text to translate
- `options?: TranslationOptions` - Optional configuration
  - `format?: 'md' | 'json'` - Output format (default: `'md'`)
  - `level?: 'mvp' | 'prod'` - Detail level (default: `'prod'`)
  - `include?: ConcernArea[]` - Concern areas to include (default: none)

**Returns:** `Promise<string | TranslationResult>`
- Returns `string` for Markdown format
- Returns `TranslationResult` object for JSON format

### Types

```typescript
type ConcernArea = 'db' | 'devops' | 'security' | 'testing';
type Level = 'mvp' | 'prod';
type Format = 'md' | 'json';

interface TranslationOptions {
  format?: Format;
  level?: Level;
  include?: ConcernArea[];
}

interface TranslationResult {
  metadata: {
    timestamp: string;
    version: string;
    level: Level;
    format: Format;
    concerns?: ConcernArea[];
  };
  specification: {
    summary: string;
    requirements: string[];
    technicalDetails?: Record<string, unknown>;
    database?: {
      tables: string[];
      migrations: string[];
    };
    devops?: {
      deploymentSteps: string[];
      infrastructure: string[];
    };
    security?: {
      considerations: string[];
      authentication?: string;
    };
    testing?: {
      testCases: string[];
      coverage?: string;
    };
  };
}
```

## Examples

### Example 1: Basic Markdown Output

```typescript
const spec = await translateTech('Add user authentication');
```

**Output:**
```markdown
# Technical Specification

## Summary
Add user authentication

## Level
PROD (Production Ready)

## Requirements
- Requirement 1: Add user authentication...
- Requirement 2: Implementation details pending
- Requirement 3: Testing and validation

...
```

### Example 2: JSON with Database and Security

```typescript
const spec = await translateTech('Build user management system', {
  format: 'json',
  level: 'prod',
  include: ['db', 'security']
});
```

**Output:**
```json
{
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "version": "0.1.0",
    "level": "prod",
    "format": "json",
    "concerns": ["db", "security"]
  },
  "specification": {
    "summary": "Build user management system",
    "requirements": [...],
    "database": {
      "tables": ["users", "application_data"],
      "migrations": ["001_initial_schema.sql", "002_seed_data.sql"]
    },
    "security": {
      "considerations": [
        "Implement authentication",
        "Add authorization checks",
        ...
      ],
      "authentication": "JWT-based authentication"
    }
  }
}
```

### Example 3: MVP Level with All Concerns

```bash
echo "Build REST API" | tech-translate --level mvp --include db,devops,security,testing
```

Generates a comprehensive MVP-level specification covering all concern areas.

## Development

### Setup

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Run tests
pnpm run test

# Type check
pnpm run type-check

# Lint
pnpm run lint
```

### Testing

The package includes:
- **Unit tests**: Core functionality tests
- **Snapshot tests**: Markdown output regression tests
- **Schema validation tests**: Zod schema validation tests

Run tests with:
```bash
pnpm test
```

## Roadmap

- [ ] LLM provider integration (OpenAI, Anthropic, local models)
- [ ] Custom templates for Markdown output
- [ ] JSON schema export for validation
- [ ] Interactive CLI mode
- [ ] Configuration file support
- [ ] Additional output formats (HTML, PDF)

## Contributing

Contributions are welcome! Please see the [Contributing Guide](../../CONTRIBUTING.md) for details.

## License

MIT © [Thomas Davis](https://github.com/thomasdavis)

---

**Part of the tpmjs (Technical Product Manager JS) ecosystem**

*Generated with @tpmjs/tech-translate v0.1.0*
