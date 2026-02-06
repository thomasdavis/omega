# Shellmates.app Integration

This document describes the Shellmates.app integration for the Omega Discord bot.

## Overview

Shellmates.app is a cybersecurity platform for Capture The Flag (CTF) competitions and security challenges. This integration allows the bot to:

- Query user profiles and statistics
- Browse available challenges
- Check leaderboard rankings
- Track user challenge completions

## Database Schema

### Tables

#### `shellmates_profiles`
Stores user profile data from Shellmates.app.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| shellmates_user_id | VARCHAR(255) | Unique Shellmates user ID |
| username | VARCHAR(255) | Shellmates username |
| discord_user_id | VARCHAR(255) | Linked Discord user ID (optional) |
| discord_username | VARCHAR(255) | Linked Discord username (optional) |
| level | INT | User level |
| rank | INT | User rank |
| points | INT | Total points |
| challenges_completed | INT | Number of challenges solved |
| profile_url | TEXT | URL to user profile |
| profile_data | JSONB | Additional profile metadata |
| last_synced_at | TIMESTAMPTZ | Last time profile was synced |
| created_at | TIMESTAMPTZ | Record creation time |
| updated_at | TIMESTAMPTZ | Record update time |

**Indexes:**
- Unique index on `shellmates_user_id`
- Indexes on `username`, `discord_user_id`, `rank`, `level`, `created_at`
- GIN index on `profile_data` for JSONB queries

#### `shellmates_challenges`
Stores challenge data from Shellmates.app.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| shellmates_challenge_id | VARCHAR(255) | Unique challenge ID (unique) |
| title | VARCHAR(500) | Challenge title |
| category | VARCHAR(100) | Challenge category (web, crypto, pwn, etc.) |
| difficulty | VARCHAR(50) | Difficulty level (easy, medium, hard) |
| points | INT | Points awarded for solving |
| solved_count | INT | Number of users who solved it |
| description | TEXT | Challenge description |
| challenge_data | JSONB | Additional challenge metadata |
| last_synced_at | TIMESTAMPTZ | Last time challenge was synced |
| created_at | TIMESTAMPTZ | Record creation time |
| updated_at | TIMESTAMPTZ | Record update time |

**Indexes:**
- Unique constraint on `shellmates_challenge_id`
- Indexes on `category`, `difficulty`, `points`, `created_at`

#### `shellmates_user_challenges`
Tracks which challenges users have completed.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| profile_id | INT | Foreign key to `shellmates_profiles` |
| challenge_id | INT | Foreign key to `shellmates_challenges` |
| solved_at | TIMESTAMPTZ | When challenge was solved |
| solve_time_seconds | INT | Time taken to solve (if available) |
| metadata | JSONB | Additional solve metadata |
| created_at | TIMESTAMPTZ | Record creation time |

**Indexes:**
- Unique constraint on `(profile_id, challenge_id)`
- Indexes on `profile_id`, `challenge_id`, `solved_at`
- Foreign keys with CASCADE delete

## Running the Migration

### Via Railway CLI

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-shellmates-integration-table.sh'
```

### Via Direct SQL

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" < packages/database/scripts/create-shellmates-integration-table.sh'
```

### Verify Migration

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name LIKE '\''shellmates_%'\''
ORDER BY table_name, ordinal_position;
"'
```

## Environment Variables

Add these to your `.env` file:

```bash
# Shellmates.app Configuration
SHELLMATES_API_KEY=your_api_key_here
SHELLMATES_API_URL=https://api.shellmates.app  # Optional, defaults to this
```

**Note:** The actual Shellmates.app API URL and authentication method may differ. Update the service configuration once the real API documentation is available.

## Usage

### Via Discord Bot

Once deployed, users can interact with Shellmates.app through the Discord bot:

```
@omega get my shellmates profile
@omega show me crypto challenges on shellmates
@omega who's on the shellmates leaderboard?
```

The AI will automatically use the `shellmates` tool when appropriate.

### Tool Actions

The `shellmatesTool` supports three actions:

1. **getUserProfile** - Fetch user statistics
   ```typescript
   {
     action: 'getUserProfile',
     username: 'someuser'
   }
   ```

2. **getChallenges** - Browse challenges
   ```typescript
   {
     action: 'getChallenges',
     category: 'web',      // Optional: web, crypto, pwn, reverse, etc.
     difficulty: 'medium',  // Optional: easy, medium, hard
     limit: 20              // Optional: max results (default 10)
   }
   ```

3. **getLeaderboard** - View top users
   ```typescript
   {
     action: 'getLeaderboard',
     limit: 10  // Optional: number of users (default 10)
   }
   ```

## API Service

The Shellmates service (`/packages/agent/src/services/shellmatesService.ts`) provides three main functions:

- `getShellmatesUser(username: string)` - Fetch user profile
- `getShellmatesChallenges(options)` - List challenges with filters
- `getShellmatesLeaderboard(limit)` - Get top users

All functions return a `ShellmatesApiResult<T>` with:
- `success: boolean`
- `data?: T` (on success)
- `error?: string` (on failure)

## Updating Prisma Schema

After running the migration, update the Prisma schema:

```bash
cd packages/database
pnpm prisma db pull
pnpm prisma generate
```

This ensures the Prisma client has the latest schema definitions.

## Implementation Notes

1. **Flexible API Endpoints**: The current implementation uses placeholder API endpoints. Update `/packages/agent/src/services/shellmatesService.ts` with actual Shellmates.app API endpoints once documentation is available.

2. **Authentication**: The service uses Bearer token authentication. Adjust if Shellmates.app uses a different auth method (OAuth, API key header, etc.).

3. **Rate Limiting**: Add rate limiting if needed based on Shellmates.app API limits.

4. **Caching**: Consider implementing caching for frequently accessed data (leaderboards, challenge lists) to reduce API calls.

5. **Webhooks**: Future enhancement could include webhook support for real-time updates when users solve challenges.

## Troubleshooting

### Migration Issues

If the migration fails, check:
1. DATABASE_URL is set correctly
2. Railway CLI is authenticated (`railway login`)
3. Proper permissions on the database

### API Issues

If API calls fail:
1. Verify `SHELLMATES_API_KEY` is set
2. Check API endpoint URLs in `shellmatesService.ts`
3. Review Shellmates.app API documentation for changes
4. Check logs for specific error messages

## Future Enhancements

- [ ] Add webhook support for real-time challenge solve notifications
- [ ] Implement caching layer for challenge lists and leaderboards
- [ ] Add Discord user linking to Shellmates profiles
- [ ] Create visualization for user progress over time
- [ ] Add team/group challenge tracking
- [ ] Implement notifications for new challenges
- [ ] Add filtering by time range for leaderboards

## References

- Shellmates.app Website: https://www.shellmates.app/
- Tool Implementation: `/packages/agent/src/tools/shellmates.ts`
- Service Implementation: `/packages/agent/src/services/shellmatesService.ts`
- Migration Script: `/packages/database/scripts/create-shellmates-integration-table.sh`
- Prisma Schema: `/packages/database/prisma/schema.prisma`
