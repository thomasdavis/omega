/**
 * Database Adapter
 * Feature flag system for gradual PostgreSQL migration
 *
 * Environment Variables:
 * - USE_POSTGRES_PRIMARY=true - Use PostgreSQL for all operations
 * - USE_POSTGRES_READ=true - Use PostgreSQL for reads, SQLite for writes
 * - USE_POSTGRES_SHADOW=true - Dual-write to both databases
 */

import * as libsqlMessageService from './libsql/messageService.js';
import * as libsqlQueryService from './libsql/queryService.js';
import * as libsqlDocumentService from './libsql/documentService.js';
import * as libsqlUserProfileService from './libsql/userProfileService.js';

import * as pgMessageService from './postgres/messageService.js';
import * as pgQueryService from './postgres/queryService.js';
import * as pgDocumentService from './postgres/documentService.js';
import * as pgUserProfileService from './postgres/userProfileService.js';

/**
 * Database mode configuration
 */
export const DB_CONFIG = {
  // Primary database: PostgreSQL when true, SQLite when false
  usePrimaryPostgres: process.env.USE_POSTGRES_PRIMARY === 'true',

  // Read operations: PostgreSQL when true, SQLite when false
  usePostgresRead: process.env.USE_POSTGRES_READ === 'true',

  // Shadow mode: Dual-write to both databases for validation
  useShadowWrite: process.env.USE_POSTGRES_SHADOW === 'true',
};

console.log('📊 Database Configuration:', {
  primary: DB_CONFIG.usePrimaryPostgres ? 'PostgreSQL' : 'SQLite',
  reads: DB_CONFIG.usePostgresRead ? 'PostgreSQL' : 'SQLite',
  shadowWrites: DB_CONFIG.useShadowWrite ? 'enabled' : 'disabled',
});

/**
 * Wrap write operations with optional shadow writing
 */
async function shadowWrite<T>(
  operation: () => Promise<T>,
  shadowOperation?: () => Promise<any>
): Promise<T> {
  const result = await operation();

  if (DB_CONFIG.useShadowWrite && shadowOperation) {
    // Fire and forget shadow write
    shadowOperation().catch((error) => {
      console.error('Shadow write failed:', error);
    });
  }

  return result;
}

// ============================================================================
// MESSAGE SERVICE
// ============================================================================

export const messageService = {
  saveHumanMessage: async (params: Parameters<typeof libsqlMessageService.saveHumanMessage>[0]) => {
    if (DB_CONFIG.usePrimaryPostgres) {
      return shadowWrite(
        () => pgMessageService.saveHumanMessage(params),
        () => libsqlMessageService.saveHumanMessage(params)
      );
    } else {
      return shadowWrite(
        () => libsqlMessageService.saveHumanMessage(params),
        DB_CONFIG.useShadowWrite ? () => pgMessageService.saveHumanMessage(params) : undefined
      );
    }
  },

  saveAIMessage: async (params: Parameters<typeof libsqlMessageService.saveAIMessage>[0]) => {
    if (DB_CONFIG.usePrimaryPostgres) {
      return shadowWrite(
        () => pgMessageService.saveAIMessage(params),
        () => libsqlMessageService.saveAIMessage(params)
      );
    } else {
      return shadowWrite(
        () => libsqlMessageService.saveAIMessage(params),
        DB_CONFIG.useShadowWrite ? () => pgMessageService.saveAIMessage(params) : undefined
      );
    }
  },

  saveToolExecution: async (params: Parameters<typeof libsqlMessageService.saveToolExecution>[0]) => {
    if (DB_CONFIG.usePrimaryPostgres) {
      return shadowWrite(
        () => pgMessageService.saveToolExecution(params),
        () => libsqlMessageService.saveToolExecution(params)
      );
    } else {
      return shadowWrite(
        () => libsqlMessageService.saveToolExecution(params),
        DB_CONFIG.useShadowWrite ? () => pgMessageService.saveToolExecution(params) : undefined
      );
    }
  },

  queryMessages: (DB_CONFIG.usePrimaryPostgres || DB_CONFIG.usePostgresRead)
    ? pgMessageService.queryMessages
    : libsqlMessageService.queryMessages,

  getMessageById: (DB_CONFIG.usePrimaryPostgres || DB_CONFIG.usePostgresRead)
    ? pgMessageService.getMessageById
    : libsqlMessageService.getMessageById,

  getMessageCount: (DB_CONFIG.usePrimaryPostgres || DB_CONFIG.usePostgresRead)
    ? pgMessageService.getMessageCount
    : libsqlMessageService.getMessageCount,
};

// ============================================================================
// QUERY SERVICE
// ============================================================================

export const queryService = {
  saveQuery: async (params: Parameters<typeof libsqlQueryService.saveQuery>[0]) => {
    if (DB_CONFIG.usePrimaryPostgres) {
      return shadowWrite(
        () => pgQueryService.saveQuery(params),
        () => libsqlQueryService.saveQuery(params)
      );
    } else {
      return shadowWrite(
        () => libsqlQueryService.saveQuery(params),
        DB_CONFIG.useShadowWrite ? () => pgQueryService.saveQuery(params) : undefined
      );
    }
  },

  getRecentQueries: (DB_CONFIG.usePrimaryPostgres || DB_CONFIG.usePostgresRead)
    ? pgQueryService.getRecentQueries
    : libsqlQueryService.getRecentQueries,

  getQueryById: (DB_CONFIG.usePrimaryPostgres || DB_CONFIG.usePostgresRead)
    ? pgQueryService.getQueryById
    : libsqlQueryService.getQueryById,

  getQueryCount: (DB_CONFIG.usePrimaryPostgres || DB_CONFIG.usePostgresRead)
    ? pgQueryService.getQueryCount
    : libsqlQueryService.getQueryCount,
};

// ============================================================================
// DOCUMENT SERVICE
// ============================================================================

export const documentService = {
  createDocument: async (params: Parameters<typeof libsqlDocumentService.createDocument>[0]) => {
    if (DB_CONFIG.usePrimaryPostgres) {
      return shadowWrite(
        () => pgDocumentService.createDocument(params),
        () => libsqlDocumentService.createDocument(params)
      );
    } else {
      return shadowWrite(
        () => libsqlDocumentService.createDocument(params),
        DB_CONFIG.useShadowWrite ? () => pgDocumentService.createDocument(params) : undefined
      );
    }
  },

  getDocument: (DB_CONFIG.usePrimaryPostgres || DB_CONFIG.usePostgresRead)
    ? pgDocumentService.getDocument
    : libsqlDocumentService.getDocument,

  updateDocumentContent: async (id: string, content: string) => {
    if (DB_CONFIG.usePrimaryPostgres) {
      return shadowWrite(
        () => pgDocumentService.updateDocumentContent(id, content),
        () => libsqlDocumentService.updateDocumentContent(id, content)
      );
    } else {
      return shadowWrite(
        () => libsqlDocumentService.updateDocumentContent(id, content),
        DB_CONFIG.useShadowWrite ? () => pgDocumentService.updateDocumentContent(id, content) : undefined
      );
    }
  },

  updateDocumentTitle: async (id: string, title: string) => {
    if (DB_CONFIG.usePrimaryPostgres) {
      return shadowWrite(
        () => pgDocumentService.updateDocumentTitle(id, title),
        () => libsqlDocumentService.updateDocumentTitle(id, title)
      );
    } else {
      return shadowWrite(
        () => libsqlDocumentService.updateDocumentTitle(id, title),
        DB_CONFIG.useShadowWrite ? () => pgDocumentService.updateDocumentTitle(id, title) : undefined
      );
    }
  },

  deleteDocument: async (id: string) => {
    if (DB_CONFIG.usePrimaryPostgres) {
      return shadowWrite(
        () => pgDocumentService.deleteDocument(id),
        () => libsqlDocumentService.deleteDocument(id)
      );
    } else {
      return shadowWrite(
        () => libsqlDocumentService.deleteDocument(id),
        DB_CONFIG.useShadowWrite ? () => pgDocumentService.deleteDocument(id) : undefined
      );
    }
  },

  listDocuments: (DB_CONFIG.usePrimaryPostgres || DB_CONFIG.usePostgresRead)
    ? pgDocumentService.listDocuments
    : libsqlDocumentService.listDocuments,

  getDocumentCount: (DB_CONFIG.usePrimaryPostgres || DB_CONFIG.usePostgresRead)
    ? pgDocumentService.getDocumentCount
    : libsqlDocumentService.getDocumentCount,

  addCollaborator: async (params: Parameters<typeof libsqlDocumentService.addCollaborator>[0]) => {
    if (DB_CONFIG.usePrimaryPostgres) {
      return shadowWrite(
        () => pgDocumentService.addCollaborator(params),
        () => libsqlDocumentService.addCollaborator(params)
      );
    } else {
      return shadowWrite(
        () => libsqlDocumentService.addCollaborator(params),
        DB_CONFIG.useShadowWrite ? () => pgDocumentService.addCollaborator(params) : undefined
      );
    }
  },

  removeCollaborator: async (documentId: string, userId: string) => {
    if (DB_CONFIG.usePrimaryPostgres) {
      return shadowWrite(
        () => pgDocumentService.removeCollaborator(documentId, userId),
        () => libsqlDocumentService.removeCollaborator(documentId, userId)
      );
    } else {
      return shadowWrite(
        () => libsqlDocumentService.removeCollaborator(documentId, userId),
        DB_CONFIG.useShadowWrite ? () => pgDocumentService.removeCollaborator(documentId, userId) : undefined
      );
    }
  },

  getDocumentCollaborators: (DB_CONFIG.usePrimaryPostgres || DB_CONFIG.usePostgresRead)
    ? pgDocumentService.getDocumentCollaborators
    : libsqlDocumentService.getDocumentCollaborators,

  hasDocumentAccess: (DB_CONFIG.usePrimaryPostgres || DB_CONFIG.usePostgresRead)
    ? pgDocumentService.hasDocumentAccess
    : libsqlDocumentService.hasDocumentAccess,
};

// ============================================================================
// USER PROFILE SERVICE
// ============================================================================

export const userProfileService = {
  getUserProfile: (DB_CONFIG.usePrimaryPostgres || DB_CONFIG.usePostgresRead)
    ? pgUserProfileService.getUserProfile
    : libsqlUserProfileService.getUserProfile,

  createUserProfile: async (userId: string, username: string) => {
    if (DB_CONFIG.usePrimaryPostgres) {
      return shadowWrite(
        () => pgUserProfileService.createUserProfile(userId, username),
        () => libsqlUserProfileService.createUserProfile(userId, username)
      );
    } else {
      return shadowWrite(
        () => libsqlUserProfileService.createUserProfile(userId, username),
        DB_CONFIG.useShadowWrite ? () => pgUserProfileService.createUserProfile(userId, username) : undefined
      );
    }
  },

  updateUserProfile: async (userId: string, updates: Parameters<typeof libsqlUserProfileService.updateUserProfile>[1]) => {
    if (DB_CONFIG.usePrimaryPostgres) {
      return shadowWrite(
        () => pgUserProfileService.updateUserProfile(userId, updates),
        () => libsqlUserProfileService.updateUserProfile(userId, updates)
      );
    } else {
      return shadowWrite(
        () => libsqlUserProfileService.updateUserProfile(userId, updates),
        DB_CONFIG.useShadowWrite ? () => pgUserProfileService.updateUserProfile(userId, updates) : undefined
      );
    }
  },

  getOrCreateUserProfile: async (userId: string, username: string) => {
    if (DB_CONFIG.usePrimaryPostgres) {
      return pgUserProfileService.getOrCreateUserProfile(userId, username);
    } else {
      return libsqlUserProfileService.getOrCreateUserProfile(userId, username);
    }
  },

  getUsersNeedingAnalysis: (DB_CONFIG.usePrimaryPostgres || DB_CONFIG.usePostgresRead)
    ? pgUserProfileService.getUsersNeedingAnalysis
    : libsqlUserProfileService.getUsersNeedingAnalysis,

  saveAnalysisHistory: async (
    userId: string,
    feelingsSnapshot: string,
    personalitySnapshot: string,
    messageCount: number,
    changesSummary?: string
  ) => {
    if (DB_CONFIG.usePrimaryPostgres) {
      return shadowWrite(
        () => pgUserProfileService.saveAnalysisHistory(userId, feelingsSnapshot, personalitySnapshot, messageCount, changesSummary),
        () => libsqlUserProfileService.saveAnalysisHistory(userId, feelingsSnapshot, personalitySnapshot, messageCount, changesSummary)
      );
    } else {
      return shadowWrite(
        () => libsqlUserProfileService.saveAnalysisHistory(userId, feelingsSnapshot, personalitySnapshot, messageCount, changesSummary),
        DB_CONFIG.useShadowWrite
          ? () => pgUserProfileService.saveAnalysisHistory(userId, feelingsSnapshot, personalitySnapshot, messageCount, changesSummary)
          : undefined
      );
    }
  },

  getAnalysisHistory: (DB_CONFIG.usePrimaryPostgres || DB_CONFIG.usePostgresRead)
    ? pgUserProfileService.getAnalysisHistory
    : libsqlUserProfileService.getAnalysisHistory,

  incrementMessageCount: async (userId: string) => {
    if (DB_CONFIG.usePrimaryPostgres) {
      return shadowWrite(
        () => pgUserProfileService.incrementMessageCount(userId),
        () => libsqlUserProfileService.incrementMessageCount(userId)
      );
    } else {
      return shadowWrite(
        () => libsqlUserProfileService.incrementMessageCount(userId),
        DB_CONFIG.useShadowWrite ? () => pgUserProfileService.incrementMessageCount(userId) : undefined
      );
    }
  },

  getAllUserProfiles: (DB_CONFIG.usePrimaryPostgres || DB_CONFIG.usePostgresRead)
    ? pgUserProfileService.getAllUserProfiles
    : libsqlUserProfileService.getAllUserProfiles,
};
