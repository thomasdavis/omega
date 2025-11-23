# Collaborative Documents Feature

## Overview

The Omega bot now includes a Google Docs-like collaborative document editing feature that allows multiple users to work on the same document in real-time.

## Features

- ✅ Create and manage collaborative documents
- ✅ Real-time editing with Pusher WebSockets
- ✅ **CRDT-based conflict resolution using Yjs**
- ✅ **Operational transformation for multi-user editing**
- ✅ **Two editor options:**
  - **Affine Editor (BlockSuite)**: Rich block-based editor with advanced formatting (Recommended)
  - **Basic Editor**: Simple markdown-based text editor
- ✅ User presence indicators
- ✅ Auto-save functionality
- ✅ Document listing and management
- ✅ Persistent storage in database

## Setup

### 1. Pusher Configuration

To enable real-time collaboration, you need to set up a Pusher account:

1. Go to [https://pusher.com](https://pusher.com) and sign up for a free account
2. Create a new app in the Pusher dashboard
3. Copy your app credentials
4. Add them to your environment variables:

```bash
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=us2  # or your cluster region
```

### 2. Railway Deployment

If deploying to Railway, add the Pusher environment variables in your Railway project settings:

1. Go to your Railway project
2. Navigate to the Variables tab
3. Add each Pusher variable with its value

### 3. Vercel Deployment

If deploying to Vercel, add the environment variables:

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add each Pusher variable for Production, Preview, and Development

## Usage

### Accessing Documents

Navigate to `/documents.html` on your deployed URL:
- Production: `https://your-app.vercel.app/documents.html`
- Local: `http://localhost:3001/documents.html`

### Creating a Document

1. Enter your name in the header (optional, but recommended)
2. Click "+ New Document"
3. Enter a title and click "Create"
4. You'll be redirected to the editor

### Editing a Document

1. Click on any document card from the documents list
2. Choose your editor:
   - **Affine Editor (Recommended)**: Rich block-based editor with advanced formatting, similar to Notion
   - **Basic Editor**: Simple markdown-based text editor
3. Start typing in the editor
4. Changes are auto-saved automatically
5. **Affine Editor features:**
   - Block-based document structure
   - Rich text formatting
   - Advanced layout options
   - Visual editing experience
6. **Basic Editor features:**
   - Markdown support
   - Simple toolbar for basic formatting (Bold, Italic, Underline, Lists, Links)

### Real-Time Collaboration

When Pusher is configured:
- You'll see "Connected" status in the top right
- Online user count shows how many people are viewing the document
- Presence list shows who's currently editing
- You'll receive notifications when others join/leave or make changes
- **Yjs CRDT ensures conflict-free collaboration** - multiple users can type simultaneously without overwrites

When Pusher is NOT configured:
- Editor works in offline mode
- Status shows "Ready (offline mode)"
- Changes are still saved to the database
- No real-time updates from other users

### How Yjs Sync Works

The implementation uses **Yjs (Y.js)**, a CRDT (Conflict-free Replicated Data Type) library:

1. **Document Initialization**: Each client loads the document and creates a local Yjs document instance
2. **Local Edits**: When you type, changes are tracked at the character level by Yjs
3. **Update Broadcasting**: Yjs generates binary updates that are sent to the server via HTTP
4. **Server Relay**: The server broadcasts updates to all other clients via Pusher
5. **Remote Merging**: Other clients receive updates and Yjs automatically merges them without conflicts
6. **Database Sync**: Periodically, the final text is synced to the database for persistence

**Benefits of Yjs:**
- ✅ No lost edits when multiple users type simultaneously
- ✅ Automatic conflict resolution
- ✅ Cursor position preservation
- ✅ Character-level change tracking
- ✅ Efficient binary update format

## API Endpoints

### Document Management

```
GET    /api/documents              - List all documents
POST   /api/documents              - Create a new document
GET    /api/documents/:id          - Get document by ID
PUT    /api/documents/:id/content  - Update document content
PUT    /api/documents/:id/title    - Update document title
DELETE /api/documents/:id          - Delete a document
```

### Collaboration

```
GET  /api/documents/:id/collaborators  - Get document collaborators
POST /api/documents/:id/collaborators  - Add a collaborator
POST /api/documents/:id/join           - Join document (broadcast presence)
POST /api/documents/:id/leave          - Leave document (broadcast presence)
```

### Yjs Sync (CRDT Collaboration)

```
GET  /api/documents/:id/yjs-state      - Get initial Yjs document state
POST /api/documents/:id/yjs-update     - Apply Yjs update from client
POST /api/documents/:id/yjs-awareness  - Broadcast cursor/selection updates
POST /api/documents/:id/yjs-sync       - Force sync Yjs state to database
```

### Configuration

```
GET /api/documents/pusher-config  - Get Pusher configuration for frontend
```

## Database Schema

### documents table

| Column               | Type    | Description                      |
|---------------------|---------|----------------------------------|
| id                  | TEXT    | UUID primary key                 |
| title               | TEXT    | Document title                   |
| content             | TEXT    | Document content (markdown)      |
| created_by          | TEXT    | User ID of creator               |
| created_by_username | TEXT    | Username of creator              |
| created_at          | INTEGER | Unix timestamp (seconds)         |
| updated_at          | INTEGER | Unix timestamp (seconds)         |
| is_public           | INTEGER | 1 for public, 0 for private      |
| metadata            | TEXT    | JSON metadata (optional)         |

### document_collaborators table

| Column      | Type    | Description                  |
|-------------|---------|------------------------------|
| id          | TEXT    | UUID primary key             |
| document_id | TEXT    | Foreign key to documents.id  |
| user_id     | TEXT    | User ID                      |
| username    | TEXT    | Username                     |
| role        | TEXT    | 'owner' or 'editor'          |
| joined_at   | INTEGER | Unix timestamp (seconds)     |

## Real-Time Events (Pusher)

### Channel Naming

Each document has its own Pusher channel: `document-{documentId}`

### Events

#### yjs-update
Broadcasted when Yjs document updates occur (replaces content-update):
```json
{
  "update": "base64-encoded-yjs-update",
  "clientId": "client-abc123",
  "timestamp": 1234567890
}
```

#### yjs-awareness
Broadcasted for cursor/selection updates:
```json
{
  "update": "base64-encoded-awareness-update",
  "clientId": "client-abc123",
  "timestamp": 1234567890
}
```

#### presence
Broadcasted when users join/leave:
```json
{
  "userId": "user-123",
  "username": "John Doe",
  "action": "join", // or "leave"
  "timestamp": 1234567890
}
```

**Note:** The old `content-update` event is deprecated in favor of `yjs-update` for proper conflict-free collaboration.

## Cost Considerations

### Pusher Free Tier

- 200,000 messages/day
- 100 concurrent connections
- Unlimited channels

This should be sufficient for:
- ~20 active documents
- ~5 collaborators per document
- Moderate editing activity

### Database Storage

Each document is stored in SQLite/Turso with minimal storage footprint:
- Average document: ~1-10 KB
- 1,000 documents ≈ 1-10 MB

## Troubleshooting

### Real-time updates not working

1. Check Pusher configuration in environment variables
2. Verify credentials are correct
3. Check browser console for Pusher connection errors
4. Ensure Pusher cluster matches your account region

### Documents not saving

1. Check database connection
2. Verify file permissions for SQLite database
3. Check browser console for API errors
4. Ensure content is not empty (empty content is rejected)

### Presence not updating

1. Verify Pusher is configured
2. Check that users have entered a username
3. Ensure browser is not blocking WebSocket connections
4. Check for CORS issues in browser console

## Affine/BlockSuite Editor Integration

The project now includes **BlockSuite**, the open-source editor framework that powers [Affine](https://affine.pro/), providing a modern, block-based editing experience.

### What is BlockSuite?

BlockSuite is a modular framework for building collaborative applications. It powers Affine, a privacy-focused, local-first collaborative knowledge base.

### Features Provided by BlockSuite

- **Block-based architecture**: Documents are composed of blocks (paragraphs, headings, lists, etc.)
- **Rich formatting**: Full WYSIWYG editing experience
- **Native Yjs integration**: Built-in CRDT support for collaboration
- **Extensible**: Can be customized with custom blocks and plugins
- **Modern UI**: Notion-like user experience

### How It Works

1. **Document Structure**: BlockSuite organizes content into blocks (pages, notes, paragraphs)
2. **Yjs Backend**: Uses the existing Yjs infrastructure for real-time sync
3. **Pusher Integration**: Broadcasts Yjs updates via Pusher to all collaborators
4. **Database Persistence**: Syncs final state to SQLite/Turso for persistence

### Accessing the Affine Editor

When you click on a document in the documents list, you'll see two options:

1. **Affine Editor** (`/affine-editor.html`): Rich block-based editor (Recommended)
2. **Basic Editor** (`/editor.html`): Simple markdown text editor

Both editors use the same backend (Yjs + Pusher) and can collaborate with each other on the same document.

## Future Enhancements

Potential improvements for the future:

- [x] ~~Rich text editor (WYSIWYG)~~ **IMPLEMENTED with BlockSuite/Affine Editor**
- [x] ~~Operational Transformation (OT) for conflict resolution~~ **IMPLEMENTED with Yjs CRDT**
- [ ] Document versioning and history (Yjs supports snapshots)
- [ ] Comment threads
- [ ] Document permissions and sharing
- [ ] Export to PDF/Word (BlockSuite supports this)
- [ ] Document templates
- [ ] Search functionality
- [ ] Folders/organization
- [ ] Discord integration (create docs from bot commands)
- [ ] Cursor presence indicators (show other users' cursors in real-time)

## Security Considerations

### Current Implementation

- All documents are public by default
- No authentication required
- User IDs are client-generated (stored in localStorage)
- No rate limiting on API endpoints

### Recommended for Production

1. Add authentication (Discord OAuth, email, etc.)
2. Implement proper authorization checks
3. Add rate limiting to prevent abuse
4. Implement document permissions
5. Add API key validation
6. Sanitize user input to prevent XSS
7. Add CSRF protection
8. Implement proper user management

## License

Same as the main Omega project.
