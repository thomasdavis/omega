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
