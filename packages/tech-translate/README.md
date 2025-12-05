# @repo/tech-translate

AI-powered technical content translator with tone preservation.

## Features

- 🌍 Multi-language technical content translation
- 🎯 Tone preservation (formal, casual, technical, friendly, professional)
- 💻 Code block preservation
- 🔗 URL preservation
- 📦 Multiple output formats (Markdown, JSON)
- 🚀 ESM + CJS builds with TypeScript definitions
- ⚡ CLI tool for easy usage

## Installation

```bash
pnpm add @repo/tech-translate
```

## Usage

### CLI

Basic translation:

```bash
tech-translate translate --text "Hello world" --target es
```

Translate from file:

```bash
tech-translate translate --input README.md --target fr --tone technical
```

With custom options:

```bash
tech-translate translate \
  --input docs/guide.md \
  --source en \
  --target ja \
  --tone formal \
  --format json
```

### Programmatic API

```typescript
import { TechTranslator, TechTranslationSpecSchema } from '@repo/tech-translate';

const translator = new TechTranslator();

const spec = TechTranslationSpecSchema.parse({
  sourceText: '# Hello World\n\nThis is technical documentation.',
  sourceLanguage: 'en',
  targetLanguage: 'es',
  tone: 'technical',
  preserveCodeBlocks: true,
  preserveUrls: true,
  outputFormat: 'markdown',
});

const result = await translator.translate(spec);
console.log(result.translatedText);
```

### Type Definitions

```typescript
import type {
  TechTranslationSpec,
  TranslationResult,
  Tone,
  OutputFormat,
} from '@repo/tech-translate';

const tone: Tone = 'professional'; // 'formal' | 'casual' | 'technical' | 'friendly' | 'professional'
const format: OutputFormat = 'markdown'; // 'markdown' | 'json'
```

### Zod Schemas

```typescript
import {
  TechTranslationSpecSchema,
  TranslationResultSchema,
  ToneSchema,
  OutputFormatSchema,
} from '@repo/tech-translate';

// Validate input
const spec = TechTranslationSpecSchema.parse({
  sourceText: 'Hello',
  targetLanguage: 'es',
});

// Validate output
const result = TranslationResultSchema.parse(translatorOutput);
```

## CLI Options

```
tech-translate translate [options]

Options:
  -i, --input <file>     Input file path
  -t, --text <text>      Text to translate (alternative to --input)
  -s, --source <lang>    Source language (default: "en")
  -l, --target <lang>    Target language (required)
  --tone <tone>          Translation tone (formal|casual|technical|friendly|professional) (default: "professional")
  --format <format>      Output format (markdown|json) (default: "markdown")
  --no-preserve-code     Do not preserve code blocks
  --no-preserve-urls     Do not preserve URLs
  -h, --help             Display help for command
```

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

# Lint
pnpm lint

# Run tests
pnpm test

# Test watch mode
pnpm test:watch
```

## Package Structure

```
packages/tech-translate/
├── src/
│   ├── types.ts           # Type definitions and Zod schemas
│   ├── translator.ts      # Core translation logic
│   ├── cli.ts            # CLI implementation
│   ├── index.ts          # Package exports
│   └── __tests__/        # Test files
├── dist/                 # Build output (ESM + CJS + d.ts)
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

## Build Outputs

The package is built with [tsup](https://tsup.egoist.dev/) and provides:

- **ESM**: `dist/index.mjs` - Modern ES modules
- **CJS**: `dist/index.js` - CommonJS for legacy support
- **Types**: `dist/index.d.ts` - TypeScript definitions
- **CLI**: `dist/cli.js` - Executable command-line tool

## Current Implementation

**Note**: v0 focuses on Markdown output with a stub provider. The current implementation returns a placeholder translation. Actual AI-powered translation will be implemented in a future version.

## Related Issues

- Spec: #708
- Packaging/Publish: #710
- Scaffold parent: #711

## License

MIT
