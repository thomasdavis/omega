# Schema Registry System

## Overview

The Schema Registry System provides a safe, automated way to extend the database schema dynamically. It allows users to request new tables and fields, which can be automatically created if they meet low-risk criteria.

## Components

### 1. Database Tables

#### `schema_registry`
Central registry of logical schemas.

- `id` - SERIAL PRIMARY KEY
- `name` - VARCHAR(255) NOT NULL UNIQUE
- `description` - TEXT
- `owner` - VARCHAR(255)
- `is_active` - BOOLEAN DEFAULT TRUE
- `created_at` - TIMESTAMPTZ DEFAULT NOW()
- `updated_at` - TIMESTAMPTZ DEFAULT NOW()

#### `schema_fields`
Fields for each registry entry.

- `id` - SERIAL PRIMARY KEY
- `schema_id` - INTEGER NOT NULL REFERENCES schema_registry(id) ON DELETE CASCADE
- `field_name` - VARCHAR(255) NOT NULL
- `field_type` - VARCHAR(64) NOT NULL
- `is_nullable` - BOOLEAN DEFAULT TRUE
- `default_value` - TEXT
- `metadata` - JSONB DEFAULT '{}'
- `created_at` - TIMESTAMPTZ DEFAULT NOW()

#### `schema_requests`
Requested schema changes/approvals.

- `id` - SERIAL PRIMARY KEY
- `requester_user_id` - VARCHAR(255) NOT NULL
- `schema_name` - VARCHAR(255) NOT NULL
- `request_payload` - JSONB NOT NULL
- `status` - VARCHAR(50) DEFAULT 'pending'
- `created_at` - TIMESTAMPTZ DEFAULT NOW()
- `processed_at` - TIMESTAMPTZ NULL

#### `schema_changes_audit`
Audit trail for schema changes.

- `id` - SERIAL PRIMARY KEY
- `schema_id` - INTEGER NULL
- `request_id` - INTEGER NULL
- `change_summary` - TEXT
- `migration_sql` - TEXT
- `applied_by` - VARCHAR(255)
- `applied_at` - TIMESTAMPTZ DEFAULT NOW()

#### `auto_create_log`
Log of auto-created tables and results.

- `id` - SERIAL PRIMARY KEY
- `schema_name` - VARCHAR(255)
- `table_name` - VARCHAR(255)
- `action` - VARCHAR(50) (created/skipped/failed)
- `details` - JSONB
- `created_at` - TIMESTAMPTZ DEFAULT NOW()

#### `notifications`
Notification system for feature completion (from issue #683).

- `id` - SERIAL PRIMARY KEY
- `user_id` - VARCHAR(255) NOT NULL
- `payload` - JSONB NOT NULL
- `delivered` - BOOLEAN DEFAULT FALSE
- `delivery_channel` - VARCHAR(50) DEFAULT 'dm'
- `created_at` - TIMESTAMPTZ DEFAULT NOW()

### 2. API Endpoint

**POST /api/schema-requests**

Create a new schema change request.

**Request Body:**
```json
{
  "requester_user_id": "user123",
  "schema_name": "user_preferences",
  "request_payload": {
    "fields": [
      {
        "name": "preference_key",
        "type": "VARCHAR(255)",
        "nullable": false
      },
      {
        "name": "preference_value",
        "type": "TEXT",
        "nullable": true
      },
      {
        "name": "user_id",
        "type": "VARCHAR(255)",
        "nullable": false
      }
    ],
    "description": "Store user preferences"
  }
}
```

**Validation Rules:**
- `requester_user_id`: Required, non-empty string
- `schema_name`: Required, alphanumeric with underscores, must not conflict with protected tables
- `request_payload.fields`: Required array with at least one field
- Each field must have `name` and `type`
- Field names must be alphanumeric with underscores
- Field types must be in the allowed list (text, varchar, integer, bigint, boolean, jsonb, timestamptz, etc.)

**GET /api/schema-requests**

List schema requests with filtering.

**Query Parameters:**
- `status`: Filter by status (pending, approved, rejected)
- `requester_user_id`: Filter by requester
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

### 3. Auto-Create Worker

Located in `packages/agent/src/services/schemaAutoCreateWorker.ts`

The worker automatically processes pending schema requests and creates tables that meet low-risk criteria.

**Configuration:**

Set environment variable to enable:
```bash
ENABLE_SCHEMA_AUTO_CREATE=true
```

**Low-Risk Criteria:**

A schema request is considered low-risk if:
- Schema name is valid (alphanumeric with underscores)
- Schema name doesn't conflict with protected tables (messages, queries, user_profiles, documents, schema_registry, schema_requests)
- All field types are in the safe list
- No SQL injection patterns in default values
- No foreign key constraints to critical tables

**Safe Field Types:**
- text, varchar
- integer, bigint, serial, bigserial
- boolean
- jsonb
- timestamptz, timestamp, date
- uuid
- real, double precision, numeric

**Protected Tables:**
- messages
- queries
- user_profiles
- documents
- schema_registry
- schema_requests

**Worker Behavior:**

1. Fetches up to 10 pending schema requests
2. Validates each request against low-risk criteria
3. If low-risk:
   - Generates CREATE TABLE SQL
   - Executes SQL to create table
   - Updates request status to 'approved'
   - Logs success to auto_create_log
   - Creates audit trail entry
4. If not low-risk or on failure:
   - Logs reason to auto_create_log
   - Leaves request as 'pending' for manual review

## Migration

Run the migration script to create all tables:

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-schema-registry-tables.sh'
```

After migration, update Prisma schema:

```bash
cd packages/database
pnpm prisma db pull
pnpm prisma generate
```

## Security Considerations

### SQL Injection Prevention

1. **Input Validation:**
   - Schema names: `^[a-zA-Z_][a-zA-Z0-9_]*$`
   - Field names: `^[a-zA-Z_][a-zA-Z0-9_]*$`
   - Field types: Whitelist of allowed PostgreSQL types
   - Default values: Pattern matching to detect SQL keywords

2. **Parameterized Queries:**
   - API uses Prisma's parameterized queries
   - Worker uses raw SQL but validates all inputs

3. **Rate Limiting:**
   - TODO: Implement rate limiting on API endpoint
   - TODO: Add authentication/authorization

4. **Protected Tables:**
   - Critical tables cannot be referenced or overwritten
   - Worker skips requests that conflict with protected tables

## Future Enhancements

1. **Authentication & Authorization:**
   - Add user authentication to API endpoint
   - Implement role-based access control (admin approval for high-risk changes)

2. **Rate Limiting:**
   - Add rate limiting to prevent abuse
   - Throttle schema request creation per user

3. **Notifications:**
   - Integrate with notifications table to alert requesters when tables are created
   - Send DM notifications via Discord when requests are processed

4. **Advanced Features:**
   - Support for indexes, constraints, and relationships
   - Schema versioning and migration history
   - Schema deletion/deprecation workflow
   - Automated testing of created schemas

5. **Monitoring:**
   - Dashboard for viewing schema requests and auto_create_log
   - Metrics on auto-create success/failure rates
   - Alerts for failed auto-creates

## Related Issues

- #683: DB migration & API for notifying requesters when features complete
- #684: Simplify & Make Database Schema Extensible

## Example Usage

### Request a New Table

```bash
curl -X POST http://localhost:3000/api/schema-requests \
  -H "Content-Type: application/json" \
  -d '{
    "requester_user_id": "user123",
    "schema_name": "user_activity_log",
    "request_payload": {
      "fields": [
        { "name": "activity_type", "type": "VARCHAR(100)", "nullable": false },
        { "name": "activity_data", "type": "JSONB", "nullable": true },
        { "name": "user_id", "type": "VARCHAR(255)", "nullable": false }
      ],
      "description": "Log user activity for analytics"
    }
  }'
```

### List Pending Requests

```bash
curl http://localhost:3000/api/schema-requests?status=pending
```

### Run Worker Manually

```typescript
import { processSchemaRequests } from './packages/agent/src/services/schemaAutoCreateWorker';

// Ensure ENABLE_SCHEMA_AUTO_CREATE=true is set
await processSchemaRequests();
```

## Testing

Run unit tests:

```bash
# Test API endpoint
pnpm test apps/web/app/api/schema-requests/route.test.ts

# Test worker
pnpm test packages/agent/src/services/schemaAutoCreateWorker.test.ts
```

Note: Tests are currently placeholders and need full implementation.
