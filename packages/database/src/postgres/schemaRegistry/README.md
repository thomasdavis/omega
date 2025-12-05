# Schema Registry System

A robust, safe, and extensible database schema management system that enables controlled dynamic table and field creation with built-in safeguards, policy validation, and audit trails.

## Overview

The Schema Registry provides a complete workflow for requesting, reviewing, approving, and migrating database schema changes. It includes:

- **Schema Registry Table**: Tracks all schema change requests and their approval status
- **Schema Audit Table**: Records all schema changes with full auditability
- **Policy Validation**: Enforces best practices and prevents dangerous operations
- **Migration Generator**: Automatically generates idempotent SQL migrations
- **API Endpoints**: RESTful API for schema requests and approvals
- **Type Safety**: Full TypeScript support with Zod validation

## Features

### 1. Schema Request Workflow

1. **Submit Request**: Create a schema request with table definition
2. **Policy Validation**: Automatic validation against safety policies
3. **Review**: Human review of schema changes
4. **Approval**: Approve or reject schema changes
5. **Migration**: Generate and apply SQL migrations
6. **Audit**: Full audit trail of all changes

### 2. Safety Policies

The system enforces several safety policies:

- **Primary Key Required**: All tables must have a primary key
- **Timestamp Recommendations**: Suggests `created_at` and `updated_at` columns
- **Type Safety**: Warns about JavaScript-unsafe types (e.g., BIGINT)
- **Naming Conventions**: Enforces snake_case naming
- **Index Recommendations**: Suggests indexes for common query patterns
- **JSONB Indexing**: Recommends GIN indexes for JSONB columns
- **Dangerous Operations**: Prevents accidental destructive changes

### 3. Type Mapping Guidance

Recommended PostgreSQL types:

- **UUID**: Primary keys for domain tables (use `gen_random_uuid()`)
- **TEXT**: String data (preferred over VARCHAR)
- **BIGINT**: Large integers (⚠️ requires BigInt handling in JavaScript)
- **TIMESTAMPTZ**: All timestamps (preserves timezone)
- **JSONB**: Flexible structured data (add GIN index)
- **REAL/FLOAT**: Floating-point numbers

### 4. Audit and Logging

Every schema change is recorded:

- Who requested the change
- When it was requested
- Justification and related issue
- Approval/rejection status
- SQL executed (for migrations)
- Success/failure status

## API Reference

### POST /api/schema-requests

Create a new schema request.

**Request Body:**

```json
{
  "tableName": "caricatures",
  "owner": "omega-bot",
  "schemaJson": {
    "tableName": "caricatures",
    "columns": [
      {
        "name": "id",
        "type": "UUID",
        "primaryKey": true,
        "nullable": false,
        "defaultValue": "gen_random_uuid()"
      },
      {
        "name": "user_id",
        "type": "TEXT",
        "nullable": false
      },
      {
        "name": "username",
        "type": "TEXT",
        "nullable": true
      },
      {
        "name": "image_url",
        "type": "TEXT",
        "nullable": false
      },
      {
        "name": "description",
        "type": "TEXT",
        "nullable": true
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "defaultValue": "CURRENT_TIMESTAMP"
      }
    ],
    "indexes": [
      {
        "name": "idx_caricatures_user_id",
        "columns": ["user_id"]
      },
      {
        "name": "idx_caricatures_created_at",
        "columns": ["created_at"]
      }
    ]
  },
  "requestMetadata": {
    "requestedBy": "omega",
    "requestedByUsername": "omega-bot",
    "justification": "Store user caricature images",
    "relatedIssue": "676",
    "requestedAt": 1701792000
  }
}
```

**Response:**

```json
{
  "success": true,
  "registryId": "550e8400-e29b-41d4-a716-446655440000",
  "violations": [
    {
      "severity": "warning",
      "message": "Table is missing updated_at timestamp column",
      "suggestion": "Add updated_at TIMESTAMPTZ for tracking changes"
    }
  ],
  "migrationPreview": {
    "fileName": "20231205_120000_create_caricatures",
    "upSql": "-- Migration SQL here",
    "downSql": "-- Rollback SQL here"
  }
}
```

### GET /api/schema-requests

List all schema requests with optional filtering.

**Query Parameters:**

- `status`: Filter by status (draft, requested, approved, migrated, rejected)
- `limit`: Number of results (default: 50)
- `offset`: Offset for pagination (default: 0)

**Response:**

```json
{
  "requests": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "tableName": "caricatures",
      "status": "requested",
      "createdAt": "1701792000"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

### GET /api/schema-requests/:id

Get details of a specific schema request.

### PATCH /api/schema-requests/:id

Update schema request status.

**Request Body:**

```json
{
  "status": "approved",
  "performedBy": "admin-user"
}
```

### GET /api/schema-requests/:id/migration

Get migration preview for a schema request.

### GET /api/schema-requests/:id/audit

Get audit history for a table.

## Usage Examples

### Example 1: Creating an Images Table

```typescript
import { SchemaRegistryService } from '@repo/database';

const result = await SchemaRegistryService.createSchemaRequest({
  tableName: 'generated_images',
  owner: 'omega-bot',
  schemaJson: {
    tableName: 'generated_images',
    columns: [
      {
        name: 'id',
        type: 'UUID',
        primaryKey: true,
        nullable: false,
        defaultValue: 'gen_random_uuid()',
      },
      {
        name: 'user_id',
        type: 'TEXT',
        nullable: false,
      },
      {
        name: 'image_url',
        type: 'TEXT',
        nullable: false,
      },
      {
        name: 'prompt',
        type: 'TEXT',
        nullable: false,
      },
      {
        name: 'metadata',
        type: 'JSONB',
        nullable: true,
      },
      {
        name: 'created_at',
        type: 'TIMESTAMPTZ',
        nullable: false,
        defaultValue: 'CURRENT_TIMESTAMP',
      },
      {
        name: 'updated_at',
        type: 'TIMESTAMPTZ',
        nullable: false,
        defaultValue: 'CURRENT_TIMESTAMP',
      },
    ],
    indexes: [
      { name: 'idx_generated_images_user_id', columns: ['user_id'] },
      { name: 'idx_generated_images_created_at', columns: ['created_at'] },
      {
        name: 'idx_generated_images_metadata',
        columns: ['metadata'],
        type: 'GIN',
      },
    ],
  },
  requestMetadata: {
    requestedBy: 'omega',
    justification: 'Store AI-generated images',
    relatedIssue: '674',
    requestedAt: Date.now() / 1000,
  },
});

if (result.success) {
  console.log('Schema request created:', result.registryId);
  console.log('Warnings:', result.violations);
}
```

### Example 2: Generating Migration Preview

```typescript
const preview = await SchemaRegistryService.generateMigrationPreview(registryId);

console.log('Migration file:', preview.fileName);
console.log('Up SQL:', preview.upSql);
console.log('Down SQL:', preview.downSql);
```

### Example 3: Approving a Schema Request

```typescript
await SchemaRegistryService.updateSchemaRequestStatus(
  registryId,
  'approved',
  'admin-user'
);
```

## Policy Guidelines

### Required Elements

- **Primary Key**: Every table must have a primary key
  - Prefer UUID with `gen_random_uuid()` for new domain tables
  - BIGSERIAL/SERIAL acceptable for simple tables

- **Timestamps**: Tables should include:
  - `created_at TIMESTAMPTZ` with default `CURRENT_TIMESTAMP`
  - `updated_at TIMESTAMPTZ` with default `CURRENT_TIMESTAMP`

- **Naming**: Use lowercase `snake_case` for:
  - Table names (plural: `user_profiles`, not `UserProfile`)
  - Column names (`user_id`, not `userId`)
  - Index names (`idx_tablename_columnname`)

### Type Recommendations

- Use `TEXT` instead of `VARCHAR` for flexibility
- Use `TIMESTAMPTZ` instead of `TIMESTAMP` for timezone support
- Use `JSONB` for structured/flexible data (add GIN index)
- Avoid `BIGINT` for external IDs; use `TEXT` instead (e.g., Discord IDs)

### Indexing Strategy

Automatically index these common columns:

- `user_id`
- `created_at`
- `updated_at`
- Foreign key columns
- JSONB columns (use GIN index)

## Migration Workflow

1. **Create Request**: Submit schema request via API
2. **Review Policy Violations**: Address any errors
3. **Generate Migration**: Preview SQL migration
4. **Create PR**: Open GitHub PR with migration files
5. **Review**: Team reviews the PR
6. **Merge**: PR is merged
7. **CI/CD**: Automated tests run migrations in test DB
8. **Deploy**: Apply migration to production

## Security Considerations

- **No Auto-Creation by Default**: Tables are not created automatically
- **Approval Required**: All schema changes require human approval
- **Audit Trail**: Every change is logged
- **Policy Validation**: Dangerous operations are blocked
- **Rate Limiting**: Schema requests can be rate-limited
- **Role-Based Access**: Only authorized users can approve migrations

## Future Enhancements

Potential improvements for v2:

1. **Auto-Create Mode**: Optional mode for low-risk tables (opt-in)
2. **CLI Tool**: Command-line interface for schema requests
3. **GitHub Integration**: Automatic PR creation from schema requests
4. **Schema Diffing**: Compare schema changes between versions
5. **Rollback Automation**: One-click schema rollbacks
6. **Performance Analytics**: Track query performance on new tables
7. **Schema Validation**: Validate against production schema
8. **Multi-Environment Support**: Different schemas per environment

## Troubleshooting

### Common Issues

**Issue**: Primary key violation
**Solution**: Ensure exactly one column has `primaryKey: true`

**Issue**: BIGINT precision warning
**Solution**: Use TEXT for external IDs or handle BigInt properly in JavaScript

**Issue**: Table already exists
**Solution**: Check schema registry for existing requests

**Issue**: Invalid column name
**Solution**: Use lowercase snake_case names

## Related Issues

- #674: Add PostgreSQL Table for Generated Images
- #676: Create Caricatures Table
- #679: User Affinity and Collaboration Potential Tracking
- #681/#682: Notify Requester When Feature Completes

## Contributing

When adding new features to the schema registry:

1. Update types in `types.ts`
2. Add policy validation in `policyValidator.ts`
3. Update migration generator if needed
4. Add API endpoints for new functionality
5. Update this documentation
6. Add tests for new features
