/**
 * @repo/database - Database Package
 * Exports all database clients, schemas, and services
 */

// LibSQL
export { getDatabase, initializeDatabase, closeDatabase } from './libsql/client.js';
export { initializeSchema } from './libsql/schema.js';
export * from './libsql/schema.js';
export * from './libsql/messageService.js';
export * from './libsql/documentService.js';
export * from './libsql/userProfileService.js';
export * from './libsql/queryService.js';

// MongoDB
export { getMongoDatabase } from './mongodb/client.js';
export * from './mongodb/tools/index.js';

// PostgreSQL
export { getPostgresPool } from './postgres/client.js';
export * from './postgres/tools/index.js';

// PostgreSQL Services (exported with 'pg' prefix to avoid conflicts)
export * as pgMessageService from './postgres/messageService.js';
export * as pgQueryService from './postgres/queryService.js';
export * as pgDocumentService from './postgres/documentService.js';
export * as pgUserProfileService from './postgres/userProfileService.js';

// Migration tools
export { initializePostgresSchema } from './postgres/migrations/runMigration.js';
export { exportAllTables } from './migrations/exportFromSQLite.js';
export { importAllTables } from './migrations/importToPostgres.js';

// Database Adapter (feature flag system for PostgreSQL migration)
export {
  messageService,
  queryService,
  documentService,
  userProfileService,
  DB_CONFIG,
} from './adapter.js';
