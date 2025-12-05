# @repo/tech-translate

Tech Translation tool - converts user requests into structured technical specifications.

## Features

- 📝 **Dual Output**: Generate specifications in Markdown or JSON format
- 🎯 **Configurable Levels**: MVP or Production-ready specs
- 🔧 **Flexible Sections**: Include/exclude database, DevOps, security, and testing sections
- 🔌 **Pluggable Providers**: Bring your own LLM provider
- ✅ **Type-Safe**: Full TypeScript support with Zod schema validation
- 🚀 **CLI & Library**: Use as a command-line tool or import as a library

## Installation

```bash
pnpm add @repo/tech-translate
```

## Quick Start

### CLI Usage

```bash
# Basic usage (markdown output)
tech-translate "add live status page"

# JSON output
tech-translate "add user authentication" --format json

# MVP-level spec
tech-translate "add search feature" --level mvp

# Include specific sections
tech-translate "add API endpoint" --include db,security

# Read from stdin
echo "add analytics dashboard" | tech-translate
```

### Library Usage

```typescript
import { translateTech } from '@repo/tech-translate';

// Get markdown specification
const markdown = await translateTech('add live status page');
console.log(markdown);

// Get JSON specification
const spec = await translateTech('add user authentication', {
  format: 'json',
  level: 'prod',
  include: {
    db: true,
    devops: true,
    security: true,
    testing: true,
  },
});
console.log(spec);
```

### Custom LLM Provider

```typescript
import { setProvider, type LLMProvider, type TechTranslationSpec } from '@repo/tech-translate';

class MyCustomProvider implements LLMProvider {
  async translate(request: string, options?: TranslateOptions): Promise<TechTranslationSpec> {
    // Your LLM integration here
    // Call OpenAI, Anthropic, etc.
    return {
      summary: '...',
      assumptions: ['...'],
      // ... other fields
    };
  }
}

setProvider(new MyCustomProvider());
```

## API Reference

### `translateTech(request, options?)`

Main translation function.

**Parameters:**
- `request` (string): User request to translate
- `options` (TranslateOptions, optional):
  - `format`: `'markdown'` | `'json'` (default: `'markdown'`)
  - `level`: `'mvp'` | `'prod'` (default: `'prod'`)
  - `include`: Object with optional boolean flags:
    - `db`: Include database/data model section
    - `devops`: Include infrastructure section
    - `security`: Include security section
    - `testing`: Include testing section

**Returns:** `Promise<string | TechTranslationSpec>`

### `TechTranslationSpec` Schema

```typescript
{
  summary: string;
  assumptions: string[];
  risks: string[];
  non_goals: string[];
  api_design?: {
    endpoints?: Array<{ method: string; path: string; description: string }>;
    interfaces?: Array<{ name: string; description: string }>;
  };
  data_model?: {
    entities?: Array<{
      name: string;
      fields: Array<{ name: string; type: string; required?: boolean }>;
    }>;
  };
  infra?: {
    services?: string[];
    dependencies?: string[];
  };
  security?: {
    authentication?: string;
    authorization?: string;
    considerations?: string[];
  };
  testing?: {
    unit_tests?: string[];
    integration_tests?: string[];
    e2e_tests?: string[];
  };
  acceptance_criteria: string[];
  tasks: Array<{
    title: string;
    description: string;
    estimate?: string;
  }>;
}
```

### `setProvider(provider)`

Set a custom LLM provider.

**Parameters:**
- `provider` (LLMProvider): Custom provider implementing the LLMProvider interface

### `TechTranslationSpecSchema`

Exported Zod schema for validation.

```typescript
import { TechTranslationSpecSchema } from '@repo/tech-translate';

const validated = TechTranslationSpecSchema.parse(spec);
```

## CLI Options

```
Usage: tech-translate [options] [request...]

Arguments:
  request                  User request to translate

Options:
  -V, --version           output the version number
  -f, --format <format>   Output format: md (markdown) or json (default: "md")
  -l, --level <level>     Specification level: mvp or prod (default: "prod")
  --include <sections>    Comma-separated list of sections to include:
                          db,devops,security,testing (default: all)
  -h, --help              display help for command
```

## Examples

### Example 1: Live Status Page (Markdown)

```bash
tech-translate "add live status page"
```

Output:
```markdown
# Tech Translation Specification

## Summary
Tech translation for: "add live status page"

## Assumptions
- This is a stub implementation
- Specification level: prod

## Data Model
### Example
- `id`: string (required)
- `createdAt`: timestamp (required)

...
```

### Example 2: User Authentication (JSON)

```bash
tech-translate "add user authentication" --format json
```

Output:
```json
{
  "summary": "Tech translation for: \"add user authentication\"",
  "assumptions": ["This is a stub implementation", "Specification level: prod"],
  "risks": ["Stub provider does not generate real specifications"],
  ...
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Watch mode
pnpm dev

# Run tests
pnpm test

# Lint
pnpm lint

# Type check
pnpm type-check
```

## Roadmap

- [ ] Integrate real LLM provider (OpenAI, Anthropic, etc.)
- [ ] Add support for custom templates
- [ ] Add interactive mode for CLI
- [ ] Add caching layer for repeated requests
- [ ] Add support for streaming output

## License

MIT
