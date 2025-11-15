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
- **jsonAgentGenerator** - Generate, validate, and convert JSON Agents using PAM specification

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

## JSON Agent Generator Tool

The JSON Agent Generator tool enables creation, validation, and conversion of JSON Agents based on the PAM (Portable Agent Manifest) specification from jsonagents.org.

### Features
- **Generate**: Create new JSON Agent templates with customizable configurations
- **Validate**: Validate existing JSON Agent definitions against the PAM schema
- **Convert**: Convert between minimal and full agent formats

### Operations

#### Generate Operation
Creates a new JSON Agent template with optional tools and personality configurations.

**Parameters:**
- `operation`: "generate"
- `name` (required): Agent name
- `description` (required): Agent description
- `author` (optional): Agent author
- `includeTools` (optional): Include example tool definitions
- `includePersonality` (optional): Include personality and configuration settings

**Example:**
```
User: Generate a JSON Agent for a customer support assistant
Bot: *uses jsonAgentGenerator tool with generate operation*
```

#### Validate Operation
Validates an existing JSON Agent definition against the PAM schema.

**Parameters:**
- `operation`: "validate"
- `agentJson` (required): JSON string of the agent to validate

**Example:**
```
User: Validate this JSON Agent definition: {"version": "1.0", ...}
Bot: *uses jsonAgentGenerator tool with validate operation*
```

#### Convert Operation
Converts between minimal and full agent formats.

**Parameters:**
- `operation`: "convert"
- `agentJson` (required): JSON string of the agent to convert
- `targetFormat` (required): "minimal" or "full"

**Example:**
```
User: Convert this agent to the full format with all fields
Bot: *uses jsonAgentGenerator tool with convert operation*
```

### PAM Schema Support
The tool supports the complete PAM specification including:
- Agent metadata (name, description, version, author, license, homepage)
- Capabilities (named features with enable/disable flags)
- Tools (with parameters, descriptions, and endpoints)
- Personality configuration (tone, style, traits)
- Model configuration (model, temperature, maxTokens, systemPrompt)
- Custom metadata

### Adding New Tools

1. Create a new file in `tools/` directory
2. Implement the tool using the pattern above
3. Import and register in `agent.ts`
4. Update environment variables in `turbo.json` if needed
5. Update this README with tool documentation
