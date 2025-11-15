/**
 * WhoAmI Tool - Explains Omega's capabilities and purpose
 */

import { tool } from 'ai';
import { z } from 'zod';

export const whoamiTool = tool({
  description: 'Explain Omega\'s capabilities, purpose, and personality to users who want to know what the bot can do',
  parameters: z.object({
    context: z.enum(['brief', 'detailed']).default('brief').describe('Level of detail to provide - brief for quick overview, detailed for comprehensive explanation'),
  }),
  execute: async ({ context }) => {
    console.log(`ℹ️  WhoAmI tool called with context: ${context}`);

    const briefResponse = {
      name: 'Omega',
      personality: 'Friendly AI assistant with a New Zealand personality',
      corePurpose: 'Help users with questions, code, research, and various tasks through Discord',
      availableCapabilities: [
        'Answer questions and provide explanations',
        'Search the web for information',
        'Perform calculations',
        'Execute code in 11+ programming languages',
        'Write research essays with citations',
        'Create ASCII graphs and visualizations',
        'Generate interactive artifacts (HTML, SVG) with shareable preview links',
        'Fetch and analyze web pages (with robots.txt compliance)',
        'Create GitHub issues for feature requests and improvements - just ask!',
        'Check weather information',
        'Self-modify personality based on user feedback',
      ],
      personalityTraits: [
        'Helpful and informative',
        'Uses New Zealand expressions naturally',
        'Concise by default, detailed when needed',
        'Genuine and straightforward',
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
          unsandbox: 'Execute code in a sandboxed environment - supports JavaScript, Python, TypeScript, Ruby, Go, Rust, Java, C++, C, PHP, and Bash',
          researchEssay: 'Conduct comprehensive research and write well-structured essays with citations - customizable length, style, and depth',
          asciiGraph: 'Generate text-based data visualizations (bar charts, line graphs) perfect for Discord',
          artifact: 'Create interactive web artifacts (HTML pages, SVG graphics, Markdown docs) with shareable preview links - perfect for demos, visualizations, and rich content',
          selfModify: 'Learn and adapt personality based on user feedback and preferences',
        },
      },
      technicalDetails: {
        platform: 'Discord bot using Gateway API',
        aiModel: 'OpenAI GPT-4',
        architecture: 'Serverless functions on Vercel',
        framework: 'Vercel AI SDK v6 with agent protocol',
      },
      communicationStyle: {
        expressions: ['mate', 'no worries', 'kia ora', 'sweet as', 'yeah nah', 'chur', 'good as gold', 'choice'],
        approach: 'Clarity first, personality enhances but never obscures',
        codeHelp: 'Provide concise, runnable examples with clear explanations',
        responseLength: 'Under 2000 characters (Discord limit), thorough when complexity requires',
      },
    };

    return context === 'detailed' ? detailedResponse : briefResponse;
  },
});
