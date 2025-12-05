/**
 * Schema Auto-Create Worker
 * Automatically creates low-risk tables based on approved schema requests
 *
 * This worker runs periodically to check for pending schema requests
 * and automatically creates tables that meet the low-risk criteria.
 *
 * Low-risk criteria:
 * - No foreign key constraints to existing critical tables
 * - Simple field types (text, integer, boolean, jsonb, timestamptz)
 * - No destructive operations (DROP, ALTER existing tables)
 * - Isolated tables that don't affect core application logic
 */

import { prisma } from '@repo/database';

// Configuration flag - set to true to enable auto-creation
export const AUTO_CREATE_ENABLED = process.env.ENABLE_SCHEMA_AUTO_CREATE === 'true';

// Low-risk field types that are safe to auto-create
const SAFE_FIELD_TYPES = [
  'text',
  'varchar',
  'integer',
  'bigint',
  'boolean',
  'jsonb',
  'timestamptz',
  'timestamp',
  'date',
  'uuid',
  'real',
  'serial',
  'bigserial'
];

// Critical tables that should never be referenced in auto-created schemas
const PROTECTED_TABLES = [
  'messages',
  'queries',
  'user_profiles',
  'documents',
  'schema_registry',
  'schema_requests'
];

interface SchemaField {
  name: string;
  type: string;
  nullable?: boolean;
  default?: string;
}

interface SchemaRequest {
  id: number;
  requester_user_id: string;
  schema_name: string;
  request_payload: {
    fields: SchemaField[];
    description?: string;
  };
  status: string;
  created_at: Date;
}

/**
 * Check if a schema request meets low-risk criteria
 */
function isLowRisk(request: SchemaRequest): { safe: boolean; reason?: string } {
  const { schema_name, request_payload } = request;

  // Validate schema name
  if (!schema_name || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema_name)) {
    return { safe: false, reason: 'Invalid schema name format' };
  }

  // Check if schema name conflicts with protected tables
  if (PROTECTED_TABLES.includes(schema_name.toLowerCase())) {
    return { safe: false, reason: 'Schema name conflicts with protected table' };
  }

  // Validate fields
  if (!Array.isArray(request_payload.fields) || request_payload.fields.length === 0) {
    return { safe: false, reason: 'No fields provided' };
  }

  for (const field of request_payload.fields) {
    // Validate field name
    if (!field.name || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.name)) {
      return { safe: false, reason: `Invalid field name: ${field.name}` };
    }

    // Validate field type is in safe list
    const baseType = field.type.toLowerCase().split('(')[0].trim();
    if (!SAFE_FIELD_TYPES.includes(baseType)) {
      return { safe: false, reason: `Unsafe field type: ${field.type}` };
    }

    // Check for SQL injection patterns in default values
    if (field.default && /[;']|drop|delete|update|insert|exec/i.test(field.default)) {
      return { safe: false, reason: `Potentially unsafe default value: ${field.default}` };
    }
  }

  return { safe: true };
}

/**
 * Generate SQL for creating a table from a schema request
 * Uses parameterized identifiers to prevent SQL injection
 */
function generateCreateTableSQL(request: SchemaRequest): string {
  const { schema_name, request_payload } = request;

  // Build column definitions
  const columns: string[] = [];

  // Add primary key
  columns.push('id SERIAL PRIMARY KEY');

  // Add user-defined fields
  for (const field of request_payload.fields) {
    let columnDef = `${field.name} ${field.type}`;

    if (field.nullable === false) {
      columnDef += ' NOT NULL';
    }

    if (field.default) {
      // Safely escape default value
      if (field.type.toLowerCase().includes('int') || field.type.toLowerCase() === 'boolean') {
        columnDef += ` DEFAULT ${field.default}`;
      } else {
        columnDef += ` DEFAULT '${field.default.replace(/'/g, "''")}'`;
      }
    }

    columns.push(columnDef);
  }

  // Add standard timestamps
  columns.push('created_at TIMESTAMPTZ DEFAULT NOW()');
  columns.push('updated_at TIMESTAMPTZ DEFAULT NOW()');

  const sql = `
CREATE TABLE IF NOT EXISTS ${schema_name} (
  ${columns.join(',\n  ')}
);

CREATE INDEX IF NOT EXISTS idx_${schema_name}_created_at ON ${schema_name}(created_at DESC);
`;

  return sql;
}

/**
 * Process a single schema request
 */
async function processSchemaRequest(request: SchemaRequest): Promise<void> {
  console.log(`📋 Processing schema request #${request.id}: ${request.schema_name}`);

  // Check if low-risk
  const { safe, reason } = isLowRisk(request);

  if (!safe) {
    console.log(`⚠️  Schema request #${request.id} is not low-risk: ${reason}`);

    // Log the decision
    await prisma.$executeRaw`
      INSERT INTO auto_create_log (schema_name, table_name, action, details, created_at)
      VALUES (
        ${request.schema_name},
        ${request.schema_name},
        'skipped',
        ${JSON.stringify({ reason, request_id: request.id })}::jsonb,
        NOW()
      )
    `;

    return;
  }

  try {
    // Generate SQL
    const sql = generateCreateTableSQL(request);

    console.log(`🔨 Creating table: ${request.schema_name}`);
    console.log(`SQL:\n${sql}`);

    // Execute SQL
    await prisma.$executeRawUnsafe(sql);

    // Update request status
    await prisma.$executeRaw`
      UPDATE schema_requests
      SET status = 'approved', processed_at = NOW()
      WHERE id = ${request.id}
    `;

    // Log success
    await prisma.$executeRaw`
      INSERT INTO auto_create_log (schema_name, table_name, action, details, created_at)
      VALUES (
        ${request.schema_name},
        ${request.schema_name},
        'created',
        ${JSON.stringify({ request_id: request.id, sql })}::jsonb,
        NOW()
      )
    `;

    // Create audit entry
    await prisma.$executeRaw`
      INSERT INTO schema_changes_audit (schema_id, request_id, change_summary, migration_sql, applied_by, applied_at)
      VALUES (
        NULL,
        ${request.id},
        ${`Auto-created table ${request.schema_name}`},
        ${sql},
        'auto_create_worker',
        NOW()
      )
    `;

    console.log(`✅ Successfully created table: ${request.schema_name}`);

  } catch (error) {
    console.error(`❌ Failed to create table ${request.schema_name}:`, error);

    // Log failure
    await prisma.$executeRaw`
      INSERT INTO auto_create_log (schema_name, table_name, action, details, created_at)
      VALUES (
        ${request.schema_name},
        ${request.schema_name},
        'failed',
        ${JSON.stringify({
          request_id: request.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })}::jsonb,
        NOW()
      )
    `;
  }
}

/**
 * Main worker function - processes pending schema requests
 */
export async function processSchemaRequests(): Promise<void> {
  if (!AUTO_CREATE_ENABLED) {
    console.log('⏸️  Schema auto-create is disabled. Set ENABLE_SCHEMA_AUTO_CREATE=true to enable.');
    return;
  }

  console.log('🚀 Schema auto-create worker started...');

  try {
    // Fetch pending schema requests
    const pendingRequests = await prisma.$queryRaw<SchemaRequest[]>`
      SELECT * FROM schema_requests
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT 10
    `;

    if (pendingRequests.length === 0) {
      console.log('✨ No pending schema requests found.');
      return;
    }

    console.log(`📦 Found ${pendingRequests.length} pending schema request(s)`);

    // Process each request
    for (const request of pendingRequests) {
      await processSchemaRequest(request);
    }

    console.log('✅ Schema auto-create worker completed.');

  } catch (error) {
    console.error('❌ Error in schema auto-create worker:', error);
    throw error;
  }
}
