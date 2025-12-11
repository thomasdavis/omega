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
} from './postgres/musicService.js';

// Export music service types
export type {
  AbcSheetMusicRecord,
  CreateAbcSheetMusicInput,
  MidiFileRecord,
  CreateMidiFileInput,
  Mp3FileRecord,
  CreateMp3FileInput,
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

// Export GeoGuessr service functions
export {
  saveGeoGuess,
  getGeoGuessesByUser,
  getLatestGeoGuess,
  getAllGeoGuesses,
  getGeoGuessCount,
} from './postgres/geoGuessService.js';

// Export GeoGuessr service types
export type {
  GeoGuessRecord,
  CreateGeoGuessInput,
} from './postgres/geoGuessService.js';

// Database Adapter (PostgreSQL-only after migration)
export {
  messageService,
  queryService,
  documentService,
  userProfileService,
  DB_CONFIG,
} from './adapter.js';
