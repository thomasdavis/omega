# @repo/tech-translate

Tech translation tool - convert user requests into detailed technical specifications.

## Features

- 📝 **Library API**: Programmatic access via `translateTech()` function
- 🖥️ **CLI**: Command-line interface for quick translations
- 🎯 **Flexible Output**: Markdown or JSON format
- 🔧 **Configurable**: MVP vs Production level, selective sections
- 📦 **TypeScript**: Fully typed with Zod schema validation
- 🔌 **Pluggable**: LLM provider interface (stub provider included)

## Installation

```bash
# Install in your project
pnpm add @repo/tech-translate

# Or use globally
pnpm add -g @repo/tech-translate
```

## Quick Start

### Library Usage

```typescript
import { translateTech } from '@repo/tech-translate';

// Get markdown output (default)
const markdown = await translateTech('add live status page');
console.log(markdown);

// Get JSON output
const spec = await translateTech('add user authentication', {
  format: 'json'
});
console.log(spec);

// MVP level with specific sections
const mvp = await translateTech('add payment processing', {
  level: 'mvp',
  include: { db: true, security: true, devops: false, testing: false }
});
```

### CLI Usage

```bash
# Basic usage (markdown output)
tech-translate "add live status page"

# JSON output
tech-translate "add user auth" --format json

# MVP level
tech-translate "add dashboard" --level mvp

# Selective sections
tech-translate "add API" --include db,security

# Read from stdin
echo "add monitoring" | tech-translate --format md

# Save to file
tech-translate "add caching" > spec.md
```

### CLI Options

- `-f, --format <type>`: Output format - `md` (markdown) or `json` (default: `md`)
- `-l, --level <type>`: Specification level - `mvp` or `prod` (default: `prod`)
- `-i, --include <sections>`: Comma-separated sections - `db,devops,security,testing` (default: all)

## API Reference

### `translateTech(request, options?, provider?)`

Translate a user request into a technical specification.

**Parameters:**

- `request` (string): The user's freeform request
- `options` (TranslationOptions): Optional configuration
  - `format`: `'markdown'` | `'json'` (default: `'markdown'`)
  - `level`: `'mvp'` | `'prod'` (default: `'prod'`)
  - `include`: Object with optional sections
    - `db`: boolean (default: true)
    - `devops`: boolean (default: true)
    - `security`: boolean (default: true)
    - `testing`: boolean (default: true)
- `provider` (LLMProvider): Optional custom LLM provider

**Returns:** `Promise<string | TechTranslationSpec>`

- Returns string for markdown format
- Returns TechTranslationSpec object for json format

### Types

```typescript
import type {
  TechTranslationSpec,
  TranslationOptions,
  LLMProvider
} from '@repo/tech-translate';
```

## Schema Documentation

The `TechTranslationSpec` schema includes:

- **summary**: High-level summary of the request
- **assumptions**: Key assumptions made
- **risks**: Technical and product risks
- **non_goals**: What is explicitly out of scope
- **api_design**: API endpoints and data models
- **data_model**: Database schema design
- **infra**: Infrastructure and deployment requirements
- **security**: Security considerations
- **testing**: Testing strategy and test cases
- **acceptance_criteria**: Acceptance criteria for completion
- **tasks**: Breakdown of implementation tasks

### Example Output (Markdown)

```markdown
# Technical Specification

## Summary

Technical specification for: add live status page

## Assumptions

- User has access to required development environment
- Existing authentication system is in place
- Production-ready implementation required

## API Design

### Endpoints

- **GET** `/api/resource`: Retrieve resource data
- **POST** `/api/resource`: Create new resource

...
```

### Example Output (JSON)

```json
{
  "summary": "Technical specification for: add live status page",
  "assumptions": ["..."],
  "risks": ["..."],
  "api_design": {
    "endpoints": [...],
    "models": [...]
  },
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

# Watch tests
pnpm test:watch

# Type check
pnpm type-check

# Lint
pnpm lint

# Fix linting issues
pnpm lint:fix
```

## Custom LLM Provider

You can implement a custom LLM provider by implementing the `LLMProvider` interface:

```typescript
import { LLMProvider, TranslationOptions, TechTranslationSpec } from '@repo/tech-translate';

class MyCustomProvider implements LLMProvider {
  async translate(request: string, options: TranslationOptions): Promise<TechTranslationSpec> {
    // Your custom LLM integration here
    // Call OpenAI, Anthropic, etc.
    return spec;
  }
}

// Use it
const result = await translateTech('add feature', {}, new MyCustomProvider());
```

## Environment Variables

In future versions, environment variables will be used to configure LLM providers:

- `OPENAI_API_KEY`: OpenAI API key
- `ANTHROPIC_API_KEY`: Anthropic API key
- `TECH_TRANSLATE_PROVIDER`: Provider to use (openai, anthropic, etc.)

Currently, the stub provider is used by default.

## Publishing

This package uses [Changesets](https://github.com/changesets/changesets) for version management.

```bash
# Create a changeset
pnpm changeset

# Version packages
pnpm changeset version

# Publish (when ready)
pnpm changeset publish
```

## Contributing

1. Make your changes
2. Add tests
3. Run `pnpm build` and `pnpm test`
4. Create a changeset: `pnpm changeset`
5. Submit a PR

## License

MIT

## Roadmap

- [ ] Implement real LLM provider integrations (OpenAI, Anthropic)
- [ ] Add more output formats (HTML, PDF)
- [ ] Interactive mode for CLI
- [ ] Schema refinements based on user feedback
- [ ] Template customization
- [ ] Multi-language support
