# Omega - Self-Improving Discord AI Bot

A serverless Discord AI bot using OpenAI, Vercel AI SDK v6, and Discord Interactions API. Omega is designed to be self-improving - it can identify its own improvements and execute them through GitHub integration.

## Features

- AI-powered Discord bot with natural language understanding
- GitHub integration for creating issues and tracking improvements
- Automatic deployment pipeline with GitHub Actions
- Self-improving architecture

## Tech Stack

- **Discord**: Interactions API for bot commands
- **AI**: OpenAI with Vercel AI SDK v6
- **Database**: PostgreSQL on Railway
- **Deployment**: Railway
- **Build System**: Turborepo monorepo
- **Language**: TypeScript

## Getting Started

See [SETUP.md](./SETUP.md) for detailed setup instructions.

### Quick Start

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Type checking
pnpm type-check
```

## Architecture

The project is organized as a monorepo with separate packages for different concerns:
- Discord bot service
- Database layer
- Shared utilities

For more details, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Documentation

- [SETUP.md](./SETUP.md) - Setup and configuration instructions
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [CLAUDE.md](./CLAUDE.md) - Repository-specific instructions
- [DEPLOYMENT_STATUS.md](./DEPLOYMENT_STATUS.md) - Current deployment status

## Self-Improving Workflow

1. Bot identifies improvement opportunity
2. Bot creates GitHub issue
3. Claude Code implements the feature/fix
4. Changes are deployed automatically
5. Bot gains new capabilities

This creates a continuous improvement loop!

## Contributing

This is a self-evolving bot project. The bot can create issues for improvements it identifies during operation.

## License

Private project

blah
