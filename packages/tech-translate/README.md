# @repo/tech-translate

CLI tool and library for translating technical documentation with LLM providers.

## Features

- 📝 Translate technical content while preserving formatting
- 🔧 Preserve code blocks, links, and technical terminology
- 🎯 Specify technical level and target audience
- 📦 Multiple output formats (Markdown, JSON)
- ✨ Type-safe with TypeScript and Zod schemas
- 🧪 Fully tested with Vitest

## Installation

```bash
pnpm add @repo/tech-translate
```

## CLI Usage

### Basic Translation

```bash
tech-translate translate "Your technical content here" --language es
```

### Translate from File

```bash
tech-translate translate @input.md --language fr --format markdown
```

### Advanced Options

```bash
tech-translate translate @docs.md \
  --language es \
  --technical-level advanced \
  --audience "DevOps engineers" \
  --format json
```

### Validate Specification

```bash
tech-translate validate spec.json
```

## CLI Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--language` | `-l` | Target language code | `en` |
| `--technical-level` | `-t` | Technical level (beginner\|intermediate\|advanced\|expert) | - |
| `--audience` | `-a` | Target audience description | - |
| `--format` | `-f` | Output format (markdown\|json) | `markdown` |
| `--source-language` | `-s` | Source language (auto-detect if omitted) | - |

## Programmatic Usage

```typescript
import { TechTranslator, TechTranslationSpec } from '@repo/tech-translate';

const translator = new TechTranslator();

const spec: TechTranslationSpec = {
  input: '# Hello World\nThis is technical documentation.',
  target: {
    language: 'es',
    technicalLevel: 'intermediate',
    audience: 'software developers',
  },
  outputFormat: 'markdown',
  preserveCodeBlocks: true,
  preserveLinks: true,
  preserveFormatting: true,
};

const result = await translator.translate(spec);
console.log(result.translatedContent);
console.log(result.metadata);
```

## Specification Schema

```typescript
import { TechTranslationSpecSchema } from '@repo/tech-translate';

// Validate a specification object
const spec = {
  input: 'Content to translate',
  target: { language: 'fr' },
};

const validated = TechTranslationSpecSchema.parse(spec);
```

## Example Specification (JSON)

```json
{
  "input": "# Getting Started\n\nInstall the package...",
  "sourceLanguage": "en",
  "target": {
    "language": "es",
    "technicalLevel": "beginner",
    "audience": "web developers"
  },
  "outputFormat": "markdown",
  "preserveCodeBlocks": true,
  "preserveLinks": true,
  "preserveFormatting": true
}
```

## Translation Result

```typescript
interface TranslationResult {
  translatedContent: string;
  metadata: {
    sourceLanguage?: string;
    targetLanguage: string;
    provider: string;
    model?: string;
    timestamp: string;
  };
}
```

## Current Status (v0)

This is version 0 of tech-translate. The current implementation:

- ✅ Uses a stub provider for development and testing
- ✅ Supports Markdown output format
- ✅ Validates input specifications with Zod
- ✅ Provides full TypeScript types
- ⏳ JSON output mode (basic implementation)
- ⏳ Real LLM provider integration (coming in future release)

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Development mode (watch)
pnpm dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm type-check

# Lint
pnpm lint

# Fix lint issues
pnpm lint:fix
```

## Testing

The package includes comprehensive tests:

- Unit tests for translator and validation
- Schema validation tests with Zod
- Snapshot tests for markdown output
- JSON schema validation tests

```bash
pnpm test
```

## Architecture

```
packages/tech-translate/
├── src/
│   ├── types.ts          # Zod schemas and TypeScript types
│   ├── translator.ts     # Main translator class
│   ├── cli.ts           # Commander CLI implementation
│   ├── index.ts         # Public exports
│   └── providers/
│       └── stub.ts      # Stub provider (v0)
├── bin/
│   └── tech-translate.js # Executable entry point
├── tests/
│   ├── translator.test.ts
│   ├── schema.test.ts
│   └── markdown-output.test.ts
└── dist/                # Build output (ESM + CJS + .d.ts)
```

## License

MIT
