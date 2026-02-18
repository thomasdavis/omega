/**
 * @repo/database - Database Package
 * Exports all database clients, schemas, and services
 */

// MongoDB
export { getMongoDatabase } from './mongodb/client.js';
export * from './mongodb/tools/index.js';

// PostgreSQL
export { getPostgresPool, closePostgresPool } from './postgres/client.js';
export { prisma, getPrismaClient, connectPrisma, disconnectPrisma } from './postgres/prismaClient.js';
export * from './postgres/tools/index.js';

// Todo List CRUD tools
export { createTodoTool, listTodosTool, getTodoTool, updateTodoTool, deleteTodoTool } from './postgres/tools/todoList/index.js';

// User Feelings tools
export { logFeelingTool, queryFeelingsTool, getFeelingSummaryTool } from './postgres/tools/userFeelings/index.js';

// Guild Defaults tools
export { setDefaultGuildTool, getDefaultGuildTool } from './postgres/tools/guildDefaults/index.js';

// Guild Defaults service
export { getDefaultGuildId } from './postgres/guildDefaultsService.js';

// Backward compatibility: getDatabase now returns PostgreSQL pool
export { getPostgresPool as getDatabase } from './postgres/client.js';

// PostgreSQL Services (main exports)
export * as pgMessageService from './postgres/messageService.js';
export * as pgQueryService from './postgres/queryService.js';
export * as pgDocumentService from './postgres/documentService.js';
export * as pgUserProfileService from './postgres/userProfileService.js';
export * as pgMusicService from './postgres/musicService.js';
export * as pgImageService from './postgres/imageService.js';
export * as newImageService from './postgres/newImageService.js';
export * as pgBuildFailureIssueService from './postgres/buildFailureIssueService.js';
export * as pgComicService from './postgres/comicService.js';
export * as pgConversationService from './postgres/conversationService.js';
export * as pgDecisionLogService from './postgres/decisionLogService.js';
export * as pgBannedUsersService from './postgres/bannedUsersService.js';
export * as pgAntigravityRoastsService from './postgres/antigravityRoastsService.js';
export * as pgTweetLogService from './postgres/tweetLogService.js';
export * as pgApiUsageLogService from './postgres/apiUsageLogService.js';
export * as pgGuildDefaultsService from './postgres/guildDefaultsService.js';

// Schema Registry
export * from './postgres/schemaRegistry/index.js';

// Export individual document service functions for backward compatibility
export {
  createDocument,
  getDocument,
  updateDocumentContent,
  updateDocumentTitle,
  deleteDocument,
  listDocuments,
  getDocumentCount,
  addCollaborator,
  removeCollaborator,
  getDocumentCollaborators,
  hasDocumentAccess,
} from './postgres/documentService.js';

// PostgreSQL Schema
export { initializePostgresSchema } from './postgres/migrations/runMigration.js';

// Export schema types
export type {
  MessageRecord,
  QueryRecord,
  DocumentRecord,
  DocumentCollaboratorRecord,
  UserProfileRecord,
  UserAnalysisHistoryRecord,
} from './postgres/schema.js';

// Export user profile service functions for backward compatibility
export {
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  getOrCreateUserProfile,
  getUsersNeedingAnalysis,
  saveAnalysisHistory,
  getAnalysisHistory,
  incrementMessageCount,
  getAllUserProfiles,
} from './postgres/userProfileService.js';

// Export message service functions for backward compatibility
export {
  saveHumanMessage,
  saveAIMessage,
  saveToolExecution,
  queryMessages,
  getMessageById,
  getMessageCount,
} from './postgres/messageService.js';

// Export query service functions for backward compatibility
export {
  saveQuery,
  getRecentQueries,
  getQueryById,
  getQueryCount,
} from './postgres/queryService.js';

// Export music service functions for backward compatibility
export {
  saveAbcSheetMusic,
  getAbcSheetMusic,
  listAbcSheetMusic,
  getAbcSheetMusicCount,
  saveMidiFile,
  getMidiFile,
  listMidiFiles,
  getMidiFileCount,
  getMidiFileMetadata,
  listMidiFilesMetadata,
  saveMp3File,
  getMp3File,
  listMp3Files,
  getMp3FileCount,
  getMp3FileMetadata,
  listMp3FilesMetadata,
  saveVideoFile,
  getVideoFile,
  listVideoFiles,
  getVideoFileCount,
  getVideoFileMetadata,
  listVideoFilesMetadata,
} from './postgres/musicService.js';

// Export music service types
export type {
  AbcSheetMusicRecord,
  CreateAbcSheetMusicInput,
  MidiFileRecord,
  CreateMidiFileInput,
  Mp3FileRecord,
  CreateMp3FileInput,
  VideoFileRecord,
  CreateVideoFileInput,
} from './postgres/musicService.js';

// Export image service functions for backward compatibility
export {
  saveGeneratedImage,
  getGeneratedImage,
  listGeneratedImages,
  getGeneratedImageCount,
  getGeneratedImageMetadata,
  listGeneratedImagesMetadata,
  listGeneratedImagesByUser,
  listGeneratedImagesByTool,
  listFailedGeneratedImages,
} from './postgres/imageService.js';

// Export image service types
export type {
  GeneratedImageRecord,
  CreateGeneratedImageInput,
} from './postgres/imageService.js';

// Export build failure issue service functions for backward compatibility
export {
  hasIssueForMessage,
  recordBuildFailureIssue,
  getIssueForMessage,
  listRecentBuildFailureIssues,
} from './postgres/buildFailureIssueService.js';

// Export build failure issue service types
export type {
  BuildFailureIssueRecord,
} from './postgres/buildFailureIssueService.js';

// Export comic service functions for backward compatibility
export {
  saveComicImage,
  getComicImage,
  listComicImages,
  listComicImagesMetadata,
  getComicImageCount,
  deleteComicImage,
  comicImageExists,
} from './postgres/comicService.js';

// Export comic service types
export type {
  ComicImageRecord,
  CreateComicImageInput,
  ComicImageMetadata,
} from './postgres/comicService.js';

// Export spatial service (PostGIS)
export * as pgSpatialService from './postgres/spatialService.js';
export {
  saveLocationMention,
  findLocationsNearby,
  findNearestLocations,
  findLocationsInBoundingBox,
  calculateDistance,
  getUserLocationMentions,
  getSpatialStatistics,
  isPostGISAvailable,
} from './postgres/spatialService.js';

export type {
  LocationPoint,
  ProximityResult,
  BoundingBox,
} from './postgres/spatialService.js';

// Export conversation service functions
export {
  createConversation,
  getOrCreateConversation,
  addMessageToConversation,
  getConversationMessages,
  getUserConversations,
  getConversationStats,
  getRecentConversations,
  deleteOldConversations,
} from './postgres/conversationService.js';

// Export decision log service functions
export {
  logDecision,
  queryDecisionLogs,
  getUserDecisionLogs,
  getRecentDecisionLogs,
  countDecisionLogs,
  searchDecisionLogs,
} from './postgres/decisionLogService.js';

// Export decision log service types
export type {
  DecisionLogRecord,
  LogDecisionParams,
} from './postgres/decisionLogService.js';

// Export banned users service functions
export {
  logBan,
  getUserBans,
  getRecentBans,
  getBansByKeyword,
  countBans,
} from './postgres/bannedUsersService.js';

// Export banned users service types
export type {
  BannedUserLogRecord,
  LogBanParams,
} from './postgres/bannedUsersService.js';

// Export antigravity roasts service functions
export {
  logAntigravityRoast,
  getUserRoasts,
  getRecentRoasts,
  getRoastsByKeyword,
  countRoasts,
  getAverageGenerationTime,
} from './postgres/antigravityRoastsService.js';

// Export antigravity roasts service types
export type {
  AntigravityRoastRecord,
  LogAntigravityRoastParams,
} from './postgres/antigravityRoastsService.js';

// Export tweet log service functions
export {
  logTweet,
  updateTweetLog,
  queryTweetLogs,
  getUserTweetLogs,
  getRecentTweetLogs,
  countTweetLogs,
  searchTweetLogs,
  getUserTweetStats,
} from './postgres/tweetLogService.js';

// Export tweet log service types
export type {
  TweetLogRecord,
  LogTweetParams,
} from './postgres/tweetLogService.js';

// Export API usage log service functions
export {
  logApiUsage,
  getRecentApiUsageLogs,
  getApiUsageByKeyPrefix,
  getApiUsageStats,
  countApiUsageLogs,
} from './postgres/apiUsageLogService.js';

// Export API usage log service types
export type {
  ApiUsageLogRecord,
  LogApiUsageParams,
} from './postgres/apiUsageLogService.js';

// Export guild defaults service functions
export {
  setGuildDefault,
  getGuildDefault,
  removeGuildDefault,
  listGuildDefaults,
} from './postgres/guildDefaultsService.js';

// Export guild defaults service types
export type {
  GuildDefaultRecord,
  SetGuildDefaultParams,
} from './postgres/guildDefaultsService.js';

// Database Adapter (PostgreSQL-only after migration)
export {
  messageService,
  queryService,
  documentService,
  userProfileService,
  DB_CONFIG,
} from './adapter.js';
