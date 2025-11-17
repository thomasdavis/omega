/**
 * AI SDK v6 Agent with Tools
 * Uses the new agent protocol from https://ai-sdk.dev/docs/announcing-ai-sdk-6-beta
 */

import { openai } from '@ai-sdk/openai';
import { streamText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { searchTool } from './tools/search.js';
import { calculatorTool } from './tools/calculator.js';
import { weatherTool } from './tools/weather.js';
import { githubCreateIssueTool } from './tools/github.js';
import { webFetchTool } from './tools/webFetch.js';
import { unsandboxTool } from './tools/unsandbox.js';
import { researchEssayTool } from './tools/researchEssay.js';
import { asciiGraphTool } from './tools/asciiGraph.js';
import { whoamiTool } from './tools/whoami.js';
import { linuxAdvantagesTool } from './tools/linuxAdvantages.js';
import { artifactTool } from './tools/artifact.js';
import { fileUploadTool } from './tools/fileUpload.js';
import { exportConversationTool } from './tools/exportConversation.js';
import { jsonAgentGeneratorTool } from './tools/jsonAgentGenerator.js';
import { hackerNewsPhilosophyTool } from './tools/hackerNewsPhilosophy.js';
import { moodUplifterTool } from './tools/moodUplifter.js';
import { tellJokeTool } from './tools/tellJoke.js';
import { generateHtmlPageTool } from './tools/generateHtmlPage.js';
import { recipeGeneratorTool } from './tools/recipeGenerator.js';
import { oodaTool } from './tools/ooda.js';
import { evaliteQueryTool } from './tools/evaliteQuery.js';
import { getOmegaSystemPrompt } from '../evaluation/promptAbstraction.js';
import { evaliteService } from '../evaluation/evaliteService.js';

// Use openai.chat() to force /v1/chat/completions instead of /v1/responses
// This works around schema validation bugs in the Responses API with AI SDK v6 beta.99
const model = openai.chat('gpt-4.1-mini');

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
 * Build system prompt with embedded personality configuration
 * Now uses the prompt abstraction layer for testability and evaluation
 */
function buildSystemPrompt(): string {
  // Get the base prompt from abstraction layer
  const promptTemplate = getOmegaSystemPrompt();

  // Enhance with tool descriptions (keeping only the new Evalite tool description)
  return `${promptTemplate.systemPrompt}

Evalite Evaluation Queries: You have access to the evaliteQuery tool for querying and viewing evaluation data for Omega's responses. When users ask about response quality, performance metrics, or want transparency into evaluation scores, use this tool to:
- Query individual evaluations with filters (user, channel, date range, minimum score)
- Get statistics and summary metrics (average scores, score distribution, total evaluations)
- Provide transparency into quality assessment metrics: quality, relevance, accuracy, coherence, and helpfulness
The tool provides access to persistent evaluation data that tracks Omega's performance over time.`;
}

/**
 * Run the AI agent with tool support
 */
export async function runAgent(
  userMessage: string,
  context: AgentContext
): Promise<AgentResult> {
  const toolCalls: ToolCallInfo[] = [];

  console.log('🤖 Running AI agent with tools...');
  console.log('🔍 DEBUG: userMessage =', userMessage);
  console.log('🔍 DEBUG: context =', JSON.stringify(context, null, 2));

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

    console.log('🔍 DEBUG: Built history context, length =', historyContext.length);
    console.log('🔍 DEBUG: About to call streamText...');
    console.log('🔍 DEBUG: Model =', model);
    console.log('🔍 DEBUG: stopWhen condition = stepCountIs(10)');

    const streamResult = streamText({
      model,
      system: buildSystemPrompt(),
      prompt: `[User: ${context.username} in #${context.channelName}]${historyContext}\n${context.username}: ${userMessage}`,
      tools: {
        search: searchTool,
        calculator: calculatorTool,
        weather: weatherTool,
        githubCreateIssue: githubCreateIssueTool,
        webFetch: webFetchTool,
        unsandbox: unsandboxTool,
        researchEssay: researchEssayTool,
        asciiGraph: asciiGraphTool,
        artifact: artifactTool,
        whoami: whoamiTool,
        linuxAdvantages: linuxAdvantagesTool,
        fileUpload: fileUploadTool,
        exportConversation: exportConversationTool,
        jsonAgentGenerator: jsonAgentGeneratorTool,
        hackerNewsPhilosophy: hackerNewsPhilosophyTool,
        moodUplifter: moodUplifterTool,
        tellJoke: tellJokeTool,
        generateHtmlPage: generateHtmlPageTool,
        recipeGenerator: recipeGeneratorTool,
        ooda: oodaTool,
        evaliteQuery: evaliteQueryTool,
      },
      // AI SDK v6: Use stopWhen instead of maxSteps to enable multi-step tool calling
      // This allows the agent to continue after tool calls to generate text commentary
      stopWhen: stepCountIs(10),
      // @ts-ignore - onStepFinish callback types differ in beta
      onStepFinish: (step) => {
        // Track tool calls - step.content contains an array of tool-call and tool-result objects
        // @ts-ignore - content property exists at runtime
        if (step.content && Array.isArray(step.content)) {
          // @ts-ignore
          const toolCallItems = step.content.filter(item => item.type === 'tool-call');
          // @ts-ignore
          const toolResultItems = step.content.filter(item => item.type === 'tool-result');

          for (const toolCallItem of toolCallItems) {
            // @ts-ignore
            const toolName = toolCallItem.toolName;
            // @ts-ignore
            const toolCallId = toolCallItem.toolCallId;
            // @ts-ignore - input contains the arguments
            const args = toolCallItem.input || {};

            // Find the corresponding result
            // @ts-ignore
            const resultItem = toolResultItems.find(r => r.toolCallId === toolCallId);
            // @ts-ignore - output contains the result
            const result = resultItem?.output;

            console.log(`   🔧 Tool called: ${toolName} with args:`, args);

            toolCalls.push({
              toolName,
              args,
              result,
            });
          }
        }
      },
    });

    console.log('🔍 DEBUG: streamText call initiated successfully');
    console.log('🔍 DEBUG: streamResult type =', typeof streamResult);
    console.log('🔍 DEBUG: Now waiting for streamResult.text...');

    // Wait for the full stream to complete and get final text
    let finalText;
    try {
      finalText = await streamResult.text;
      console.log('🔍 DEBUG: Successfully got finalText from stream');
    } catch (textError) {
      console.error('🔍 DEBUG: Error getting text from stream:', textError);
      throw textError;
    }

    console.log(`✅ Agent completed (${toolCalls.length} tool calls)`);
    console.log(`🔍 DEBUG: Returning tool calls:`, JSON.stringify(toolCalls, null, 2));

    // Debug: Log the final text
    console.log(`🔍 DEBUG: finalText =`, finalText);
    console.log(`🔍 DEBUG: finalText.length =`, finalText?.length || 0);

    // Evaluate the response using Evalite (asynchronous, non-blocking)
    // This runs in the background and doesn't delay the response
    if (finalText && process.env.EVALITE_ENABLED !== 'false') {
      evaliteService.evaluateResponse(userMessage, finalText, context)
        .catch(error => {
          console.error('[Evalite] Error evaluating response:', error);
        });
    }

    return {
      response: finalText,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  } catch (error) {
    console.error('❌ Error in AI agent:', error);
    console.error('❌ Error type:', error?.constructor?.name);
    console.error('❌ Error message:', error?.message);
    console.error('❌ Error stack:', error?.stack);
    throw error;
  }
}
