# Schema Registry System Guide

## Overview

The Schema Registry System provides a safe, auditable workflow for requesting and managing database schema changes in the Omega project. This guide explains how to use the system to create new tables and modify existing schemas.

## Quick Start

### 1. Create a Schema Request

Create a JSON file defining your table schema:

```json
{
  "tableName": "my_new_table",
  "owner": "your-team",
  "schemaJson": {
    "tableName": "my_new_table",
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
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "defaultValue": "CURRENT_TIMESTAMP"
      }
    ],
    "indexes": [
      {
        "name": "idx_my_new_table_user_id",
        "columns": ["user_id"]
      }
    ]
  },
  "requestMetadata": {
    "requestedBy": "your-name",
    "justification": "Why this table is needed",
    "relatedIssue": "123",
    "requestedAt": 1701792000
  }
}
```

### 2. Submit the Request via CLI

```bash
cd packages/database
pnpm schema-request create --file path/to/your-schema.json
```

### 3. Review the Migration Preview

```bash
pnpm schema-request migration <registry-id>
```

### 4. Approve and Generate Migration

Once reviewed and approved:

```bash
pnpm schema-request approve <registry-id>
```

Then create a Prisma migration:

```bash
npx prisma migrate dev --name create_my_new_table
```

## Using the API

### Create a Schema Request

```bash
curl -X POST http://localhost:3000/api/schema-requests \
  -H "Content-Type: application/json" \
  -d @your-schema.json
```

### List All Requests

```bash
curl http://localhost:3000/api/schema-requests
```

### Get Request Details

```bash
curl http://localhost:3000/api/schema-requests/<id>
```

### Get Migration Preview

```bash
curl http://localhost:3000/api/schema-requests/<id>/migration
```

### Update Request Status

```bash
curl -X PATCH http://localhost:3000/api/schema-requests/<id> \
  -H "Content-Type: application/json" \
  -d '{"status": "approved", "performedBy": "your-name"}'
```

## Schema Definition Guide

### Required Fields

Every table schema must include:

1. **Primary Key**: Usually UUID with `gen_random_uuid()`
2. **Timestamps**: `created_at` and `updated_at` (TIMESTAMPTZ)
3. **Proper Naming**: lowercase snake_case

### Recommended Column Types

| Use Case | PostgreSQL Type | Notes |
|----------|----------------|-------|
| Primary Keys | UUID | Use `gen_random_uuid()` |
| External IDs | TEXT | Safer than BIGINT for Discord IDs |
| Text Data | TEXT | Preferred over VARCHAR |
| Numbers | INTEGER, REAL | Avoid BIGINT (JS precision issues) |
| Timestamps | TIMESTAMPTZ | Always include timezone |
| Flexible Data | JSONB | Add GIN index for queries |
| Boolean Flags | BOOLEAN | Use descriptive names |

### Index Guidelines

Always index:
- Foreign keys (`user_id`, etc.)
- Timestamp fields used in ORDER BY
- Frequently filtered columns
- JSONB columns (use GIN index)

Example:

```json
"indexes": [
  {
    "name": "idx_table_user_id",
    "columns": ["user_id"],
    "unique": false
  },
  {
    "name": "idx_table_created_at",
    "columns": ["created_at"],
    "unique": false
  },
  {
    "name": "idx_table_metadata",
    "columns": ["metadata"],
    "type": "GIN",
    "unique": false
  }
]
```

## Policy Validation

The system automatically validates schemas against safety policies:

### Errors (Must Fix)
- Missing primary key
- Multiple primary keys
- Invalid naming (not snake_case)
- Dangerous operations in table name

### Warnings (Recommended Fixes)
- Missing `created_at` or `updated_at`
- Using VARCHAR instead of TEXT
- Using BIGINT (JavaScript precision issues)
- Missing indexes on common columns
- JSONB without GIN index
- Wrong timestamp type (use TIMESTAMPTZ)

## Example Schema Requests

Example requests are provided in `packages/database/src/postgres/schemaRegistry/examples/`:

- `caricatures.json` - User caricature images
- `notifications.json` - User notification system

## Workflow

### 1. Development

```bash
# Create schema request
pnpm schema-request create --file examples/caricatures.json

# Review violations and migration
pnpm schema-request show <id>
pnpm schema-request migration <id>

# Approve request
pnpm schema-request approve <id>
```

### 2. Create Prisma Migration

```bash
# Generate Prisma migration
npx prisma migrate dev --name create_caricatures

# This will:
# - Create migration files in prisma/migrations/
# - Update Prisma Client
# - Apply migration to local DB
```

### 3. Review and Test

```bash
# Run type check
pnpm type-check

# Run build
pnpm build

# Test the migration
pnpm test
```

### 4. Create Pull Request

```bash
# Commit changes
git add .
git commit -m "feat: add caricatures table schema

- Add SchemaRegistry and SchemaAudit tables
- Implement policy validation and migration generator
- Create API endpoints for schema requests
- Add caricatures table migration

Related: #676"

# Push and create PR
git push origin your-branch
```

### 5. Deploy

Once PR is merged, the migration will be applied to production via CI/CD:

```bash
# Railway deployment will run:
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && npx prisma migrate deploy'
```

## CLI Commands

### Create Request

```bash
pnpm schema-request create --file <path-to-json>
```

### List Requests

```bash
# All requests
pnpm schema-request list

# Filter by status
pnpm schema-request list --status approved
```

### Show Request

```bash
pnpm schema-request show <id>
```

### Approve/Reject

```bash
pnpm schema-request approve <id>
pnpm schema-request reject <id>
```

### Generate Migration Preview

```bash
pnpm schema-request migration <id>
```

## Best Practices

### 1. Start with Examples

Use the provided examples as templates:
- Copy `examples/caricatures.json`
- Modify for your table
- Run validation

### 2. Review Policy Violations

Always review warnings:
- They highlight potential issues
- Following suggestions improves schema quality
- Errors must be fixed

### 3. Test Locally First

Before submitting to production:
1. Test schema request creation
2. Review migration preview
3. Apply migration locally
4. Test CRUD operations
5. Run full test suite

### 4. Document Your Schema

Add comments to columns:

```json
{
  "name": "user_id",
  "type": "TEXT",
  "nullable": false,
  "comment": "Discord user ID (stored as TEXT to avoid JS precision issues)"
}
```

### 5. Plan for Migration Rollback

Every migration has an automatic rollback:
- Review the DOWN migration
- Ensure it's safe to run
- Test rollback in development

## Troubleshooting

### Issue: Validation Errors

**Problem**: Schema request returns validation errors

**Solution**: Check error messages and fix schema definition
- Ensure primary key exists
- Use snake_case naming
- Fix any type issues

### Issue: Table Already Exists

**Problem**: Schema request rejected because table exists

**Solution**:
1. Check if table is already in schema registry
2. Use `ALTER TABLE` operations instead (not yet supported)
3. Choose a different table name

### Issue: Migration Conflicts

**Problem**: Prisma migration conflicts with existing migrations

**Solution**:
1. Pull latest migrations from main branch
2. Resolve conflicts manually
3. Re-run migration generation

### Issue: BIGINT Precision Warnings

**Problem**: Using BIGINT for external IDs

**Solution**: Use TEXT instead:
```json
{
  "name": "discord_id",
  "type": "TEXT",
  "comment": "Discord snowflake ID (TEXT to avoid JS precision loss)"
}
```

## Security Considerations

### 1. Approval Required

- All schema changes require human review
- No automatic table creation in production
- Audit trail for all changes

### 2. Policy Validation

- Dangerous operations blocked
- Best practices enforced
- Type safety checks

### 3. Audit Trail

Every action is logged:
- Who requested the change
- When it was requested
- What was changed
- Status transitions

### 4. Rollback Support

All migrations include:
- UP migration (apply changes)
- DOWN migration (rollback)
- Idempotent operations (safe to re-run)

## Future Enhancements

Planned improvements:

1. **Auto-Create Mode** (opt-in): Automatic table creation for low-risk tables
2. **GitHub Integration**: Automatic PR creation from schema requests
3. **ALTER TABLE Support**: Modify existing tables safely
4. **Schema Diffing**: Compare schemas across environments
5. **Migration Scheduler**: Schedule migrations for maintenance windows
6. **Performance Monitoring**: Track query performance on new tables

## Related Documentation

- [Database Package README](./packages/database/README.md)
- [Schema Registry README](./packages/database/src/postgres/schemaRegistry/README.md)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Support

For questions or issues:

1. Check this guide and related documentation
2. Review example schema requests
3. Check schema validation output
4. Create a GitHub issue if needed

## Related Issues

- #674: Add PostgreSQL Table for Generated Images
- #676: Create Caricatures Table
- #679: User Affinity and Collaboration Potential Tracking
- #681/#682: Notify Requester When Feature Completes
- #684: Schema Registry System (this implementation)
