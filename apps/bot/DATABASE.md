# Database Integration - Message and Query Storage

This document describes the persistent SQLite database integration using Turso for storing all bot interactions.

## Overview

The bot now automatically persists all messages, AI responses, tool executions, and user queries to a SQLite database. This enables:

- **Full conversation history** - Never lose track of what was discussed
- **Natural language querying** - Ask questions about past conversations
- **Web interface** - Browse messages and queries through a beautiful UI
- **Analytics** - Track tool usage, response patterns, and more

## Database Schema

### Messages Table

Stores all messages from humans, AI, and tool executions:

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,              -- UUID
  timestamp INTEGER NOT NULL,       -- Unix timestamp (ms)
  sender_type TEXT NOT NULL,        -- 'human', 'ai', or 'tool'
  user_id TEXT,                     -- Discord user ID
  username TEXT,                    -- Discord username
  channel_id TEXT,                  -- Discord channel ID
  channel_name TEXT,                -- Channel name
  guild_id TEXT,                    -- Discord server/guild ID
  message_content TEXT NOT NULL,    -- The actual message
  tool_name TEXT,                   -- Tool name (for tool executions)
  tool_args TEXT,                   -- Tool arguments (JSON)
  tool_result TEXT,                 -- Tool result (JSON)
  session_id TEXT,                  -- Optional session grouping
  parent_message_id TEXT,           -- Link to parent message
  metadata TEXT,                    -- Additional metadata (JSON)
  created_at INTEGER                -- Creation timestamp
)
```

**Indexes:**
- `timestamp` (DESC) - For chronological queries
- `user_id` - For user-specific queries
- `sender_type` - Filter by message type
- `channel_id` - Filter by channel
- `session_id` - Group related conversations

**Full-Text Search:**
- FTS5 virtual table on `message_content`, `tool_name`, and `username`
- Supports advanced text search queries

### Queries Table

Stores all natural language queries and their results:

```sql
CREATE TABLE queries (
  id TEXT PRIMARY KEY,              -- UUID
  timestamp INTEGER NOT NULL,       -- Unix timestamp (ms)
  user_id TEXT NOT NULL,            -- User who made the query
  username TEXT NOT NULL,           -- Username
  query_text TEXT NOT NULL,         -- Original natural language query
  translated_sql TEXT,              -- Generated SQL query
  ai_summary TEXT,                  -- AI-generated summary of results
  query_result TEXT,                -- Query results (JSON)
  result_count INTEGER,             -- Number of results
  error TEXT,                       -- Error message (if failed)
  execution_time_ms INTEGER,        -- Query execution time
  created_at INTEGER                -- Creation timestamp
)
```

**Indexes:**
- `timestamp` (DESC) - For chronological queries
- `user_id` - For user-specific queries

## Configuration

### Local SQLite (Default)

By default, the bot uses a local SQLite file:

- **Development:** `apps/bot/data/omega.db`
- **Production (Railway):** `/data/omega.db` (persistent volume)

No configuration needed - it works out of the box!

### Turso Cloud (Optional)

For distributed, serverless SQLite across multiple regions:

1. Sign up at [https://turso.tech](https://turso.tech)
2. Create a database
3. Get your database URL and auth token
4. Add to `.env`:

```bash
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token
```

The bot will automatically use Turso if these variables are set.

## Using the Query Tool

The bot includes a natural language query tool accessible via the AI agent.

### Example Queries

```
"Show me all messages from user123 in the last 24 hours"
"Find messages containing 'python'"
"Show me all tool executions from yesterday"
"What did I ask about JavaScript last week?"
"Show me AI responses in the #general channel"
"Find all messages where I mentioned 'bug'"
```

### How It Works

1. User asks a question in Discord
2. AI translates natural language → SQL
3. Query executes safely (SELECT only)
4. AI summarizes the results
5. Everything is stored in the `queries` table

### Security

- **Only SELECT queries allowed** - No INSERT, UPDATE, DELETE, DROP
- **Validation** - Automatic rejection of unsafe operations
- **Sandboxed** - Database operations are isolated

## Web Interface

Browse messages and queries through beautiful web interfaces:

### Messages Browser
- **URL:** `http://your-server:3001/messages`
- **Features:**
  - Full-text search
  - Filter by user, channel, sender type
  - Pagination
  - Beautiful cards for each message
  - Shows tool executions inline

### Queries Browser
- **URL:** `http://your-server:3001/queries`
- **Features:**
  - View all executed queries
  - See AI summaries
  - View generated SQL (expandable)
  - Execution time tracking
  - Error messages for failed queries

### Home Gallery
- **URL:** `http://your-server:3001/`
- Updated with links to Messages and Queries browsers

## API Usage

### Message Service

```typescript
import {
  saveHumanMessage,
  saveAIMessage,
  saveToolExecution,
  queryMessages,
  getMessageCount
} from './database/messageService.js';

// Save a human message
await saveHumanMessage({
  userId: '123456789',
  username: 'john_doe',
  channelId: 'channel-id',
  channelName: 'general',
  messageContent: 'Hello, world!',
  messageId: 'discord-msg-id'
});

// Query messages
const messages = await queryMessages({
  userId: '123456789',
  limit: 50,
  searchText: 'python'
});

// Get count
const count = await getMessageCount({
  channelId: 'channel-id'
});
```

### Query Service

```typescript
import {
  saveQuery,
  getRecentQueries,
  getQueryCount
} from './database/queryService.js';

// Save a query
await saveQuery({
  userId: '123456789',
  username: 'john_doe',
  queryText: 'Find messages about Python',
  translatedSql: 'SELECT * FROM messages WHERE ...',
  aiSummary: 'Found 15 messages...',
  resultCount: 15,
  executionTimeMs: 42
});

// Get recent queries
const queries = await getRecentQueries({
  userId: '123456789',
  limit: 20
});
```

### Database Client

```typescript
import {
  initializeDatabase,
  getDatabase,
  closeDatabase
} from './database/client.js';

// Initialize (done automatically on startup)
initializeDatabase();

// Get client for custom queries
const db = getDatabase();
const result = await db.execute('SELECT * FROM messages LIMIT 10');

// Close connection (done automatically on shutdown)
await closeDatabase();
```

## Schema Initialization

The database schema is automatically created on first startup. The following is created:

1. **messages table** with indexes
2. **messages_fts** FTS5 virtual table for full-text search
3. **Triggers** to keep FTS table in sync
4. **queries table** with indexes

No manual migration required!

## Performance Considerations

### Indexes

Indexes are created on frequently queried fields:
- `timestamp` - Most queries are chronological
- `user_id` - User-specific filters
- `channel_id` - Channel-specific filters
- `sender_type` - Message type filters

### Full-Text Search

FTS5 provides fast full-text search on message content:
- Supports phrase queries
- Boolean operators (AND, OR, NOT)
- Proximity queries
- Prefix matching

### Pagination

Web interfaces use offset-based pagination:
- Default: 50 items per page
- Adjustable via query parameters

## Troubleshooting

### Database not initializing

Check logs for:
```
🗄️  Connecting to Turso cloud database...
✅ Connected to Turso cloud database
```

or

```
🗄️  Using local SQLite database: /path/to/omega.db
✅ Connected to local SQLite database
```

### Permission errors

For Railway deployment, ensure `/data` volume is mounted with write permissions.

### Turso connection errors

Verify:
1. `TURSO_DATABASE_URL` is correct
2. `TURSO_AUTH_TOKEN` is valid
3. Network allows connections to `*.turso.io`

### Database file not persisting

On Railway, ensure:
1. Volume is mounted at `/data`
2. `NODE_ENV=production` is set
3. `/data` directory has write permissions

## Backup and Migration

### Local SQLite Backup

```bash
# Copy database file
cp apps/bot/data/omega.db apps/bot/data/omega-backup.db

# Or on Railway volume
docker exec container-id cp /data/omega.db /data/omega-backup.db
```

### Export to JSON

```typescript
import { queryMessages } from './database/messageService.js';
import { writeFileSync } from 'fs';

const messages = await queryMessages({ limit: 10000 });
writeFileSync('messages-export.json', JSON.stringify(messages, null, 2));
```

### Turso Backups

Turso provides automatic backups. See [Turso docs](https://docs.turso.tech/features/backups) for details.

## Future Enhancements

Potential improvements:

1. **Analytics Dashboard** - Visualize message patterns, tool usage
2. **Export Tools** - Export conversations to various formats
3. **Advanced Search** - Regex, date ranges, complex filters
4. **Conversation Threading** - Better linking of related messages
5. **Retention Policies** - Automatic cleanup of old messages
6. **Real-time Updates** - WebSocket updates to web interface

## Resources

- [Turso Documentation](https://docs.turso.tech/)
- [LibSQL Client](https://github.com/libsql/libsql-client-ts)
- [SQLite FTS5](https://www.sqlite.org/fts5.html)
- [Railway Volumes](https://docs.railway.app/guides/volumes)

---

**Last Updated:** 2025-11-20
