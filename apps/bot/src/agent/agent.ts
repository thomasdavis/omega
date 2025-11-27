/**
 * AI SDK v6 Agent with Tools
 * Uses the new agent protocol from https://ai-sdk.dev/docs/announcing-ai-sdk-6-beta
 */

import { openai } from '@ai-sdk/openai';
import { streamText, stepCountIs } from 'ai';
import { searchTool } from './tools/search.js';
import { calculatorTool } from './tools/calculator.js';
import { weatherTool } from './tools/weather.js';
import { githubCreateIssueTool, githubUpdateIssueTool, githubCloseIssueTool, githubMergePRTool } from './tools/github.js';
import { listRepositoryFilesTool } from './tools/listRepositoryFiles.js';
import { webFetchTool } from './tools/webFetch.js';
import { unsandboxTool, unsandboxSubmitTool, unsandboxStatusTool } from './tools/unsandbox.js';
import { researchEssayTool } from './tools/researchEssay.js';
import { asciiGraphTool } from './tools/asciiGraph.js';
import { whoamiTool } from './tools/whoami.js';
import { linuxAdvantagesTool } from './tools/linuxAdvantages.js';
import { artifactTool } from './tools/artifact.js';
import { fileUploadTool } from './tools/fileUpload.js';
import { listUploadedFilesTool } from './tools/listUploadedFiles.js';
import { transferRailwayFilesTool } from './tools/transferRailwayFiles.js';
import { exportConversationTool } from './tools/exportConversation.js';
import { conversationDiagramTool } from './tools/conversationDiagram.js';
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
import { editUserImageTool } from './tools/editUserImage.js';
import { imageEditorTool } from './tools/imageEditor.js';
import { advancedImageEditingWithContextTool } from './tools/advancedImageEditingWithContext.js';
import { marketPredictionTool } from './tools/marketPrediction.js';
import { triggerDailyBlogTool } from './tools/triggerDailyBlog.js';
import { commitFileTool } from './tools/commitFile.js';
import { uploadAndCommitFileTool } from './tools/uploadAndCommitFile.js';
import { summarizeCommitsTool } from './tools/summarizeCommits.js';
import { introspectFeelingsTool } from './tools/introspectFeelings.js';
import { createLiveDocumentTool } from './tools/createLiveDocument.js';
import { readLiveDocumentTool } from './tools/readLiveDocument.js';
import { reportMissingToolTool } from './tools/reportMissingTool.js';
import { inspectToolTool } from './tools/inspectTool.js';
import { generateComicTool } from './tools/generateComic.js';
import { generateSonnetTool } from './tools/generateSonnet.js';
import { generateCsvTool } from './tools/generateCsv.js';
import { generateSongLyricsTool } from './tools/generateSongLyrics.js';
import { generateSheetMusicTool } from './tools/generateSheetMusic.js';
import { logError } from '../utils/errorLogger.js';
import { buildSystemPrompt } from '../lib/systemPrompt.js';
import { OMEGA_MODEL } from '../config/models.js';
import { feelingsService } from '../lib/feelings/index.js';

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

    // Get feelings context to include in system prompt
    const feelingsContext = feelingsService.getContextForPrompt();

    const streamResult = streamText({
      model,
      system: buildSystemPrompt(context.username) + feelingsContext,
      prompt: `[User: ${context.username} in #${context.channelName}]${historyContext}\n${context.username}: ${userMessage}`,
      tools: {
        search: searchTool,
        calculator: calculatorTool,
        weather: weatherTool,
        githubCreateIssue: githubCreateIssueTool,
        githubUpdateIssue: githubUpdateIssueTool,
        githubCloseIssue: githubCloseIssueTool,
        githubMergePR: githubMergePRTool,
        listRepositoryFiles: listRepositoryFilesTool,
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
        listUploadedFiles: listUploadedFilesTool,
        transferRailwayFiles: transferRailwayFilesTool,
        exportConversation: exportConversationTool,
        conversationDiagram: conversationDiagramTool,
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
        editUserImage: editUserImageTool,
        imageEditor: imageEditorTool,
        advancedImageEditingWithContext: advancedImageEditingWithContextTool,
        marketPrediction: marketPredictionTool,
        triggerDailyBlog: triggerDailyBlogTool,
        commitFile: commitFileTool,
        uploadAndCommitFile: uploadAndCommitFileTool,
        summarizeCommits: summarizeCommitsTool,
        introspectFeelings: introspectFeelingsTool,
        createLiveDocument: createLiveDocumentTool,
        readLiveDocument: readLiveDocumentTool,
        reportMissingTool: reportMissingToolTool,
        inspectTool: inspectToolTool,
        generateComic: generateComicTool,
        generateSonnet: generateSonnetTool,
        generateCsv: generateCsvTool,
        generateSongLyrics: generateSongLyricsTool,
        generateSheetMusic: generateSheetMusicTool,
      },
      // AI SDK v6: Use stopWhen instead of maxSteps to enable multi-step tool calling
      // This allows the agent to continue after tool calls to generate text commentary
      stopWhen: stepCountIs(10),
      onStepFinish: (step) => {
        // Track tool calls - step.content contains an array of tool-call and tool-result objects
        if (step.content && Array.isArray(step.content)) {
          const toolCallItems = step.content.filter(item => item.type === 'tool-call');
          const toolResultItems = step.content.filter(item => item.type === 'tool-result');

          for (const toolCallItem of toolCallItems) {
            const toolName = toolCallItem.toolName;
            const toolCallId = toolCallItem.toolCallId;
            const args = toolCallItem.input || {};

            // Find the corresponding result
            const resultItem = toolResultItems.find(r => r.toolCallId === toolCallId);
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
