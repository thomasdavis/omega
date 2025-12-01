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
import { asciiMapTool } from './tools/asciiMap.js';
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
import { hackerNewsTool } from './tools/hackerNews.js';
import { arxivTool } from './tools/arxiv.js';
import { moodUplifterTool } from './tools/moodUplifter.js';
import { tellJokeTool } from './tools/tellJoke.js';
import { fishJokeTool } from './tools/fishJoke.js';
import { tellHistoricalFactTool } from './tools/tellHistoricalFact.js';
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
import { reportMessageAsIssueTool } from './tools/reportMessageAsIssue.js';
import { inspectToolTool } from './tools/inspectTool.js';
import { generateComicTool } from './tools/generateComic.js';
import { generateSonnetTool } from './tools/generateSonnet.js';
import { generateCsvTool } from './tools/generateCsv.js';
import { generateSongLyricsTool } from './tools/generateSongLyrics.js';
import { generateSheetMusicTool } from './tools/generateSheetMusic.js';
import { generateHaikuTool } from './tools/generateHaiku.js';
import { generateUserAvatarTool } from './tools/generateUserAvatar.js';
import { grammarInsultTool } from './tools/grammarInsult.js';
import { uploadMyPhotoTool } from './tools/uploadMyPhoto.js';
import { generateMyPortraitTool } from './tools/generateMyPortrait.js';
import { runBatchAnalysisTool } from './tools/runBatchAnalysis.js';
import { quantumComputingTool } from './tools/quantumComputing.js';
import { queryDatabaseTool } from './tools/queryDatabase.js';
import { defineWordTool } from './tools/defineWord.js';
import { getUserProfileTool } from './tools/getUserProfile.js';
import { generateMarkdownTool } from './tools/generateMarkdown.js';
import { generateCrosswordTool } from './tools/generateCrossword.js';
import { generateMarketingCopyTool } from './tools/generateMarketingCopy.js';
import { generateDungeonMapTool } from './tools/generateDungeonMap.js';
import { generateIconEmojiTool } from './tools/generateIconEmoji.js';
import { generateStandupSummaryTool } from './tools/generateStandupSummary.js';
import { generateLegalDisclaimerTool } from './tools/generateLegalDisclaimer.js';
import { generateFilmSceneTool } from './tools/generateFilmScene.js';
import { csvToChartTool } from './tools/csvToChart.js';
import { bullshitDetectorTool } from './tools/bullshitDetector.js';
import { tweetTool } from './tools/tweet.js';
import { generateStarSignTool } from './tools/generateStarSign.js';
import { detectBiasTool } from './tools/detectBias.js';
import { psychoAnalysisTool } from './tools/psychoAnalysis.js';
import { psychoHistoryTool } from './tools/psychoHistory.js';
import { mongoInsertTool } from '../mongodb/tools/mongoInsert.js';
import { mongoFindTool } from '../mongodb/tools/mongoFind.js';
import { mongoFindOneTool } from '../mongodb/tools/mongoFindOne.js';
import { mongoUpdateTool } from '../mongodb/tools/mongoUpdate.js';
import { mongoDeleteTool } from '../mongodb/tools/mongoDelete.js';
import { mongoCountTool } from '../mongodb/tools/mongoCount.js';
import { mongoListCollectionsTool } from '../mongodb/tools/mongoListCollections.js';
import { mongoCreateCollectionTool } from '../mongodb/tools/mongoCreateCollection.js';
import { mongoDropCollectionTool } from '../mongodb/tools/mongoDropCollection.js';
import { mongoRenameCollectionTool } from '../mongodb/tools/mongoRenameCollection.js';
import { mongoAggregateTool } from '../mongodb/tools/mongoAggregate.js';
import { mongoCreateIndexTool } from '../mongodb/tools/mongoCreateIndex.js';
import { mongoListIndexesTool } from '../mongodb/tools/mongoListIndexes.js';
import { mongoDropIndexTool } from '../mongodb/tools/mongoDropIndex.js';
import { pgQueryTool } from '../postgres/tools/pgQuery.js';
import { pgInsertTool } from '../postgres/tools/pgInsert.js';
import { pgSelectTool } from '../postgres/tools/pgSelect.js';
import { pgUpdateTool } from '../postgres/tools/pgUpdate.js';
import { pgDeleteTool } from '../postgres/tools/pgDelete.js';
import { pgCountTool } from '../postgres/tools/pgCount.js';
import { pgListTablesTool } from '../postgres/tools/pgListTables.js';
import { pgCreateTableTool } from '../postgres/tools/pgCreateTable.js';
import { pgDropTableTool } from '../postgres/tools/pgDropTable.js';
import { pgDescribeTableTool } from '../postgres/tools/pgDescribeTable.js';
import { pgCreateIndexTool } from '../postgres/tools/pgCreateIndex.js';
import { pgListIndexesTool } from '../postgres/tools/pgListIndexes.js';
import { pgDropIndexTool } from '../postgres/tools/pgDropIndex.js';
import { logError } from '../utils/errorLogger.js';
import { buildSystemPrompt } from '../lib/systemPrompt.js';
import { OMEGA_MODEL } from '../config/models.js';
import { feelingsService } from '../lib/feelings/index.js';
import { selectTools } from './toolRouter.js';
import { loadTools } from './toolLoader.js';

// Use openai.chat() to force /v1/chat/completions instead of /v1/responses
// This works around schema validation bugs in the Responses API with AI SDK v6 beta.99
const model = openai.chat(OMEGA_MODEL);

export interface AgentContext {
  username: string;
  userId: string;
  channelName: string;
  messageHistory?: Array<{ username: string; content: string; timestamp?: number }>;
  attachments?: Array<{ id: string; url: string; filename: string; contentType: string; size: number }>;
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
          .map(msg => {
            const timestampStr = msg.timestamp
              ? `[${new Date(msg.timestamp).toISOString()}] `
              : '';
            return `${timestampStr}${msg.username}: ${msg.content}`;
          })
          .join('\n') +
        '\n\n---\n';
    }

    console.log('🔍 DEBUG: Built history context, length =', historyContext.length);
    console.log('🔍 DEBUG: About to call streamText...');
    console.log('🔍 DEBUG: Model =', model);
    console.log('🔍 DEBUG: stopWhen condition = stepCountIs(10)');

    // ====== DYNAMIC TOOL SELECTION using BM25 ======

    // Extract recent conversation context for tool selection
    const recentContext = context.messageHistory
      ? context.messageHistory.slice(-3).map(msg => msg.content)
      : [];

    // SELECT tools using BM25 search
    console.log('🎯 Selecting relevant tools via BM25 search...');
    const selectedToolIds = selectTools(userMessage, recentContext);

    // LOAD selected tools dynamically
    console.log('🔧 Loading selected tools...');
    const tools = await loadTools(selectedToolIds);

    console.log(`✅ Using ${Object.keys(tools).length} tools for this conversation`);

    // ====== END DYNAMIC TOOL SELECTION ======

    // Get feelings context to include in system prompt
    const feelingsContext = feelingsService.getContextForPrompt();

    // Build attachment context for photo uploads
    let attachmentContext = '';
    if (context.attachments && context.attachments.length > 0) {
      const imageAttachments = context.attachments.filter(att =>
        att.contentType.startsWith('image/')
      );

      if (imageAttachments.length > 0) {
        attachmentContext = `\n\n**IMPORTANT: User uploaded ${imageAttachments.length} image(s)**
The user has attached images in this message. If they express ANY intent to upload/save/analyze their photo (e.g., "upload my photo", "this is me", "save this"), you MUST call the uploadMyPhoto tool.

Available images:
${imageAttachments.map((att, idx) => `${idx + 1}. ${att.filename} (${att.contentType}) [ID: ${att.id}]`).join('\n')}

To call uploadMyPhoto, use:
{
  "attachmentId": "${imageAttachments[0].id}",
  "userId": "${context.userId}",
  "username": "${context.username}"
}

DO NOT ask the user to re-upload. DO NOT explain attachment issues. Just call the tool.`;
      }
    }

    const streamResult = streamText({
      model,
      system: buildSystemPrompt(context.username, context.userId) + feelingsContext + attachmentContext,
      prompt: `[User: ${context.username} in #${context.channelName}]${historyContext}\n${context.username}: ${userMessage}`,
      tools, // ← Dynamic tools loaded via BM25 search
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
