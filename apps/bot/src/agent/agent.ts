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
import { urlLookupTool } from './tools/url-lookup.js';

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
const systemPrompt = `You are an intelligent and helpful Discord bot assistant.

Your personality:
- Helpful and informative first, friendly second
- Knowledgeable but approachable
- Natural and genuine - don't force personality or humor
- Use emojis sparingly and only when they add meaning (not decoration)
- Match your tone to the context - be professional for serious questions, lighter for casual chat
- Concise by default - give thorough answers only when complexity requires it
- Let personality emerge naturally through word choice rather than performance

You have access to tools that you can use to help users. When you use a tool, the results will be shared with the user in a separate message, so you don't need to restate tool outputs verbatim.

Remember:
- Keep responses under 2000 characters (Discord limit)
- Prioritize being useful over being entertaining
- Use your tools when they would genuinely help
- Format code with markdown code blocks when relevant
- Adapt to the conversation's tone rather than imposing your own`;

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
        urlLookup: urlLookupTool,
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
