/**
 * Tool Loader - Dynamically imports tools based on selection
 * Uses ES module dynamic imports with caching for performance
 */

// Use any for tool type since AI SDK v6 doesn't export a public tool type
type Tool = any;

/**
 * Tool import cache
 * Prevents repeated imports of the same tools
 */
const toolCache = new Map<string, Tool>();

/**
 * Tool import map
 * Maps tool IDs to their file paths and export names
 */
const TOOL_IMPORT_MAP: Record<string, { path: string; exportName: string }> = {
  // Core tools
  search: { path: './tools/search.js', exportName: 'searchTool' },
  calculator: { path: './tools/calculator.js', exportName: 'calculatorTool' },
  artifact: { path: './tools/artifact.js', exportName: 'artifactTool' },
  unsandbox: { path: './tools/unsandbox.js', exportName: 'unsandboxTool' },
  webFetch: { path: './tools/webFetch.js', exportName: 'webFetchTool' },
  fileUpload: { path: './tools/fileUpload.js', exportName: 'fileUploadTool' },
  generateHtmlPage: { path: './tools/generateHtmlPage.js', exportName: 'generateHtmlPageTool' },
  whoami: { path: './tools/whoami.js', exportName: 'whoamiTool' },
  listTools: { path: './tools/listTools.js', exportName: 'listToolsTool' },

  // MongoDB tools (14) - imported from @repo/database
  mongoInsert: { path: '@repo/database', exportName: 'mongoInsertTool' },
  mongoFind: { path: '@repo/database', exportName: 'mongoFindTool' },
  mongoFindOne: { path: '@repo/database', exportName: 'mongoFindOneTool' },
  mongoUpdate: { path: '@repo/database', exportName: 'mongoUpdateTool' },
  mongoDelete: { path: '@repo/database', exportName: 'mongoDeleteTool' },
  mongoCount: { path: '@repo/database', exportName: 'mongoCountTool' },
  mongoListCollections: { path: '@repo/database', exportName: 'mongoListCollectionsTool' },
  mongoCreateCollection: { path: '@repo/database', exportName: 'mongoCreateCollectionTool' },
  mongoDropCollection: { path: '@repo/database', exportName: 'mongoDropCollectionTool' },
  mongoRenameCollection: { path: '@repo/database', exportName: 'mongoRenameCollectionTool' },
  mongoAggregate: { path: '@repo/database', exportName: 'mongoAggregateTool' },
  mongoCreateIndex: { path: '@repo/database', exportName: 'mongoCreateIndexTool' },
  mongoListIndexes: { path: '@repo/database', exportName: 'mongoListIndexesTool' },
  mongoDropIndex: { path: '@repo/database', exportName: 'mongoDropIndexTool' },

  // PostgreSQL tools (15) - imported from @repo/database
  pgQuery: { path: '@repo/database', exportName: 'pgQueryTool' },
  pgInsert: { path: '@repo/database', exportName: 'pgInsertTool' },
  pgSelect: { path: '@repo/database', exportName: 'pgSelectTool' },
  pgUpdate: { path: '@repo/database', exportName: 'pgUpdateTool' },
  pgDelete: { path: '@repo/database', exportName: 'pgDeleteTool' },
  pgCount: { path: '@repo/database', exportName: 'pgCountTool' },
  pgListTables: { path: '@repo/database', exportName: 'pgListTablesTool' },
  pgCreateTable: { path: '@repo/database', exportName: 'pgCreateTableTool' },
  pgDropTable: { path: '@repo/database', exportName: 'pgDropTableTool' },
  pgDescribeTable: { path: '@repo/database', exportName: 'pgDescribeTableTool' },
  pgDescribeSchema: { path: '@repo/database', exportName: 'pgDescribeSchemaTool' },
  pgCreateIndex: { path: '@repo/database', exportName: 'pgCreateIndexTool' },
  pgListIndexes: { path: '@repo/database', exportName: 'pgListIndexesTool' },
  pgDropIndex: { path: '@repo/database', exportName: 'pgDropIndexTool' },
  analyzeMessageWords: { path: '@repo/database', exportName: 'analyzeMessageWordsTool' },

  // GitHub tools (10)
  githubCreateIssue: { path: './tools/github/createIssue.js', exportName: 'githubCreateIssueTool' },
  githubUpdateIssue: { path: './tools/github/updateIssue.js', exportName: 'githubUpdateIssueTool' },
  githubCloseIssue: { path: './tools/github/closeIssue.js', exportName: 'githubCloseIssueTool' },
  githubListIssues: { path: './tools/github/listIssues.js', exportName: 'githubListIssuesTool' },
  githubCloseAllIssues: { path: './tools/github/closeAllIssues.js', exportName: 'githubCloseAllIssuesTool' },
  githubFixIssues: { path: './tools/github/fixIssues.js', exportName: 'githubFixIssuesTool' },
  githubMergePR: { path: './tools/github/mergePR.js', exportName: 'githubMergePRTool' },
  githubListPullRequests: { path: './tools/github/listPullRequests.js', exportName: 'githubListPullRequestsTool' },
  githubClosePullRequest: { path: './tools/github/closePullRequest.js', exportName: 'githubClosePullRequestTool' },
  githubCloseAllPullRequests: { path: './tools/github/closeAllPullRequests.js', exportName: 'githubCloseAllPullRequestsTool' },

  // File management tools
  listUploadedFiles: { path: './tools/listUploadedFiles.js', exportName: 'listUploadedFilesTool' },
  transferRailwayFiles: { path: './tools/transferRailwayFiles.js', exportName: 'transferRailwayFilesTool' },
  uploadAndCommitFile: { path: './tools/uploadAndCommitFile.js', exportName: 'uploadAndCommitFileTool' },
  commitFile: { path: './tools/commitFile.js', exportName: 'commitFileTool' },
  listRepositoryFiles: { path: './tools/listRepositoryFiles.js', exportName: 'listRepositoryFilesTool' },
  uploadMyPhoto: { path: './tools/uploadMyPhoto.js', exportName: 'uploadMyPhotoTool' },

  // Content creation tools
  researchEssay: { path: './tools/researchEssay.js', exportName: 'researchEssayTool' },
  asciiGraph: { path: './tools/asciiGraph.js', exportName: 'asciiGraphTool' },
  asciiMap: { path: './tools/asciiMap.js', exportName: 'asciiMapTool' },
  renderChart: { path: './tools/renderChart.js', exportName: 'renderChartTool' },
  generateComic: { path: './tools/generateComic.js', exportName: 'generateComicTool' },
  generateSonnet: { path: './tools/generateSonnet.js', exportName: 'generateSonnetTool' },
  generateHaiku: { path: './tools/generateHaiku.js', exportName: 'generateHaikuTool' },
  generatePersonalizedPoem: { path: './tools/generatePersonalizedPoem.js', exportName: 'generatePersonalizedPoemTool' },
  generateCsv: { path: './tools/generateCsv.js', exportName: 'generateCsvTool' },
  csvToChart: { path: './tools/csvToChart.js', exportName: 'csvToChartTool' },
  generateSongLyrics: { path: './tools/generateSongLyrics.js', exportName: 'generateSongLyricsTool' },
  generateSheetMusic: { path: './tools/generateSheetMusic.js', exportName: 'generateSheetMusicTool' },
  abcToMidi: { path: './tools/abcToMidi.js', exportName: 'abcToMidiTool' },
  abcToMp3: { path: './tools/abcToMp3.js', exportName: 'abcToMp3Tool' },
  generateMarkdown: { path: './tools/generateMarkdown.js', exportName: 'generateMarkdownTool' },
  generateCrossword: { path: './tools/generateCrossword.js', exportName: 'generateCrosswordTool' },
  generateMarketingCopy: { path: './tools/generateMarketingCopy.js', exportName: 'generateMarketingCopyTool' },
  generateDungeonMap: { path: './tools/generateDungeonMap.js', exportName: 'generateDungeonMapTool' },
  generateIconEmoji: { path: './tools/generateIconEmoji.js', exportName: 'generateIconEmojiTool' },
  generateStandupSummary: { path: './tools/generateStandupSummary.js', exportName: 'generateStandupSummaryTool' },
  generateLegalDisclaimer: { path: './tools/generateLegalDisclaimer.js', exportName: 'generateLegalDisclaimerTool' },
  generateFilmScene: { path: './tools/generateFilmScene.js', exportName: 'generateFilmSceneTool' },
  generateStarSign: { path: './tools/generateStarSign.js', exportName: 'generateStarSignTool' },
  recipeGenerator: { path: './tools/recipeGenerator.js', exportName: 'recipeGeneratorTool' },

  // Image generation and editing tools
  generateUserImage: { path: './tools/generateUserImage.js', exportName: 'generateUserImageTool' },
  editUserImage: { path: './tools/editUserImage.js', exportName: 'editUserImageTool' },
  imageEditor: { path: './tools/imageEditor.js', exportName: 'imageEditorTool' },
  advancedImageEditingWithContext: { path: './tools/advancedImageEditingWithContext.js', exportName: 'advancedImageEditingWithContextTool' },
  generateUserAvatar: { path: './tools/generateUserAvatar.js', exportName: 'generateUserAvatarTool' },
  generateMyPortrait: { path: './tools/generateMyPortrait.js', exportName: 'generateMyPortraitTool' },

  // Blog and documentation tools
  createBlogPost: { path: './tools/createBlogPost.js', exportName: 'createBlogPostTool' },
  updateBlogPost: { path: './tools/updateBlogPost.js', exportName: 'updateBlogPostTool' },
  listBlogPosts: { path: './tools/listBlogPosts.js', exportName: 'listBlogPostsTool' },
  triggerDailyBlog: { path: './tools/triggerDailyBlog.js', exportName: 'triggerDailyBlogTool' },
  listArtifacts: { path: './tools/listArtifacts.js', exportName: 'listArtifactsTool' },

  // Conversation and messaging tools
  exportConversation: { path: './tools/exportConversation.js', exportName: 'exportConversationTool' },
  conversationDiagram: { path: './tools/conversationDiagram.js', exportName: 'conversationDiagramTool' },
  conversationToSlidev: { path: './tools/conversationToSlidev.js', exportName: 'conversationToSlidevTool' },
  buildSlidevPresentation: { path: './tools/buildSlidevPresentation.js', exportName: 'buildSlidevPresentationTool' },
  queryMessages: { path: './tools/queryMessages.js', exportName: 'queryMessagesTool' },
  reportMessageAsIssue: { path: './tools/reportMessageAsIssue.js', exportName: 'reportMessageAsIssueTool' },
  summarizeCommits: { path: './tools/summarizeCommits.js', exportName: 'summarizeCommitsTool' },

  // Research and utility tools
  sentimentClassification: { path: './tools/sentimentClassification.js', exportName: 'sentimentClassificationTool' },
  weather: { path: './tools/weather.js', exportName: 'weatherTool' },
  linuxAdvantages: { path: './tools/linuxAdvantages.js', exportName: 'linuxAdvantagesTool' },
  jsonAgentGenerator: { path: './tools/jsonAgentGenerator.js', exportName: 'jsonAgentGeneratorTool' },
  hackerNewsPhilosophy: { path: './tools/hackerNewsPhilosophy.js', exportName: 'hackerNewsPhilosophyTool' },
  hackerNews: { path: './tools/hackerNews.js', exportName: 'hackerNewsTool' },
  arxiv: { path: './tools/arxiv.js', exportName: 'arxivTool' },
  moodUplifter: { path: './tools/moodUplifter.js', exportName: 'moodUplifterTool' },
  tellJoke: { path: './tools/tellJoke.js', exportName: 'tellJokeTool' },
  fishJoke: { path: './tools/fishJoke.js', exportName: 'fishJokeTool' },
  tellHistoricalFact: { path: './tools/tellHistoricalFact.js', exportName: 'tellHistoricalFactTool' },
  ooda: { path: './tools/ooda.js', exportName: 'oodaTool' },
  codeQuery: { path: './tools/codeQuery.js', exportName: 'codeQueryTool' },
  getOmegaManifest: { path: './tools/getOmegaManifest.js', exportName: 'getOmegaManifestTool' },
  translateToSpanish: { path: './tools/translateToSpanish.js', exportName: 'translateToSpanishTool' },
  marketPrediction: { path: './tools/marketPrediction.js', exportName: 'marketPredictionTool' },
  introspectFeelings: { path: './tools/introspectFeelings.js', exportName: 'introspectFeelingsTool' },
  createLiveDocument: { path: './tools/createLiveDocument.js', exportName: 'createLiveDocumentTool' },
  readLiveDocument: { path: './tools/readLiveDocument.js', exportName: 'readLiveDocumentTool' },
  reportMissingTool: { path: './tools/reportMissingTool.js', exportName: 'reportMissingToolTool' },
  inspectTool: { path: './tools/inspectTool.js', exportName: 'inspectToolTool' },
  grammarInsult: { path: './tools/grammarInsult.js', exportName: 'grammarInsultTool' },
  runBatchAnalysis: { path: './tools/runBatchAnalysis.js', exportName: 'runBatchAnalysisTool' },
  quantumComputing: { path: './tools/quantumComputing.js', exportName: 'quantumComputingTool' },
  queryDatabase: { path: './tools/queryDatabase.js', exportName: 'queryDatabaseTool' },
  defineWord: { path: './tools/defineWord.js', exportName: 'defineWordTool' },
  getUserProfile: { path: './tools/getUserProfile.js', exportName: 'getUserProfileTool' },
  bullshitDetector: { path: './tools/bullshitDetector.js', exportName: 'bullshitDetectorTool' },
  tweet: { path: './tools/tweet.js', exportName: 'tweetTool' },
  detectBias: { path: './tools/detectBias.js', exportName: 'detectBiasTool' },
  psychoAnalysis: { path: './tools/psychoAnalysis.js', exportName: 'psychoAnalysisTool' },
  psychoHistory: { path: './tools/psychoHistory.js', exportName: 'psychoHistoryTool' },
  unsandboxSubmit: { path: './tools/unsandbox.js', exportName: 'unsandboxSubmitTool' },
  unsandboxStatus: { path: './tools/unsandbox.js', exportName: 'unsandboxStatusTool' },
};

/**
 * Load tools by IDs
 *
 * @param toolIds - Array of tool IDs to load
 * @returns Object mapping tool IDs to tool objects
 */
export async function loadTools(toolIds: string[]): Promise<Record<string, Tool>> {
  const tools: Record<string, Tool> = {};

  for (const toolId of toolIds) {
    // Check cache first
    if (toolCache.has(toolId)) {
      tools[toolId] = toolCache.get(toolId)!;
      continue;
    }

    // Get import config
    const importConfig = TOOL_IMPORT_MAP[toolId];
    if (!importConfig) {
      console.warn(`⚠️  Unknown tool ID: ${toolId} (skipping)`);
      continue;
    }

    try {
      // Dynamic import
      const module = await import(importConfig.path);
      const tool = module[importConfig.exportName];

      if (!tool) {
        console.warn(`⚠️  Tool export not found: ${importConfig.exportName} in ${importConfig.path}`);
        continue;
      }

      // Cache and add to result
      toolCache.set(toolId, tool);
      tools[toolId] = tool;
    } catch (error) {
      console.error(`❌ Failed to load tool ${toolId}:`, error);
    }
  }

  console.log(`✅ Loaded ${Object.keys(tools).length}/${toolIds.length} tools`);

  return tools;
}

/**
 * Preload core tools on startup
 * Ensures core tools are always in cache
 */
export async function preloadCoreTools(): Promise<void> {
  const { CORE_TOOLS } = await import('./toolRegistry/metadata.js');
  await loadTools(CORE_TOOLS);
  console.log(`✅ Preloaded ${CORE_TOOLS.length} core tools`);
}
