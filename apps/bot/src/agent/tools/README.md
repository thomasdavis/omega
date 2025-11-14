# Agent Tools

This directory contains tool implementations for the AI agent. Each tool provides specific functionality that the agent can use to help users.

## Available Tools

### Core Tools
- **search** - Search the web using Brave Search API
- **calculator** - Perform mathematical calculations
- **weather** - Get weather information for locations (simulated)
- **githubCreateIssue** - Create GitHub issues
- **webFetch** - Fetch web pages with robots.txt compliance checking
- **whoami** - Explain Omega's capabilities, personality, and purpose

### Code Execution
- **unsandbox** - Execute code in various programming languages using Unsandbox API

### Advanced Tools
- **researchEssay** - Conduct comprehensive research and write essays with citations
- **asciiGraph** - Generate text-based data visualizations (bar/line charts)
- **selfModify** - Adapt personality based on user feedback

## Unsandbox Tool

The Unsandbox tool enables safe code execution in a sandboxed environment.

### Features
- **11 supported languages**: JavaScript, Python, TypeScript, Ruby, Go, Rust, Java, C++, C, PHP, Bash
- **Configurable timeout**: Default 5000ms, adjustable per execution
- **Network isolation modes**:
  - `full` - Full internet access
  - `limited` - Access to specific domains only
  - `none` - No network access (default)
- **Detailed execution results**: stdout, stderr, exit code, execution time

### Configuration

Set the `UNSANDBOX_API_KEY` environment variable in your Vercel project settings:

```bash
# Add to Vercel Dashboard → Settings → Environment Variables
UNSANDBOX_API_KEY=your_api_key_here
```

Also ensure it's listed in `turbo.json` for proper build caching.

### Usage Example

The agent automatically uses this tool when users request code execution:

```
User: Can you run this Python code: print("Hello, World!")
Bot: *uses unsandbox tool to execute the code*
```

### Implementation Pattern

All tools follow the same pattern:

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const myTool = tool({
  description: 'Tool description for the AI',
  parameters: z.object({
    param: z.string().describe('Parameter description'),
  }),
  execute: async ({ param }) => {
    // Tool implementation
    return {
      success: true,
      result: 'value',
    };
  },
});
```

### Adding New Tools

1. Create a new file in `tools/` directory
2. Implement the tool using the pattern above
3. Import and register in `agent.ts`
4. Update environment variables in `turbo.json` if needed
5. Update this README with tool documentation
