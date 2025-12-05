# Database Migration Documentation for Issues #683, #690, #676

This document provides database schema specifications and migration SQL for three features requiring database tables.

## Issue #683: Notify requesters when feature completes

**Tables Required:** `user_notifications`, `user_preferences`

### Migration Script
Location: `packages/database/scripts/create-notifications-tables.sh`

### Running the Migration
```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-notifications-tables.sh'
```

### Table: user_notifications
Stores notification records for users.

**Columns:**
- `id` (UUID, PRIMARY KEY) - Unique identifier
- `user_id` (TEXT, NOT NULL) - Discord user ID
- `username` (TEXT) - Discord username
- `notification_type` (TEXT, NOT NULL) - Type of notification (feature_complete, mention, etc.)
- `title` (TEXT, NOT NULL) - Notification title
- `message` (TEXT, NOT NULL) - Notification message content
- `related_issue` (TEXT) - Related GitHub issue number
- `related_pr` (TEXT) - Related GitHub PR number
- `is_read` (BOOLEAN, NOT NULL, DEFAULT false) - Read status
- `sent_at` (TIMESTAMPTZ) - When notification was sent
- `read_at` (TIMESTAMPTZ) - When notification was read
- `metadata` (JSONB) - Additional notification data
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT CURRENT_TIMESTAMP)

**Indexes:**
- `idx_notifications_user_id` ON (user_id)
- `idx_notifications_user_unread` ON (user_id, is_read)
- `idx_notifications_created_at` ON (created_at DESC)
- `idx_notifications_type` ON (notification_type)

### Table: user_preferences
Stores user notification preferences.

**Columns:**
- `id` (UUID, PRIMARY KEY) - Unique identifier
- `user_id` (TEXT, NOT NULL, UNIQUE) - Discord user ID
- `username` (TEXT) - Discord username
- `notify_feature_complete` (BOOLEAN, DEFAULT true) - Enable feature completion notifications
- `notify_mentions` (BOOLEAN, DEFAULT true) - Enable mention notifications
- `notify_pr_updates` (BOOLEAN, DEFAULT true) - Enable PR update notifications
- `notification_channel` (TEXT, DEFAULT 'discord') - Preferred notification channel
- `preferences` (JSONB) - Additional preferences
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT CURRENT_TIMESTAMP)

**Indexes:**
- `idx_user_preferences_user_id` ON (user_id)

### Reference Files
- Schema example: `packages/database/src/postgres/schemaRegistry/examples/notifications.json`
- Migration script: `packages/database/scripts/create-notifications-tables.sh`

---

## Issue #690: Persist generateUserImage outputs

**Table Required:** `generated_images`

### Status
✅ **Table already exists in production!**

The `generated_images` table was created previously and is already being used by the `generateUserImage` tool.

### Current Schema

**Table: generated_images**

**Columns:**
- `id` (SERIAL, PRIMARY KEY) - Auto-incrementing ID
- `title` (TEXT, NOT NULL) - Image title
- `description` (TEXT) - Image description
- `image_data` (BYTEA) - Binary image data
- `prompt` (TEXT, NOT NULL) - Generation prompt
- `revised_prompt` (TEXT) - Revised prompt from AI
- `tool_used` (TEXT, NOT NULL) - Tool that generated the image
- `model_used` (TEXT) - AI model used
- `filename` (TEXT, NOT NULL) - Filename
- `file_size` (INTEGER) - File size in bytes
- `artifact_path` (TEXT) - Local file path
- `public_url` (TEXT) - Public URL for image
- `width` (INTEGER) - Image width in pixels
- `height` (INTEGER) - Image height in pixels
- `format` (TEXT, DEFAULT 'png') - Image format
- `metadata` (JSONB) - Additional metadata
- `created_by` (TEXT) - Creator user ID
- `created_by_username` (TEXT) - Creator username
- `discord_message_id` (TEXT) - Related Discord message
- `github_issue_number` (INTEGER) - Related GitHub issue
- `created_at` (TIMESTAMPTZ(6), NOT NULL, DEFAULT CURRENT_TIMESTAMP)

**Indexes:**
- `idx_generated_images_created_at` ON (created_at DESC)
- `idx_generated_images_created_by` ON (created_by)
- `idx_generated_images_tool_used` ON (tool_used)
- `idx_generated_images_model_used` ON (model_used)

### No Migration Needed
The table is fully functional and ready to use. No migration required.

### Reference Files
- Migration script (already run): `packages/database/scripts/create-generated-images-table.sh`
- Tool implementation: `packages/agent/src/tools/generateUserImage.ts`
- Prisma model: `packages/database/prisma/schema.prisma` (lines 370-398)

---

## Issue #676: Caricatures table

**Table Required:** `caricatures`

### Migration Script
Location: `packages/database/scripts/create-caricatures-table.sh`

### Running the Migration
```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-caricatures-table.sh'
```

### Table: caricatures
Stores AI-generated caricature images for users.

**Columns:**
- `id` (UUID, PRIMARY KEY) - Unique identifier
- `user_id` (TEXT, NOT NULL) - Discord user ID
- `username` (TEXT) - Discord username at time of creation
- `image_url` (TEXT, NOT NULL) - URL to stored caricature image
- `description` (TEXT) - AI-generated description of caricature style
- `style` (TEXT) - Artistic style used
- `source_photo_url` (TEXT) - URL to original source photo
- `metadata` (JSONB) - Additional metadata (model version, parameters, etc.)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT CURRENT_TIMESTAMP)

**Indexes:**
- `idx_caricatures_user_id` ON (user_id)
- `idx_caricatures_created_at` ON (created_at DESC)
- `idx_caricatures_metadata` ON (metadata) USING GIN - For efficient JSONB queries

### Metadata Schema Example
```json
{
  "exaggerationLevel": "moderate",
  "generatedWith": "gemini-3-pro-image-preview",
  "affinityScore": 85,
  "trustLevel": 92,
  "personalityTraits": ["adventurous", "creative"],
  "githubUrl": "https://github.com/...",
  "localPath": "/uploads/caricature-..."
}
```

### Reference Files
- Schema example: `packages/database/src/postgres/schemaRegistry/examples/caricatures.json`
- Tool implementation: `packages/agent/src/tools/generateCaricature.ts`
- Migration script: `packages/database/scripts/create-caricatures-table.sh`

---

## Post-Migration Steps

After running any migration, update the Prisma schema:

```bash
cd packages/database
export DATABASE_URL="postgresql://postgres:<password>@switchback.proxy.rlwy.net:11820/railway"
pnpm prisma db pull
pnpm prisma generate
```

This ensures the Prisma client is synchronized with the database schema.

---

## Summary

| Issue | Tables | Status | Migration Script |
|-------|--------|--------|------------------|
| #683 | `user_notifications`, `user_preferences` | ⏳ Needs migration | `create-notifications-tables.sh` |
| #690 | `generated_images` | ✅ Already exists | N/A |
| #676 | `caricatures` | ⏳ Needs migration | `create-caricatures-table.sh` |

---

Generated as part of issue #727 - Database migration documentation follow-up.
