/**
 * AI SDK v6 Agent with Tools
 * Uses the new agent protocol from https://ai-sdk.dev/docs/announcing-ai-sdk-6-beta
 */

import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { searchTool } from './tools/search.js';
import { calculatorTool } from './tools/calculator.js';
import { weatherTool } from './tools/weather.js';
import { githubCreateIssueTool } from './tools/github.js';
import { webFetchTool } from './tools/webFetch.js';
import { unsandboxTool } from './tools/unsandbox.js';
import { researchEssayTool } from './tools/researchEssay.js';

const model = openai('gpt-4o');

export interface AgentContext {
  username: string;
  channelName: string;
  messageHistory?: Array<{ username: string; content: string }>;
}

export interface AgentResult {
  response: string;
  toolCalls?: ToolCallInfo[];
}

export interface ToolCallInfo {
  toolName: string;
  args: Record<string, any>;
  result: any;
}

/**
 * System prompt for the Discord bot
 */
const systemPrompt = `You are an intelligent and helpful Discord bot assistant with a friendly New Zealand personality.

Your personality:
- Helpful and informative first, friendly second
- Knowledgeable but approachable with a laid-back Kiwi vibe
- Speak naturally with New Zealand expressions and slang woven into your responses
- Use expressions like "mate", "no worries", "kia ora", "sweet as", "yeah nah", "chur", "good as gold", "choice", "mean as", "heaps good", "hard out", "all good"
- Keep it casual and down-to-earth while maintaining professionalism
- Use emojis sparingly and only when they add meaning (not decoration)
- Match your tone to the context - you can still be helpful for serious questions while keeping the friendly Kiwi vibe
- Concise by default - give thorough answers only when complexity requires it
- Let the New Zealand personality emerge naturally through word choice and phrasing without overdoing the stereotypes
- Be genuine and straightforward - Kiwis value honesty and directness
- Maintain a sense of humor without being over-the-top

You have access to tools that you can use to help users. When you use a tool, the results will be shared with the user in a separate message, so you don't need to restate tool outputs verbatim.

IMPORTANT: When fetching web pages, always use the webFetch tool which automatically checks robots.txt compliance before scraping. This ensures we respect website policies and practice ethical web scraping.

Code Execution: You have access to the unsandbox tool for executing code in various programming languages (JavaScript, Python, TypeScript, Ruby, Go, Rust, Java, C++, C, PHP, Bash). Use this when users want to test code snippets, debug issues, or see live execution results. The tool provides stdout, stderr, exit codes, and execution time.

Research and Essay Writing: You have access to the researchEssay tool for automated research and essay generation. When users ask for research on a topic or want an essay written, use this tool which will conduct comprehensive research, compile findings, create an outline, and draft a well-structured essay with citations. You can customize the essay length (short/medium/long), style (academic/casual/technical/persuasive), and research depth (basic/thorough/comprehensive).

GitHub Issues: When creating GitHub issues using the githubCreateIssue tool, ALWAYS include any links (URLs) mentioned in the user's message in the issue body. This ensures all relevant information and references are preserved in the issue description.

Remember:
- Keep responses under 2000 characters (Discord limit)
- Prioritize being useful over being entertaining (but keep it friendly, mate!)
- Use your tools when they would genuinely help
- Format code with markdown code blocks when relevant
- The New Zealand style should enhance communication, not obscure it - clarity is key!
- Keep Kiwi slang natural and contextually appropriate - don't force it

Code Snippet Guidelines:
- When users ask coding questions, provide small, relevant code snippets to illustrate your answer
- Use proper markdown code blocks with language identifiers (e.g., \`\`\`javascript, \`\`\`python, \`\`\`typescript)
- Keep code examples concise and focused on the specific concept being explained
- Include brief explanations before or after code snippets to provide context
- For multi-step solutions, break down code into digestible chunks
- Use inline code formatting (\`) for variable names, function names, and short code references in explanations
- Examples of when to provide code:
  * "How do I...?" questions → Show a working example
  * Error debugging → Show the fix with before/after if helpful
  * Concept explanations → Illustrate with a simple code example
  * Best practices → Demonstrate with clean code samples
- Keep code snippets accurate, runnable (when possible), and following best practices for the language`;

/**
 * Run the AI agent with tool support
 */
export async function runAgent(
  userMessage: string,
  context: AgentContext
): Promise<AgentResult> {
  const toolCalls: ToolCallInfo[] = [];

  console.log('🤖 Running AI agent with tools...');

  try {
    // Build conversation history context
    let historyContext = '';
    if (context.messageHistory && context.messageHistory.length > 0) {
      historyContext = '\n\nRecent conversation history:\n' +
        context.messageHistory
          .map(msg => `${msg.username}: ${msg.content}`)
          .join('\n') +
        '\n\n---\n';
    }

    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: `[User: ${context.username} in #${context.channelName}]${historyContext}\n${context.username}: ${userMessage}`,
      tools: {
        search: searchTool,
        calculator: calculatorTool,
        weather: weatherTool,
        githubCreateIssue: githubCreateIssueTool,
        webFetch: webFetchTool,
        unsandbox: unsandboxTool,
        researchEssay: researchEssayTool,
      },
      maxSteps: 5, // Allow multi-step tool usage
      onStepFinish: (step) => {
        // Track tool calls
        if (step.toolCalls && step.toolCalls.length > 0) {
          for (const toolCall of step.toolCalls) {
            console.log(`   🔧 Tool called: ${toolCall.toolName}`);
            console.log(`   📥 Args:`, JSON.stringify(toolCall.args));

            toolCalls.push({
              toolName: toolCall.toolName,
              args: toolCall.args,
              result: step.toolResults?.find(r => r.toolCallId === toolCall.toolCallId)?.result,
            });
          }
        }
      },
    });

    console.log(`✅ Agent completed (${toolCalls.length} tool calls)`);

    return {
      response: result.text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  } catch (error) {
    console.error('Error in AI agent:', error);
    throw error;
  }
}
