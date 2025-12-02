/**
 * Database Adapter
 * PostgreSQL-only (SQLite migration complete)
 */

import * as pgMessageService from './postgres/messageService.js';
import * as pgQueryService from './postgres/queryService.js';
import * as pgDocumentService from './postgres/documentService.js';
import * as pgUserProfileService from './postgres/userProfileService.js';

/**
 * Database mode configuration
 */
export const DB_CONFIG = {
  usePrimaryPostgres: true,
  usePostgresRead: true,
  useShadowWrite: false,
};

console.log('📊 Database Configuration: PostgreSQL (SQLite migration complete)');

// ============================================================================
// MESSAGE SERVICE
// ============================================================================

export const messageService = {
  saveHumanMessage: pgMessageService.saveHumanMessage,
  saveAIMessage: pgMessageService.saveAIMessage,
  saveToolExecution: pgMessageService.saveToolExecution,
  queryMessages: pgMessageService.queryMessages,
  getMessageById: pgMessageService.getMessageById,
  getMessageCount: pgMessageService.getMessageCount,
};

// ============================================================================
// QUERY SERVICE
// ============================================================================

export const queryService = {
  saveQuery: pgQueryService.saveQuery,
  getRecentQueries: pgQueryService.getRecentQueries,
  getQueryById: pgQueryService.getQueryById,
  getQueryCount: pgQueryService.getQueryCount,
};

// ============================================================================
// DOCUMENT SERVICE
// ============================================================================

export const documentService = {
  createDocument: pgDocumentService.createDocument,
  getDocument: pgDocumentService.getDocument,
  updateDocumentContent: pgDocumentService.updateDocumentContent,
  updateDocumentTitle: pgDocumentService.updateDocumentTitle,
  deleteDocument: pgDocumentService.deleteDocument,
  listDocuments: pgDocumentService.listDocuments,
  getDocumentCount: pgDocumentService.getDocumentCount,
  addCollaborator: pgDocumentService.addCollaborator,
  removeCollaborator: pgDocumentService.removeCollaborator,
  getDocumentCollaborators: pgDocumentService.getDocumentCollaborators,
  hasDocumentAccess: pgDocumentService.hasDocumentAccess,
};

// ============================================================================
// USER PROFILE SERVICE
// ============================================================================

export const userProfileService = {
  getUserProfile: pgUserProfileService.getUserProfile,
  createUserProfile: pgUserProfileService.createUserProfile,
  updateUserProfile: pgUserProfileService.updateUserProfile,
  getOrCreateUserProfile: pgUserProfileService.getOrCreateUserProfile,
  getUsersNeedingAnalysis: pgUserProfileService.getUsersNeedingAnalysis,
  saveAnalysisHistory: pgUserProfileService.saveAnalysisHistory,
  getAnalysisHistory: pgUserProfileService.getAnalysisHistory,
  incrementMessageCount: pgUserProfileService.incrementMessageCount,
  getAllUserProfiles: pgUserProfileService.getAllUserProfiles,
};
