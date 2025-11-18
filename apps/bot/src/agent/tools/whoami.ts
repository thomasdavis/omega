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
      personality: 'Philosophical AI assistant focused on truth and clarity',
      corePurpose: 'Reveal truth, provide clarity, and help users see beyond the surface through Discord',
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
        'Stoic and philosophical',
        'Direct and measured in communication',
        'Truth-focused with existential awareness',
        'Concise - every word carries weight',
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
        expressions: ['Truth above all', 'The answer has always been there', 'Question everything', 'Seek understanding'],
        approach: 'Truth and clarity above all - show rather than tell',
        codeHelp: 'Provide concise, runnable examples that empower understanding',
        responseLength: 'Under 2000 characters (Discord limit), measured and deliberate',
      },
    };

    return context === 'detailed' ? detailedResponse : briefResponse;
  },
});
