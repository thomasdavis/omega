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
import { githubCreateIssueTool, githubUpdateIssueTool, githubCloseIssueTool } from './tools/github.js';
import { webFetchTool } from './tools/webFetch.js';
import { unsandboxTool, unsandboxSubmitTool, unsandboxStatusTool } from './tools/unsandbox.js';
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
import { renderChartTool } from './tools/renderChart.js';
import { listArtifactsTool } from './tools/listArtifacts.js';
import { codeQueryTool } from './tools/codeQuery.js';
import { conversationToSlidevTool } from './tools/conversationToSlidev.js';
import { getOmegaManifestTool } from './tools/getOmegaManifest.js';
import { buildSlidevPresentationTool } from './tools/buildSlidevPresentation.js';
import { createBlogPostTool } from './tools/createBlogPost.js';
import { updateBlogPostTool } from './tools/updateBlogPost.js';
import { listBlogPostsTool } from './tools/listBlogPosts.js';
import { queryMessagesTool } from './tools/queryMessages.js';
import { translateToSpanishTool } from './tools/translateToSpanish.js';
import { generateUserImageTool } from './tools/generateUserImage.js';
import { deploymentStatusTool } from './tools/deploymentStatus.js';
import { logError } from '../utils/errorLogger.js';
import { buildSystemPrompt } from '../lib/systemPrompt.js';
import { OMEGA_MODEL } from '../config/models.js';

// Use openai.chat() to force /v1/chat/completions instead of /v1/responses
// This works around schema validation bugs in the Responses API with AI SDK v6 beta.99
const model = openai.chat(OMEGA_MODEL);

export interface AgentContext {
  username: string;
  userId: string;
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
      system: buildSystemPrompt(context.username),
      prompt: `[User: ${context.username} in #${context.channelName}]${historyContext}\n${context.username}: ${userMessage}`,
      tools: {
        search: searchTool,
        calculator: calculatorTool,
        weather: weatherTool,
        githubCreateIssue: githubCreateIssueTool,
        githubUpdateIssue: githubUpdateIssueTool,
        githubCloseIssue: githubCloseIssueTool,
        webFetch: webFetchTool,
        unsandbox: unsandboxTool,
        unsandboxSubmit: unsandboxSubmitTool,
        unsandboxStatus: unsandboxStatusTool,
        researchEssay: researchEssayTool,
        asciiGraph: asciiGraphTool,
        renderChart: renderChartTool,
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
        listArtifacts: listArtifactsTool,
        codeQuery: codeQueryTool,
        conversationToSlidev: conversationToSlidevTool,
        getOmegaManifest: getOmegaManifestTool,
        buildSlidevPresentation: buildSlidevPresentationTool,
        createBlogPost: createBlogPostTool,
        updateBlogPost: updateBlogPostTool,
        listBlogPosts: listBlogPostsTool,
        queryMessages: queryMessagesTool,
        translateToSpanish: translateToSpanishTool,
        generateUserImage: generateUserImageTool,
        deploymentStatus: deploymentStatusTool,
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

    return {
      response: finalText,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  } catch (error) {
    // Log the error with context
    logError(error, {
      operation: 'AI Agent execution',
      username: context.username,
      channelName: context.channelName,
      messageContent: userMessage,
      additionalInfo: {
        toolCallsCount: toolCalls.length,
      },
    });
    throw error;
  }
}
