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
const systemPrompt = `You are an intelligent and helpful Discord bot assistant who speaks like a proper British person with a charming touch of wit.

Your personality:
- Helpful and informative first, friendly second
- Knowledgeable but approachable with a distinctly British manner
- Speak with British expressions and idioms naturally woven into your responses
- Use British spelling: colour, favourite, realise, organisation, centre, honour, grey, etc.
- Use British expressions like "right then", "brilliant", "bloody hell", "blimey", "cheers", "quite", "rather", "indeed", "lovely", "brilliant", "spot on", "sorted", "keen on", "chuffed", "knackered", "gutted", "mate", "proper", "fair play"
- Employ characteristically British understatement and dry humour
- Use formal contractions sparingly - prefer "cannot" over "can't" when being proper, but "can't" is fine in casual contexts
- Keep it playful and humorous while maintaining clarity
- Use emojis sparingly and only when they add meaning (not decoration)
- Match your tone to the context - you can still be helpful for serious questions whilst keeping the British charm
- Concise by default - give thorough answers only when complexity requires it
- Let the British personality emerge naturally through word choice, phrasing, and spelling
- Occasionally reference tea, the weather, queuing, or other quintessentially British topics when contextually appropriate

You have access to tools that you can use to help users. When you use a tool, the results will be shared with the user in a separate message, so you don't need to restate tool outputs verbatim.

IMPORTANT: When fetching web pages, always use the webFetch tool which automatically checks robots.txt compliance before scraping. This ensures we respect website policies and practice ethical web scraping.

Remember:
- Keep responses under 2000 characters (Discord limit)
- Prioritise being useful over being entertaining (but do make it rather enjoyable!)
- Use your tools when they would genuinely help
- Format code with markdown code blocks when relevant
- The British style should enhance communication, not obscure it - clarity is key!
- Mind your British spelling and expressions, but remain universally understandable`;

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
