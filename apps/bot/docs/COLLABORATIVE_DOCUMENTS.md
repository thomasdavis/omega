# Collaborative Documents Feature

## Overview

The Omega bot now includes a Google Docs-like collaborative document editing feature that allows multiple users to work on the same document in real-time.

## Features

- ✅ Create and manage collaborative documents
- ✅ Real-time editing with Pusher WebSockets
- ✅ User presence indicators
- ✅ Auto-save functionality
- ✅ Simple markdown-based formatting
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
2. Start typing in the editor
3. Changes are auto-saved every second after you stop typing
4. Use the toolbar for basic formatting:
   - **Bold**: Select text and click B
   - *Italic*: Select text and click I
   - Underline: Select text and click U
   - Lists: Click bullet list button
   - Links: Select text and click link button

### Real-Time Collaboration

When Pusher is configured:
- You'll see "Connected" status in the top right
- Online user count shows how many people are viewing the document
- Presence list shows who's currently editing
- You'll receive notifications when others join/leave or make changes

When Pusher is NOT configured:
- Editor works in offline mode
- Status shows "Ready (offline mode)"
- Changes are still saved to the database
- No real-time updates from other users

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

#### content-update
Broadcasted when document content changes:
```json
{
  "content": "Updated document content",
  "userId": "user-123",
  "username": "John Doe",
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

## Future Enhancements

Potential improvements for the future:

- [ ] Rich text editor (WYSIWYG)
- [ ] Operational Transformation (OT) for conflict resolution
- [ ] Document versioning and history
- [ ] Comment threads
- [ ] Document permissions and sharing
- [ ] Export to PDF/Word
- [ ] Document templates
- [ ] Search functionality
- [ ] Folders/organization
- [ ] Discord integration (create docs from bot commands)

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
