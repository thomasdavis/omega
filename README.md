# Omega - Self-Coding AI Discord Bot

Omega is a self-improving, AI-powered Discord bot that can modify its own source code, execute code in 42+ programming languages, and autonomously develop new features through GitHub integration.

## What Makes Omega Special

- **Self-Coding**: Omega can create GitHub issues, implement features, and deploy changes autonomously
- **50+ Specialized Tools**: From code execution to image generation, web scraping to blog publishing
- **Multi-Step Reasoning**: Uses GPT-4.1-mini with up to 50 reasoning steps per request
- **Full Transparency**: All tool usage is logged and reported to users
- **Production-Ready**: Deployed on Railway with persistent storage and auto-scaling

## Quick Start

### For Discord Users

1. **Invite Omega to your Discord server** (link provided by administrator)
2. **Interact with Omega** in any of these ways:
   - Direct message (DM)
   - Mention `@omega` in a channel
   - Reply to Omega's messages
   - Just chat in channels where Omega is active

3. **Try some examples**:
   ```
   @omega execute this Python code: print("Hello, World!")
   @omega search for the latest AI research papers
   @omega create an interactive HTML calculator
   @omega generate an image of a futuristic city
   @omega tell me a joke
   ```

See [HOW_TO.md](./HOW_TO.md) for detailed examples and use cases.

### For Developers

**Prerequisites:**
- Node.js 20+
- pnpm 9.0.0+
- Discord bot token
- OpenAI API key

**Installation:**
```bash
# Clone the repository
git clone https://github.com/thomasdavis/omega.git
cd omega

# Install dependencies
pnpm install

# Set up environment variables
cp apps/bot/.env.example apps/bot/.env
# Edit apps/bot/.env with your API keys

# Build the project
pnpm build

# Start the bot
pnpm --filter @omega/bot dev
```

**Required Environment Variables:**
- `DISCORD_BOT_TOKEN` - Discord bot authentication
- `OPENAI_API_KEY` - OpenAI API access

**Optional Variables:**
- `GITHUB_TOKEN` - For GitHub integration
- `UNSANDBOX_API_KEY` - For code execution
- See [SETUP.md](./SETUP.md) for complete configuration

## Architecture

```
Discord User
    ↓
Discord Gateway (WebSocket)
    ↓
Omega Bot (Railway)
    ↓
AI Agent (GPT-4.1-mini + 50+ Tools)
    ↓
Tool Execution → Response
```

### Key Components

- **Discord Gateway**: WebSocket connection for real-time messaging
- **AI Agent**: Multi-step reasoning engine using Vercel AI SDK v6
- **Tool System**: 50+ specialized capabilities organized by category
- **Storage**: SQLite database with full-text search
- **Artifact Server**: HTTP server for hosting generated content
- **CI/CD**: Automated deployment through GitHub Actions

### Technology Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.6.3
- **Build System**: Turborepo 2.1.3
- **Package Manager**: pnpm 9.0.0
- **Discord**: discord.js 14.24.2
- **AI Framework**: Vercel AI SDK v6
- **AI Model**: OpenAI GPT-4.1-mini
- **Deployment**: Railway
- **Database**: SQLite (@libsql/client)

## Tool Categories

Omega has 50+ specialized tools organized into these categories:

### Code & Development
- Execute code in 42+ languages (Python, JavaScript, Go, Rust, etc.)
- GitHub integration (create issues, merge PRs, commit files)
- Search and analyze codebase

### Content Creation
- Generate interactive HTML/SVG artifacts
- DALL-E 3 image generation and editing
- Blog post creation with TTS
- Presentation generation (Slidev)

### Research & Information
- Web scraping (robots.txt compliant)
- Web search integration
- Automated research essays
- Message history queries

### Collaboration
- Real-time collaborative documents (Yjs CRDT)
- Conversation export to Markdown
- File upload and hosting

### Data & Visualization
- Professional chart generation
- ASCII art graphs
- Market predictions
- Weather information

### Automation
- Daily blog generation (9 AM UTC)
- Railway error monitoring
- Automatic GitHub issue creation

See [HOW_TO.md](./HOW_TO.md) for detailed examples of each category.

## Self-Coding Workflow

Omega can improve itself autonomously:

```
1. User creates GitHub issue or comments "@claude <request>"
   ↓
2. Claude Code analyzes and implements feature
   ↓
3. Auto-creates PR with "Fixes #N"
   ↓
4. CI checks run (lint, type-check, build)
   ↓
5. Auto-merge to main (if checks pass)
   ↓
6. Deploy to Railway
   ↓
7. Discord notification
   ↓
8. Omega restarts with new feature
```

**Timeline**: Typically 2-5 minutes from issue creation to production deployment.

## Cost & Performance

### Operating Costs
- **Railway**: $5-10/month (hosting + 1GB storage)
- **OpenAI**: $2-5/month (GPT-4.1-mini usage)
- **Total**: ~$10-20/month

### Performance
- Simple responses: 1-3 seconds
- Tool execution: 3-10 seconds
- Code execution: 5-30 seconds
- Image generation: 10-20 seconds

## Documentation

- **[HOW_TO.md](./HOW_TO.md)** - Comprehensive guide with examples
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed architecture documentation
- **[OMEGA_FLOW.md](./OMEGA_FLOW.md)** - Complete operational flow
- **[OMEGA_COMPREHENSIVE_SUMMARY.md](./OMEGA_COMPREHENSIVE_SUMMARY.md)** - System summary for marketing
- **[SETUP.md](./SETUP.md)** - Development and deployment setup
- **[CLAUDE.md](./CLAUDE.md)** - Project-specific instructions for Claude

## Security & Ethics

- **Code Execution**: Container-based sandboxing with network isolation
- **Web Scraping**: robots.txt compliance
- **File Upload**: Filename sanitization, extension validation, 25MB limit
- **API Security**: Token-based authentication, scoped permissions
- **Privacy**: All interactions logged (users should be aware)

## Contributing

Contributions are welcome! The project follows these conventions:

1. **Branch naming**: `claude/issue-N-timestamp` for automated PRs
2. **Commits**: Descriptive messages following conventional commits
3. **PRs**: Auto-created for claude/* branches, auto-merged on passing checks
4. **Code style**: TypeScript with strict typing, ESLint configuration

See existing code for patterns and conventions.

## Support

- **GitHub Issues**: Bug reports and feature requests
- **Discord**: Join the community (link provided by administrator)
- **Documentation**: Check the docs/ folder for specific topics

## License

[Add your license here]

## Credits

Built with:
- [Discord.js](https://discord.js.org/)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [OpenAI](https://openai.com/)
- [Railway](https://railway.app/)
- And many other amazing open-source projects

---

**Want to see Omega in action?** Check out [HOW_TO.md](./HOW_TO.md) for real examples and use cases.
