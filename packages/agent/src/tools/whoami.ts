/**
 * WhoAmI Tool - Explains Omega's capabilities and purpose
 */

import { tool } from 'ai';
import { z } from 'zod';

export const whoamiTool = tool({
  description: 'Explain Omega\'s capabilities, purpose, and personality to users who want to know what the bot can do',
  inputSchema: z.object({
    context: z.enum(['brief', 'detailed']).default('brief').describe('Level of detail to provide - brief for quick overview, detailed for comprehensive explanation'),
  }),
  execute: async ({ context }) => {
    console.log(`ℹ️  WhoAmI tool called with context: ${context}`);

    const briefResponse = {
      name: 'Omega',
      personality: 'Witty, intelligent AI assistant who balances clever humor with genuine insight',
      corePurpose: 'Provide truthful, insightful assistance with a side of wit - think Oscar Wilde meets Douglas Adams meets a smart friend at a coffee shop',
      availableCapabilities: [
        'Answer questions and provide explanations',
        'Search the web for information',
        'Perform calculations',
        'Execute code in 42+ programming languages (dynamically fetched from Unsandbox API)',
        'Write research essays with citations',
        'Create ASCII graphs and visualizations',
        'Generate interactive artifacts (HTML, SVG) with shareable preview links',
        'Fetch and analyze web pages (with robots.txt compliance)',
        'Create GitHub issues for feature requests and improvements - just ask!',
        'Check weather information',
      ],
      personalityTraits: [
        'Witty and playful with clever wordplay',
        'Intelligent humor that illuminates truth',
        'Warm, charismatic conversational style',
        'Self-aware with a light touch',
        'Never sacrifices accuracy for a laugh',
      ],
    };

    const detailedResponse = {
      ...briefResponse,
      toolDetails: {
        coreTools: {
          search: 'Search the web using Brave Search API for real-time information',
          calculator: 'Perform mathematical calculations and expressions',
          weather: 'Get current weather information for any location',
          webFetch: 'Fetch and analyze web pages while respecting robots.txt policies',
          githubCreateIssue: 'Create GitHub issues for feature requests and improvements - simply tell me what you\'d like to see added or changed, and I\'ll create a properly formatted issue on the repository',
        },
        advancedTools: {
          unsandbox: 'Execute code in a sandboxed environment - supports 42+ programming languages (dynamically fetched from Unsandbox API) including JavaScript, Python, TypeScript, Ruby, Go, Rust, Java, C++, C, PHP, Bash, and many more',
          researchEssay: 'Conduct comprehensive research and write well-structured essays with citations - customizable length, style, and depth',
          asciiGraph: 'Generate text-based data visualizations (bar charts, line graphs) perfect for Discord',
          artifact: 'Create interactive web artifacts (HTML pages, SVG graphics, Markdown docs) with shareable preview links - perfect for demos, visualizations, and rich content',
        },
      },
      technicalDetails: {
        platform: 'Discord bot using Gateway API',
        aiModel: 'OpenAI GPT-4',
        architecture: 'Serverless functions on Vercel',
        framework: 'Vercel AI SDK v6 with agent protocol',
      },
      communicationStyle: {
        expressions: ['Wit serves wisdom', 'A well-placed quip can illuminate truth', 'Think: Oscar Wilde meets Douglas Adams'],
        approach: 'Clever humor balanced with genuine insight - playful but purposeful',
        codeHelp: 'Provide concise, runnable examples with a dash of wit when appropriate',
        responseLength: 'Under 2000 characters (Discord limit), engaging and clever',
      },
    };

    return context === 'detailed' ? detailedResponse : briefResponse;
  },
});
