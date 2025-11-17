# Public Files Directory

This directory contains files that are publicly accessible via the artifact preview server.

## Structure

- `/uploads/` - User-uploaded files via the fileUpload tool

## File Upload System

The file upload system allows users to upload files via Discord and get shareable public links. This feature is implemented in `src/agent/tools/fileUpload.ts` and integrated with Discord message handling.

### Features

- **File Type Validation**: Whitelist of allowed extensions for security
- **Size Limits**: Maximum 25MB (Discord's attachment limit)
- **Security**: Filename sanitization to prevent directory traversal and other attacks
- **Unique Filenames**: UUID-based naming to prevent collisions
- **Metadata Storage**: JSON metadata files for each upload with tracking information
- **Automatic Download**: Supports direct download from Discord attachment URLs
- **Public URLs**: Each uploaded file gets a shareable public URL

### Supported File Types

- **Images**: jpg, jpeg, png, gif, webp, svg, bmp, ico
- **Documents**: pdf, txt, md, doc, docx, odt
- **Data**: json, xml, csv, yaml, yml
- **Archives**: zip, tar, gz, 7z
- **Code**: js, ts, py, java, cpp, c, rs, go, rb, php, html, css, scss, sass
- **Media**: mp3, mp4, wav, ogg, webm
- **Other**: log, sql, sh, bat

### How It Works

#### 1. User Uploads File in Discord
When a user shares a file attachment in Discord, the bot automatically:
- Detects the attachment in the message
- Extracts attachment metadata (filename, size, type, URL)
- Enriches the message context with attachment information

#### 2. AI Agent Processes Upload
The AI agent can use the `fileUpload` tool to:
- Download the file from the Discord CDN URL
- Validate file type and size
- Sanitize the filename for security
- Save the file to the public uploads directory
- Generate a unique public URL

#### 3. User Receives Shareable Link
The bot responds with:
- Confirmation of successful upload
- Public URL for sharing
- File metadata (size, type, upload time)

### Usage Examples

**Example 1: User uploads an image**
```
User: [Uploads image.png] Can you save this for me?
Bot: File uploaded successfully! Access it at: http://localhost:3001/uploads/image_a1b2c3d4.png
     Original name: image.png
     Size: 245.67 KB
     Type: image/png
```

**Example 2: User uploads a document**
```
User: [Uploads report.pdf] Please create a public link for this
Bot: File uploaded successfully! Access it at: http://localhost:3001/uploads/report_e5f6g7h8.pdf
     Original name: report.pdf
     Size: 1.23 MB
     Type: application/pdf
```

### Access URLs

**Local Development:**
- Uploaded files: `http://localhost:3001/uploads/:filename`
- Artifact server: `http://localhost:3001/`

**Production:**
- Configure `ARTIFACT_SERVER_URL` environment variable
- Example: `https://your-domain.com/uploads/:filename`

## Security Considerations

### 1. File Type Whitelist
Only explicitly allowed file extensions are accepted. Executable files and potentially dangerous formats are blocked by default.

### 2. Filename Sanitization
- All path components are stripped (prevents directory traversal)
- Special characters are replaced with underscores
- Original filename is preserved in metadata

### 3. Size Limits
Files exceeding 25MB are rejected before download/processing.

### 4. Unique Filenames
Each uploaded file gets a UUID suffix to:
- Prevent filename collisions
- Avoid overwriting existing files
- Make URLs harder to guess

### 5. Metadata Tracking
Each upload creates a `.json` metadata file containing:
- Upload timestamp
- Original filename
- File size and type
- Uploader username
- Unique file ID

## API Reference

### fileUpload Tool

**Parameters:**
- `fileUrl` (optional): Discord attachment URL to download from
- `fileData` (optional): Base64-encoded file data (alternative to fileUrl)
- `originalName` (required): Original filename with extension
- `mimeType` (optional): MIME type of the file
- `uploadedBy` (optional): Username of the uploader

**Returns:**
```typescript
{
  success: boolean;
  filename?: string;        // Sanitized unique filename
  originalName?: string;    // Original filename
  size?: number;           // File size in bytes
  sizeFormatted?: string;  // Human-readable size
  extension?: string;      // File extension
  mimeType?: string;       // MIME type
  uploadedAt?: string;     // ISO timestamp
  uploadedBy?: string;     // Username
  publicUrl?: string;      // Shareable public URL
  message?: string;        // Success message
  error?: string;          // Error message if failed
}
```

## Architecture

```
Discord Message → messageHandler.ts
                    ↓
                Detect attachments
                    ↓
                Enrich message context
                    ↓
                AI Agent (agent.ts)
                    ↓
                fileUpload tool
                    ↓
                Download from URL
                    ↓
                Validate & Sanitize
                    ↓
                Save to public/uploads/
                    ↓
                Generate public URL
                    ↓
                Artifact Server serves file
```

## Configuration

### Environment Variables

- `ARTIFACT_SERVER_URL`: Base URL for public file access (default: `http://localhost:3001`)
- `ARTIFACT_SERVER_PORT`: Port for artifact server (default: `3001`)

### File System

- Upload directory: `apps/bot/public/uploads/`
- Metadata files: `apps/bot/public/uploads/*.json`
- Served by: `apps/bot/src/server/artifactServer.ts`

## Future Enhancements

Potential improvements to consider:
- Upload gallery view (similar to artifacts gallery)
- File expiration/cleanup policies
- Upload statistics and analytics
- User upload quotas
- Virus scanning integration
- Cloud storage backend (S3, Vercel Blob, etc.)
- Thumbnail generation for images
- File preview in Discord embeds
